"""Reconnaissance et synthèse via une API compatible OpenAI (`/audio/transcriptions`, `/audio/speech`).

Fonctionne avec OpenAI, avec tout fournisseur qui copie ce protocole, ou avec une passerelle interne :
il suffit de changer VOICE_OPENAI_BASE_URL et les noms de modèles.
"""
import httpx

from app.voice.contracts import SpeechAudio
from app.voice.providers._http import call_upstream, log


class OpenAISpeechToText:
    name = "openai"

    def __init__(self, *, base_url: str, api_key: str, model: str, prompts: dict[str, str],
                 timeout: float, client: httpx.Client | None = None):
        self._base = base_url.rstrip("/")
        self._key = api_key
        self._model = model
        self._prompts = prompts
        self._client = client or httpx.Client(timeout=timeout)

    def is_ready(self) -> bool:
        return bool(self._key)

    def transcribe(self, wav: bytes, language: str) -> str:
        data = {"model": self._model, "language": language, "response_format": "json", "temperature": "0"}
        if prompt := self._prompts.get(language):
            data["prompt"] = prompt   # oriente la reconnaissance vers le vocabulaire agricole

        def request() -> str:
            response = self._client.post(
                f"{self._base}/audio/transcriptions",
                headers={"Authorization": f"Bearer {self._key}"},
                data=data,
                files={"file": ("speech.wav", wav, "audio/wav")},
            )
            response.raise_for_status()
            try:
                return response.json().get("text") or ""
            except ValueError:  # corps non JSON
                log.error("STT openai : réponse illisible")
                return ""

        return call_upstream("STT openai", request).strip()

    def close(self) -> None:
        self._client.close()


class OpenAITextToSpeech:
    name = "openai"

    def __init__(self, *, base_url: str, api_key: str, model: str, voice: str,
                 instructions: dict[str, str], timeout: float, client: httpx.Client | None = None):
        self._base = base_url.rstrip("/")
        self._key = api_key
        self._model = model
        self._voice = voice
        self._instructions = instructions
        self._client = client or httpx.Client(timeout=timeout)

    def is_ready(self) -> bool:
        return bool(self._key)

    def synthesize(self, text: str, language: str) -> SpeechAudio:
        payload = {"model": self._model, "voice": self._voice, "input": text, "response_format": "mp3"}
        if instructions := self._instructions.get(language):
            payload["instructions"] = instructions

        def request() -> bytes:
            response = self._client.post(
                f"{self._base}/audio/speech",
                headers={"Authorization": f"Bearer {self._key}"},
                json=payload,
            )
            response.raise_for_status()
            return response.content

        return SpeechAudio(content=call_upstream("TTS openai", request), mime_type="audio/mpeg")

    def close(self) -> None:
        self._client.close()
