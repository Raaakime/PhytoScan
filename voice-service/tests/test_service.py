"""Tests du microservice avec les moteurs factices (ENGINE=fake) : aucun modèle n'est chargé."""
import io
import os
import threading
import wave

os.environ["VOICE_SERVICE_ENGINE"] = "fake"
os.environ["VOICE_SERVICE_API_TOKEN"] = "test-token"
os.environ["VOICE_SERVICE_MAX_TEXT_CHARS"] = "100"
os.environ["VOICE_SERVICE_MAX_AUDIO_SECONDS"] = "5"
os.environ["VOICE_SERVICE_MAX_CONCURRENT"] = "1"

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import audio
from app.config import Settings
from app.main import app

AUTH = {"Authorization": "Bearer test-token"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:          # déclenche le lifespan (chargement des moteurs)
        yield c


def tone(seconds=1.0, amplitude=0.3, rate=16000):
    t = np.arange(int(seconds * rate)) / rate
    return audio.write_wav((amplitude * np.sin(2 * np.pi * 220 * t)).astype(np.float32), rate)


def transcribe(client, data, headers=AUTH):
    return client.post("/v1/transcribe", files={"file": ("a.wav", data, "audio/wav")}, headers=headers)


# ----------------------------------------------------------------------------- santé et sécurité
def test_health_and_ready_are_open(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"stt": True, "tts": True}


def test_docs_are_not_exposed(client):
    assert client.get("/docs").status_code == 404 and client.get("/openapi.json").status_code == 404


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer wrong"}, {"Authorization": "test-token"}])
def test_inference_requires_the_token(client, headers):
    assert transcribe(client, tone(), headers).status_code == 401
    assert client.post("/v1/synthesize", json={"text": "nanga def"}, headers=headers).status_code == 401


def test_service_refuses_to_start_without_a_token():
    with pytest.raises(ValueError, match="API_TOKEN"):
        Settings(_env_file=None, API_TOKEN="")
    assert Settings(_env_file=None, API_TOKEN="", ALLOW_NO_AUTH=True).ALLOW_NO_AUTH


# ----------------------------------------------------------------------------- transcription
def test_transcribe_returns_text_and_duration(client):
    body = transcribe(client, tone(1.5)).json()
    assert body["text"] == "nanga def" and body["durationSeconds"] == pytest.approx(1.5, abs=0.01)


def test_transcribe_rejects_wrong_formats_with_useful_messages(client):
    wrong_rate = transcribe(client, tone(rate=44100))
    assert wrong_rate.status_code == 422 and "16000 Hz" in wrong_rate.json()["detail"]
    assert transcribe(client, b"not a wav").status_code == 422
    stereo = io.BytesIO()
    with wave.open(stereo, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(16000); w.writeframes(b"\x00\x00" * 3200)
    assert "canal" in transcribe(client, stereo.getvalue()).json()["detail"]


def test_transcribe_enforces_duration_and_size_limits(client):
    too_long = transcribe(client, tone(5.1))                    # sous la limite d'octets, au-dessus de 5 s
    assert too_long.status_code == 422 and "trop long" in too_long.json()["detail"]
    assert transcribe(client, tone(6.0)).status_code == 413     # au-dessus de la limite d'octets


# ----------------------------------------------------------------------------- synthèse
def test_synthesize_returns_a_normalized_wav(client):
    response = client.post("/v1/synthesize", json={"text": "Nanga def, mangi fi rekk."}, headers=AUTH)
    assert response.status_code == 200 and response.headers["content-type"] == "audio/wav"
    with wave.open(io.BytesIO(response.content)) as wav:
        assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) == (1, 2, 16000)
        pcm = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2") / 32768.0
    assert 0.85 < float(np.max(np.abs(pcm))) <= 0.9            # niveau constant d'une réponse à l'autre
    assert float(response.headers["x-audio-seconds"]) > 0


def test_synthesize_validates_text(client):
    assert client.post("/v1/synthesize", json={"text": "   "}, headers=AUTH).status_code == 422
    assert client.post("/v1/synthesize", json={"text": "a" * 101}, headers=AUTH).status_code == 413
    assert client.post("/v1/synthesize", json={}, headers=AUTH).status_code == 422


# ----------------------------------------------------------------------------- charge
def test_busy_service_answers_503_with_retry_after_instead_of_queueing(client):
    gate: threading.BoundedSemaphore = app.state.gate
    assert gate.acquire(blocking=False)                          # on occupe la seule place
    try:
        response = client.post("/v1/synthesize", json={"text": "nanga def"}, headers=AUTH)
        assert response.status_code == 503 and response.headers["retry-after"] == "3"
    finally:
        gate.release()
    assert client.post("/v1/synthesize", json={"text": "nanga def"}, headers=AUTH).status_code == 200


# ----------------------------------------------------------------------------- traitement du signal
def test_finalize_speech_trims_silence_removes_dc_and_normalizes():
    rate = 16000
    voice = (0.05 * np.sin(2 * np.pi * 200 * np.arange(rate) / rate)).astype(np.float32) + 0.2   # décalage continu
    padded = np.concatenate([np.zeros(rate, np.float32) + 0.2, voice, np.zeros(rate, np.float32) + 0.2])
    out = audio.finalize_speech(padded, rate)
    assert out.size < 1.2 * rate                                 # silences retirés (3 s -> environ 1 s)
    assert float(np.max(np.abs(out))) == pytest.approx(0.89, abs=0.005)
    assert abs(float(out[0])) < 0.01 and abs(float(out[-1])) < 0.01   # fondus : pas de clic
    assert abs(float(np.mean(out))) < 0.02


def test_finalize_speech_handles_silence_and_empty():
    assert audio.finalize_speech(np.zeros(100, np.float32), 16000).size == 100
    assert audio.finalize_speech(np.zeros(0, np.float32), 16000).size == 0


def test_split_sentences_respects_limits():
    text = "Garab gi dafa wér. " + "Suubal ko ndox, " * 30 + "Waaw!"
    chunks = audio.split_sentences(text, max_chars=60)
    assert all(len(c) <= 60 for c in chunks) and chunks[0] == "Garab gi dafa wér." and chunks[-1].endswith("Waaw!")
    assert audio.split_sentences("   ", 60) == []
