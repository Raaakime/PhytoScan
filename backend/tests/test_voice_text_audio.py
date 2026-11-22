"""Tests unitaires du module vocal : audio, texte, quotas, cache (sans réseau, sans base de données)."""
import io
import struct
import wave

import numpy as np
import pytest

from app.core.exceptions import (BadRequestError, PayloadTooLargeError, ServiceUnavailableError,
                                 TooManyRequestsError, UnsupportedMediaTypeError)
from app.voice import audio, text_prep
from app.voice.contracts import SpeechAudio
from app.voice.limits import ConcurrencyGate, SpeechCache, UsageLimiter


# ----------------------------------------------------------------------------- helpers
def sine(seconds=1.0, amplitude=0.3, rate=16000, freq=220.0):
    t = np.arange(int(seconds * rate)) / rate
    return (amplitude * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def wav_bytes(samples, rate=16000):
    return audio.to_wav(samples, rate)


def load(data, **kw):
    kw.setdefault("max_mb", 8)
    kw.setdefault("min_seconds", 0.4)
    kw.setdefault("max_seconds", 30)
    return audio.load_recording(io.BytesIO(data), **kw)


class _Sink:
    """Flux d'écriture SANS seek : le muxer ne peut pas réécrire la durée en fin de fichier (comme MediaRecorder)."""

    def __init__(self):
        self.buf = io.BytesIO()

    def write(self, data):
        return self.buf.write(data)

    def flush(self):
        pass


def webm_without_duration(samples):
    """WebM/Opus en flux, sans durée dans l'en-tête : ce que produit MediaRecorder dans Chrome et Firefox."""
    import av
    sink = _Sink()
    with av.open(sink, "w", format="webm") as container:
        stream = container.add_stream("libopus", rate=48000)
        stream.layout = "mono"
        pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2").reshape(1, -1)
        frame = av.AudioFrame.from_ndarray(pcm, format="s16", layout="mono")
        frame.sample_rate = 16000
        resampler = av.AudioResampler(format="s16", layout="mono", rate=48000)
        for f in resampler.resample(frame) + resampler.resample(None):
            for packet in stream.encode(f):
                container.mux(packet)
        for packet in stream.encode(None):
            container.mux(packet)
    return sink.buf.getvalue()


# ----------------------------------------------------------------------------- audio
def test_wav_roundtrip_is_normalized_to_16k_mono():
    recording = load(wav_bytes(sine(1.5, amplitude=0.05)))
    assert recording.seconds == pytest.approx(1.5, abs=0.02)
    assert float(np.max(np.abs(recording.samples))) > 0.25          # niveau remonté
    with wave.open(io.BytesIO(recording.to_wav())) as wav:
        assert (wav.getnchannels(), wav.getframerate(), wav.getsampwidth()) == (1, 16000, 2)


def test_other_sample_rates_are_resampled():
    recording = load(wav_bytes(sine(1.0, rate=44100), rate=44100))
    assert recording.seconds == pytest.approx(1.0, abs=0.02)


def test_webm_without_header_duration_is_accepted():
    import av
    data = webm_without_duration(sine(2.0))
    with av.open(io.BytesIO(data)) as container:      # la fixture est fidèle : aucune durée en métadonnées
        assert container.duration is None and container.streams.audio[0].duration is None
    assert audio.sniff_format(data[:16]) == "matroska,webm"
    assert load(data).seconds == pytest.approx(2.0, abs=0.1)


def test_silence_too_short_too_long_empty_and_garbage_are_rejected():
    with pytest.raises(BadRequestError, match="rien entendu"):
        load(wav_bytes(np.zeros(16000, dtype=np.float32)))
    with pytest.raises(BadRequestError, match="trop court"):
        load(wav_bytes(sine(0.1)))
    with pytest.raises(BadRequestError, match="trop long"):
        load(wav_bytes(sine(3.0)), max_seconds=2)
    with pytest.raises(BadRequestError, match="vide"):
        load(b"")
    with pytest.raises(UnsupportedMediaTypeError):
        load(b"this is definitely not audio at all")


def test_truncated_file_is_reported_as_unreadable_not_crash():
    header_only = wav_bytes(sine(1.0))[:30]
    with pytest.raises(BadRequestError):
        load(header_only)


def test_size_limit():
    with pytest.raises(PayloadTooLargeError):
        audio.read_upload(io.BytesIO(b"x" * 10), max_bytes=5, max_mb=1)


# ----------------------------------------------------------------------------- texte : lecture
def test_french_speech_preparation():
    text = ("**Plante 2** (Poivron (Capsicum annuum)) : état « à surveiller », score de santé 74/100. "
            "Oïdium (78%). Relevé du 22/04/2025 à 31 °C.")
    spoken = text_prep.prepare_for_speech(text, "fr")
    assert "74 sur 100" in spoken
    assert "78 pour cent" in spoken
    assert "22 avril 2025" in spoken
    assert "31 degrés" in spoken
    assert "*" not in spoken and "Capsicum" not in spoken


def test_french_parentheses_that_are_not_latin_names_are_kept():
    assert "Tache foliaire" in text_prep.prepare_for_speech("Pour traiter (Tache foliaire) : taillez.", "fr")


def test_english_speech_preparation():
    spoken = text_prep.prepare_for_speech("Health score 74/100, humidity 80%, on 03/05/2025.", "en")
    assert "74 out of 100" in spoken and "80 percent" in spoken and "May 3, 2025" in spoken


def test_speech_always_ends_with_punctuation_and_collapses_spaces():
    assert text_prep.prepare_for_speech("Arrosez   tôt", "fr") == "Arrosez tôt."


def test_truncate_cuts_on_whole_sentences():
    text = "Première phrase assez longue. Deuxième phrase tout aussi longue. Troisième phrase."
    cut, truncated = text_prep.truncate_for_speech(text, 50)
    assert truncated and cut == "Première phrase assez longue."
    assert text_prep.truncate_for_speech("Court.", 50) == ("Court.", False)


def test_truncate_without_sentence_boundary_cuts_on_a_word():
    cut, truncated = text_prep.truncate_for_speech("mot " * 40, 30)
    assert truncated and cut.endswith("mot.") and len(cut) <= 31


# ----------------------------------------------------------------------------- texte : wolof
@pytest.mark.parametrize("n,expected", [
    (0, "tus"), (7, "juroom-ñaar"), (10, "fukk"), (21, "ñaar-fukk ak benn"), (74, "juroom-ñaar-fukk ak ñeent"),
    (100, "téeméer"), (250, "ñaar téeméer ak juroom-fukk"), (1000, "junni"),
])
def test_wolof_numbers(n, expected):
    assert text_prep.number_to_wolof(n) == expected


def test_wolof_speech_preparation_uses_longest_glossary_match_first():
    spoken = text_prep.prepare_for_speech("Tomate (Solanum lycopersicum) en croissance végétative, parcelle 3, 74/100.", "wo")
    assert "tamaate" in spoken
    assert "màggug xob yi" in spoken and "màgg gi" not in spoken     # « croissance végétative » n'est pas coupé
    assert "parsel ñett" in spoken
    assert "juroom-ñaar-fukk ak ñeent ci téeméer" in spoken
    assert not any(ch.isdigit() for ch in spoken)


def test_wolof_speech_drops_dates():
    assert not any(ch.isdigit() for ch in text_prep.prepare_for_speech("Dernier relevé (22/04/2025)", "wo"))


# ----------------------------------------------------------------------------- texte : transcriptions
@pytest.mark.parametrize("language,said,expected", [
    ("fr", "Quelle est la santé de la plante deux ?", "Quelle est la santé de la plante 2 ?"),
    ("fr", "Et la Plante Dix", "Et la Plante 10"),
    ("fr", "plante 3", "plante 3"),
    ("fr", "Combien de plantes malades ?", "Combien de plantes malades ?"),
    ("en", "How is plant three doing", "How is plant 3 doing"),
    ("wo", "Naka la garab ñaar gi", "Naka la garab 2 gi"),
    ("wo", "garab juroom benn", "garab 6"),
    ("wo", "garab juroom-benn", "garab 6"),
    ("wo", "garab juroom", "garab 5"),
])
def test_transcript_number_words_become_digits(language, said, expected):
    assert text_prep.normalize_transcript(said, language) == expected


# ----------------------------------------------------------------------------- quotas, concurrence, cache
def test_rate_limit_per_minute_then_recovers():
    now = [1000.0]
    limiter = UsageLimiter(per_minute=2, per_day=0, clock=lambda: now[0])
    limiter.check("u1"); limiter.check("u1")
    with pytest.raises(TooManyRequestsError) as err:
        limiter.check("u1")
    assert int(err.value.headers["Retry-After"]) >= 1
    limiter.check("u2")                       # un autre utilisateur n'est pas affecté
    now[0] += 61
    limiter.check("u1")


def test_daily_quota_and_refused_requests_do_not_consume_it():
    from datetime import date, timedelta
    day = [date(2026, 1, 1)]
    now = [0.0]
    limiter = UsageLimiter(per_minute=1, per_day=3, clock=lambda: now[0], today=lambda: day[0])
    limiter.check("u")
    for _ in range(5):                        # refusées par la limite à la minute : ne comptent pas pour le jour
        with pytest.raises(TooManyRequestsError):
            limiter.check("u")
    now[0] += 61; limiter.check("u")
    now[0] += 61; limiter.check("u")          # 3e requête acceptée
    now[0] += 61
    with pytest.raises(TooManyRequestsError, match="quotidienne"):
        limiter.check("u")
    day[0] += timedelta(days=1)
    limiter.check("u")


def test_limits_of_zero_mean_unlimited():
    limiter = UsageLimiter(per_minute=0, per_day=0)
    for _ in range(100):
        limiter.check("u")


def test_concurrency_gate_refuses_instead_of_blocking():
    gate = ConcurrencyGate(1)
    with gate:
        with pytest.raises(ServiceUnavailableError) as err:
            with gate:
                pass
        assert err.value.headers["Retry-After"] == "5"
    with gate:                                # la place est rendue, même après une erreur
        pass


def test_speech_cache_lru_and_byte_budget():
    cache = SpeechCache(max_entries=2)
    for name in "abc":
        cache.put(cache.key("fr", name), SpeechAudio(name.encode(), "audio/mpeg"))
    assert cache.get(cache.key("fr", "a")) is None            # le plus ancien est évincé
    assert cache.get(cache.key("fr", "c")).content == b"c"
    assert cache.key("fr", "x") != cache.key("wo", "x")
    small = SpeechCache(max_entries=10, max_bytes=3)
    small.put("k", SpeechAudio(b"too big", "audio/mpeg"))
    assert small.get("k") is None
