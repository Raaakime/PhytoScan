import io
import uuid
import wave

from app.core.config import get_settings
from app.core.exceptions import UpstreamServiceError
from app.voice.providers import elevenlabs_tts, openai_stt
from tests.conftest import API


def make_wav(seconds=1):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\0\0" * 16000 * seconds)
    return buffer.getvalue()


def enable_voice(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "VOICE_ENABLED", True)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr(settings, "ELEVENLABS_API_KEY", "test-elevenlabs-key")
    monkeypatch.setattr(settings, "ELEVENLABS_VOICE_ID", "test-voice")


def create_auth_header(client):
    email = f"voice-{uuid.uuid4().hex}@example.com"
    password = "voice-password-123"
    registered = client.post(f"{API}/auth/register", json={"email": email, "password": password})
    assert registered.status_code == 201
    tokens = client.post(f"{API}/auth/login", data={"username": email, "password": password}).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_voice_status_is_disabled_without_provider_configuration(client, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "VOICE_ENABLED", False)
    result = client.get(f"{API}/voice/status")

    assert result.status_code == 200
    assert result.json()["enabled"] is False
    assert result.json()["supportedLanguages"] == ["fr", "en"]


def test_voice_chat_transcribes_reuses_assistant_and_returns_audio(client, monkeypatch):
    enable_voice(monkeypatch)
    auth = create_auth_header(client)
    monkeypatch.setattr(openai_stt, "transcribe", lambda audio, language: "Comment arroser par forte chaleur ?")
    monkeypatch.setattr(elevenlabs_tts, "synthesize", lambda text, language: b"fake-mp3")

    response = client.post(
        f"{API}/voice/chat",
        data={"language": "fr", "session_id": "voice-test-session"},
        files={"audio": ("question.wav", make_wav(), "audio/wav")},
        headers=auth,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["transcript"] == "Comment arroser par forte chaleur ?"
    assert "arrosez tôt" in body["text"]
    assert body["sessionId"] == "voice-test-session"
    assert body["audioMimeType"] == "audio/mpeg"
    assert body["audioBase64"] == "ZmFrZS1tcDM="
    assert client.get(
        f"{API}/assistant/history", params={"session_id": "voice-test-session"}
    ).json()["messages"] == []
    history = client.get(
        f"{API}/assistant/history", params={"session_id": "voice-test-session"}, headers=auth
    )
    assert [message["sender"] for message in history.json()["messages"]] == ["user", "bot"]


def test_voice_chat_keeps_text_when_synthesis_provider_fails(client, monkeypatch):
    enable_voice(monkeypatch)
    auth = create_auth_header(client)
    monkeypatch.setattr(openai_stt, "transcribe", lambda audio, language: "Comment arroser ?")

    def fail_synthesis(text, language):
        raise UpstreamServiceError("Le service de synthèse vocale a échoué.")

    monkeypatch.setattr(elevenlabs_tts, "synthesize", fail_synthesis)
    response = client.post(
        f"{API}/voice/chat",
        data={"language": "fr"},
        files={"audio": ("question.wav", make_wav(), "audio/wav")},
        headers=auth,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["text"]
    assert body["audioBase64"] is None
    assert body["audioError"] == "Le service de synthèse vocale a échoué."


def test_voice_chat_rejects_wolof_and_invalid_audio(client, monkeypatch):
    enable_voice(monkeypatch)
    auth = create_auth_header(client)
    unsupported = client.post(
        f"{API}/voice/chat",
        data={"language": "wo"},
        files={"audio": ("question.wav", make_wav(), "audio/wav")},
        headers=auth,
    )
    assert unsupported.status_code == 400
    assert "wolof" in unsupported.json()["detail"].lower()

    invalid = client.post(
        f"{API}/voice/chat",
        data={"language": "fr"},
        files={"audio": ("question.wav", b"not audio", "audio/wav")},
        headers=auth,
    )
    assert invalid.status_code == 415


def test_voice_chat_enforces_size_and_duration_limits(client, monkeypatch):
    enable_voice(monkeypatch)
    auth = create_auth_header(client)
    settings = get_settings()

    monkeypatch.setattr(settings, "VOICE_MAX_AUDIO_SECONDS", 0.5)
    too_long = client.post(
        f"{API}/voice/chat",
        data={"language": "fr"},
        files={"audio": ("question.wav", make_wav(), "audio/wav")},
        headers=auth,
    )
    assert too_long.status_code == 400
    assert "trop long" in too_long.json()["detail"].lower()

    monkeypatch.setattr(settings, "VOICE_MAX_AUDIO_SECONDS", 60)
    monkeypatch.setattr(settings, "VOICE_MAX_AUDIO_MB", 0)
    too_large = client.post(
        f"{API}/voice/chat",
        data={"language": "fr"},
        files={"audio": ("question.wav", make_wav(), "audio/wav")},
        headers=auth,
    )
    assert too_large.status_code == 413


def test_voice_chat_requires_authentication(client):
    response = client.post(
        f"{API}/voice/chat",
        data={"language": "fr"},
        files={"audio": ("question.wav", make_wav(), "audio/wav")},
    )
    assert response.status_code == 401
