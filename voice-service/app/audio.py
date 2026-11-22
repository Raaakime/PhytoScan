"""WAV en entrée (déjà normalisé par le backend PhytoScan) et traitement du signal de sortie."""
import io
import wave

import numpy as np

SAMPLE_RATE = 16_000


class AudioFormatError(ValueError):
    pass


def read_wav(data: bytes, max_seconds: float) -> np.ndarray:
    """WAV PCM 16 bits, mono, 16 kHz -> float32 [-1, 1]. Le service n'accepte volontairement que ce format :
    le décodage des formats de navigateur est fait en amont, pour garder cette image légère (pas de FFmpeg)."""
    try:
        with wave.open(io.BytesIO(data)) as wav:
            channels, width, rate, frames = wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getnframes()
            if (channels, width, rate) != (1, 2, SAMPLE_RATE):
                raise AudioFormatError(f"Attendu : WAV mono 16 bits {SAMPLE_RATE} Hz (reçu : {channels} canal(aux), "
                                       f"{width * 8} bits, {rate} Hz).")
            if frames / rate > max_seconds:
                raise AudioFormatError(f"Audio trop long (maximum {max_seconds:g} s).")
            raw = wav.readframes(frames)
    except (wave.Error, EOFError) as exc:
        raise AudioFormatError("Fichier WAV illisible.") from exc
    if not raw:
        raise AudioFormatError("Audio vide.")
    return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0


def write_wav(samples: np.ndarray, sample_rate: int) -> bytes:
    pcm16 = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    out = io.BytesIO()
    with wave.open(out, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm16.tobytes())
    return out.getvalue()


def finalize_speech(samples: np.ndarray, sample_rate: int, *, target_peak: float = 0.89,
                    trim_db: float = -45.0, fade_ms: float = 12.0) -> np.ndarray:
    """Rend une voix synthétique confortable à l'écoute :
    - retire la composante continue (sinon « clic » au début et à la fin) ;
    - coupe le silence en début et fin ;
    - applique un fondu court aux extrémités ;
    - normalise le niveau pour que toutes les réponses aient le même volume.
    """
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if samples.size == 0:
        return samples
    samples = samples - float(np.mean(samples))
    peak = float(np.max(np.abs(samples)))
    if peak <= 1e-6:
        return samples
    threshold = peak * (10 ** (trim_db / 20))
    voiced = np.flatnonzero(np.abs(samples) > threshold)
    pad = int(0.04 * sample_rate)
    start, end = max(0, voiced[0] - pad), min(samples.size, voiced[-1] + pad + 1)
    samples = samples[start:end].copy()
    fade = min(int(fade_ms / 1000 * sample_rate), samples.size // 2)
    if fade > 0:
        ramp = np.linspace(0.0, 1.0, fade, dtype=np.float32)
        samples[:fade] *= ramp
        samples[-fade:] *= ramp[::-1]
    return (samples * (target_peak / float(np.max(np.abs(samples))))).astype(np.float32)


def join_with_pauses(parts: list[np.ndarray], sample_rate: int, pause_seconds: float = 0.18) -> np.ndarray:
    if not parts:
        return np.zeros(0, dtype=np.float32)
    pause = np.zeros(int(pause_seconds * sample_rate), dtype=np.float32)
    pieces: list[np.ndarray] = []
    for index, part in enumerate(parts):
        if index:
            pieces.append(pause)
        pieces.append(part.astype(np.float32).reshape(-1))
    return np.concatenate(pieces)


def split_sentences(text: str, max_chars: int = 200) -> list[str]:
    """Découpe aux fins de phrase (puis aux virgules, puis aux espaces) : les modèles de synthèse
    se dégradent et ralentissent sur les longs textes."""
    import re

    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    sentences = [s.strip() for s in re.split(r"(?<=[.!?…])\s+", text) if s.strip()]
    chunks: list[str] = []
    for sentence in sentences:
        while len(sentence) > max_chars:
            cut = max(sentence.rfind(", ", 0, max_chars), sentence.rfind("; ", 0, max_chars))
            if cut < max_chars * 0.3:
                cut = sentence.rfind(" ", 0, max_chars)
            if cut <= 0:
                cut = max_chars
            chunks.append(sentence[: cut + 1].strip())
            sentence = sentence[cut + 1:].strip()
        if sentence:
            chunks.append(sentence)
    return chunks
