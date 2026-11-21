"""Tests de l'API vocale avec de faux moteurs (aucun appel réseau)."""
import base64
import uuid

import numpy as np
import pytest

from app.core.config import get_settings
from app.core.exceptions import UpstreamServiceError
from app.main import app
from app.services import voice_service
from app.voice import audio
from app.voice.contracts import SpeechAudio
from app.voice.pipeline import VoicePipeline
from app.voice.registry import LanguageVoice, VoiceRegistry
from tests.conftest import API


class FakeSTT:
    name = "fake"

    def __init__(self, text="Comment arroser par forte chaleur ?", ready=True):
        self.text, self.ready, self.calls = text, ready, []

    def is_ready(self):
        return self.ready

    def transcribe(self, wav, language):
        self.calls.append((wav, language))
        return self.text


class FakeTTS:
    name = "fake"

    def __init__(self, ready=True, fail=False):
        self.ready, self.fail, self.calls = ready, fail, []

    def is_ready(self):
        return self.ready

    def synthesize(self, text, language):
        self.calls.append((text, language))
        if self.fail:
            raise UpstreamServiceError("Le service vocal a échoué. Réessayez plus tard.")
        return SpeechAudio(b"fake-audio:" + text.encode(), "audio/mpeg")


def recording(seconds=1.0, amplitude=0.3):
    t = np.arange(int(seconds * 16000)) / 16000
    return audio.to_wav((amplitude * np.sin(2 * np.pi * 220 * t)).astype(np.float32), 16000)


@pytest.fixture
def make_pipeline(monkeypatch):
    """Installe un pipeline de test (réglages ajustables) à la place du pipeline réel."""
    settings = get_settings()
    monkeypatch.setattr(settings, "VOICE_ENABLED", True)
    monkeypatch.setattr(settings, "VOICE_RATE_LIMIT_PER_MINUTE", 0)
    monkeypatch.setattr(settings, "VOICE_DAILY_QUOTA", 0)

    def build(fr_stt=None, fr_tts=None, wo_stt=None, wo_tts=None):
        voices = {
            "fr": LanguageVoice(fr_stt or FakeSTT(), fr_tts or FakeTTS()),
            "en": LanguageVoice(fr_stt or FakeSTT(), fr_tts or FakeTTS()),
            "wo": LanguageVoice(wo_stt, wo_tts),
        }
        pipeline = VoicePipeline(VoiceRegistry(voices), settings)
        app.dependency_overrides[voice_service.get_voice_pipeline] = lambda: pipeline
        return pipeline

    yield build
    app.dependency_overrides.pop(voice_service.get_voice_pipeline, None)


@pytest.fixture
def auth(client):
    email = f"voice-{uuid.uuid4().hex}@example.com"
    password = "voice-password-123"
    assert client.post(f"{API}/auth/register", json={"email": email, "password": password}).status_code == 201
    tokens = client.post(f"{API}/auth/login", data={"username": email, "password": password}).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def post_chat(client, auth, language="fr", data=None, **extra):
    return client.post(
        f"{API}/voice/chat",
        data={"language": language, **extra},
        files={"audio": ("q.wav", data if data is not None else recording(), "audio/wav")},
        headers=auth,
    )


# ----------------------------------------------------------------------------- status
def test_status_reports_capabilities_per_language(client, make_pipeline):
    make_pipeline(wo_stt=FakeSTT(ready=True), wo_tts=FakeTTS(ready=False))
    body = client.get(f"{API}/voice/status").json()
    assert body["enabled"] is True and body["requiresAuth"] is True
    assert body["languages"]["fr"] == {"stt": True, "tts": True}
    assert body["languages"]["wo"] == {"stt": True, "tts": False}
    assert body["maxRecordingSeconds"] == get_settings().VOICE_MAX_AUDIO_SECONDS


def test_status_is_all_false_when_voice_disabled(client, make_pipeline, monkeypatch):
    make_pipeline()
    monkeypatch.setattr(get_settings(), "VOICE_ENABLED", False)
    body = client.get(f"{API}/voice/status").json()
    assert body["enabled"] is False
    assert all(not cap["stt"] and not cap["tts"] for cap in body["languages"].values())


# ----------------------------------------------------------------------------- /voice/chat
def test_chat_runs_the_whole_pipeline_and_saves_history(client, make_pipeline, auth):
    stt, tts = FakeSTT(), FakeTTS()
    make_pipeline(fr_stt=stt, fr_tts=tts)
    response = post_chat(client, auth, session_id="vs-1")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["transcript"] == "Comment arroser par forte chaleur ?"
    assert "arrosez tôt" in body["text"] and body["sessionId"] == "vs-1" and body["language"] == "fr"
    assert body["audioMimeType"] == "audio/mpeg" and body["audioError"] is None and body["audioTruncated"] is False
    assert base64.b64decode(body["audioBase64"]).startswith(b"fake-audio:")
    # le moteur de reconnaissance reçoit du WAV 16 kHz normalisé
    assert stt.calls[0][0][:4] == b"RIFF" and stt.calls[0][1] == "fr"
    history = client.get(f"{API}/assistant/history", params={"session_id": "vs-1"}, headers=auth).json()
    assert [m["sender"] for m in history["messages"]] == ["user", "bot"]


def test_chat_normalizes_spoken_numbers_before_asking_the_assistant(client, make_pipeline, auth):
    make_pipeline(fr_stt=FakeSTT("Quelle est la santé de la plante deux ?"))
    body = post_chat(client, auth).json()
    assert body["transcript"] == "Quelle est la santé de la plante 2 ?"
    # Un compte neuf n'a pas de plantes : « plante 2 » est bien reconnue (sinon réponse générique)
    assert "Je ne trouve pas la plante 2" in body["text"]


def test_chat_keeps_written_answer_when_synthesis_fails(client, make_pipeline, auth):
    make_pipeline(fr_tts=FakeTTS(fail=True))
    body = post_chat(client, auth).json()
    assert body["text"] and body["audioBase64"] is None
    assert body["audioError"] == "Le service vocal a échoué. Réessayez plus tard."


def test_chat_without_tts_engine_still_answers_in_text(client, make_pipeline, auth):
    make_pipeline(wo_stt=FakeSTT("Naka la garab 2 gi deme ?"), wo_tts=None)
    body = post_chat(client, auth, language="wo").json()
    assert body["text"] and body["audioBase64"] is None and "pas disponible" in body["audioError"]


def test_chat_speaks_a_prepared_text_and_reads_wolof_numbers(client, make_pipeline, auth):
    tts = FakeTTS()
    make_pipeline(wo_stt=FakeSTT("Naka la garab ñaar gi deme ?"), wo_tts=tts)
    body = post_chat(client, auth, language="wo").json()
    assert body["transcript"] == "Naka la garab 2 gi deme ?"
    spoken, language = tts.calls[0]
    assert language == "wo" and not any(ch.isdigit() for ch in spoken)


def test_chat_rejects_unknown_language_and_unavailable_engines(client, make_pipeline, auth):
    make_pipeline()                                           # wolof : aucun moteur
    assert post_chat(client, auth, language="es").status_code == 400
    unavailable = post_chat(client, auth, language="wo")
    assert unavailable.status_code == 503 and "wolof" in unavailable.json()["detail"]


def test_chat_disabled_server(client, make_pipeline, auth, monkeypatch):
    make_pipeline()
    monkeypatch.setattr(get_settings(), "VOICE_ENABLED", False)
    response = post_chat(client, auth)
    assert response.status_code == 503 and "désactivé" in response.json()["detail"]


def test_chat_error_messages_for_bad_audio(client, make_pipeline, auth):
    stt = FakeSTT()
    make_pipeline(fr_stt=stt)
    assert post_chat(client, auth, data=b"not audio at all").status_code == 415
    silent = audio.to_wav(np.zeros(16000, dtype=np.float32), 16000)
    assert "rien entendu" in post_chat(client, auth, data=silent).json()["detail"]
    assert post_chat(client, auth, data=recording(0.1)).status_code == 400
    assert stt.calls == []                                    # aucun appel payant pour de l'audio invalide


def test_chat_empty_transcript_is_a_friendly_error(client, make_pipeline, auth):
    make_pipeline(fr_stt=FakeSTT("   "))
    response = post_chat(client, auth)
    assert response.status_code == 400 and "pas compris" in response.json()["detail"]


def test_chat_requires_authentication(client, make_pipeline):
    make_pipeline()
    response = client.post(f"{API}/voice/chat", data={"language": "fr"},
                           files={"audio": ("q.wav", recording(), "audio/wav")})
    assert response.status_code == 401


def test_chat_is_rate_limited_per_user_with_retry_after(client, make_pipeline, auth, monkeypatch):
    monkeypatch.setattr(get_settings(), "VOICE_RATE_LIMIT_PER_MINUTE", 1)
    make_pipeline()
    monkeypatch.setattr(get_settings(), "VOICE_RATE_LIMIT_PER_MINUTE", 1)   # lu à la construction du pipeline
    pipeline = make_pipeline()
    assert post_chat(client, auth).status_code == 200
    limited = post_chat(client, auth)
    assert limited.status_code == 429 and int(limited.headers["retry-after"]) >= 1
    assert pipeline is not None


# ----------------------------------------------------------------------------- /voice/speech
def test_speech_returns_audio_and_uses_the_cache(client, make_pipeline, auth):
    tts = FakeTTS()
    make_pipeline(fr_tts=tts)
    payload = {"text": "Le score est de 74/100.", "language": "fr"}
    first = client.post(f"{API}/voice/speech", json=payload, headers=auth)
    second = client.post(f"{API}/voice/speech", json=payload, headers=auth)
    assert first.status_code == 200 and first.headers["content-type"] == "audio/mpeg"
    assert first.content == second.content and len(tts.calls) == 1
    assert b"74 sur 100" in first.content


def test_speech_truncates_long_text_and_flags_it(client, make_pipeline, auth, monkeypatch):
    monkeypatch.setattr(get_settings(), "VOICE_TTS_MAX_CHARS", 60)
    make_pipeline()
    text = "Première phrase assez courte. " + "Deuxième phrase beaucoup trop longue pour tenir. " * 3
    response = client.post(f"{API}/voice/speech", json={"text": text, "language": "fr"}, headers=auth)
    assert response.status_code == 200 and response.headers["x-audio-truncated"] == "true"
    assert response.content == "fake-audio:Première phrase assez courte.".encode()


def test_speech_requires_auth_a_supported_language_and_text(client, make_pipeline, auth):
    make_pipeline()
    assert client.post(f"{API}/voice/speech", json={"text": "Bonjour", "language": "fr"}).status_code == 401
    assert client.post(f"{API}/voice/speech", json={"text": "Bonjour", "language": "de"}, headers=auth).status_code == 400
    assert client.post(f"{API}/voice/speech", json={"text": "", "language": "fr"}, headers=auth).status_code == 422
    assert client.post(f"{API}/voice/speech", json={"text": "***", "language": "fr"}, headers=auth).status_code == 400
    assert client.post(f"{API}/voice/speech", json={"text": "Waaw", "language": "wo"}, headers=auth).status_code == 503


def test_legacy_routes_are_gone(client):
    assert client.post(f"{API}/voice/wolof/tts", json={"text": "x"}).status_code == 404
    assert client.get(f"{API}/voice/wolof/status").status_code == 404
