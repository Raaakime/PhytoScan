"""Synthèse vocale ElevenLabs (alternative à VOICE_TTS_PROVIDER=openai pour une voix française plus riche)."""
import httpx

from app.voice.contracts import SpeechAudio
from app.voice.providers._http import call_upstream


class ElevenLabsTextToSpeech:
    name = "elevenlabs"

    def __init__(self, *, api_key: str, voice_id: str, model: str, timeout: float,
                 client: httpx.Client | None = None):
        self._key = api_key
        self._voice_id = voice_id
        self._model = model
        self._client = client or httpx.Client(timeout=timeout)

    def is_ready(self) -> bool:
        return bool(self._key and self._voice_id)

    def synthesize(self, text: str, language: str) -> SpeechAudio:
        def request() -> bytes:
            response = self._client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{self._voice_id}",
                params={"output_format": "mp3_44100_128"},
                headers={"xi-api-key": self._key, "Accept": "audio/mpeg"},
                json={
                    "text": text,
                    "model_id": self._model,
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
            )
            response.raise_for_status()
            return response.content

        return SpeechAudio(content=call_upstream("TTS elevenlabs", request), mime_type="audio/mpeg")

    def close(self) -> None:
        self._client.close()
