"""Client du microservice wolof (dossier voice-service/ à la racine du dépôt)."""
import threading
import time

import httpx

from app.voice.contracts import SpeechAudio
from app.voice.providers._http import call_upstream, log


class WolofVoiceClient:
    """Un client HTTP partagé ; `WolofSpeechToText` et `WolofTextToSpeech` en sont deux façades."""

    READY_TTL_SECONDS = 15

    def __init__(self, *, base_url: str, token: str, timeout: float, client: httpx.Client | None = None):
        self._base = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {token}"} if token else {}
        self._client = client or httpx.Client(timeout=timeout)
        self._lock = threading.Lock()
        self._ready: dict[str, bool] = {"stt": False, "tts": False}
        self._checked_at = float("-inf")

    # --- disponibilité (mise en cache : /voice/status est appelé à chaque ouverture de l'écran) ---
    def capability(self, name: str) -> bool:
        with self._lock:
            if time.monotonic() - self._checked_at > self.READY_TTL_SECONDS:
                self._refresh_ready()
            return self._ready.get(name, False)

    def _refresh_ready(self) -> None:
        try:
            response = self._client.get(f"{self._base}/ready", headers=self._headers, timeout=3.0)
            response.raise_for_status()
            body = response.json()
            self._ready = {"stt": bool(body.get("stt")), "tts": bool(body.get("tts"))}
        except (httpx.HTTPError, ValueError):
            log.warning("Microservice wolof injoignable ou non prêt")
            self._ready = {"stt": False, "tts": False}
        self._checked_at = time.monotonic()

    # --- appels ---
    def transcribe(self, wav: bytes) -> str:
        def request() -> str:
            response = self._client.post(
                f"{self._base}/v1/transcribe", headers=self._headers,
                files={"file": ("speech.wav", wav, "audio/wav")},
            )
            response.raise_for_status()
            return response.json().get("text") or ""

        return call_upstream("STT wolof", request, attempts=2).strip()

    def synthesize(self, text: str) -> bytes:
        def request() -> bytes:
            response = self._client.post(f"{self._base}/v1/synthesize", headers=self._headers, json={"text": text})
            response.raise_for_status()
            return response.content

        return call_upstream("TTS wolof", request, attempts=2)

    def close(self) -> None:
        self._client.close()


class WolofSpeechToText:
    name = "wolof-service"

    def __init__(self, client: WolofVoiceClient):
        self._client = client

    def is_ready(self) -> bool:
        return self._client.capability("stt")

    def transcribe(self, wav: bytes, language: str) -> str:
        return self._client.transcribe(wav)


class WolofTextToSpeech:
    name = "wolof-service"

    def __init__(self, client: WolofVoiceClient):
        self._client = client

    def is_ready(self) -> bool:
        return self._client.capability("tts")

    def synthesize(self, text: str, language: str) -> SpeechAudio:
        return SpeechAudio(content=self._client.synthesize(text), mime_type="audio/wav")
