"""Adaptateur Text-to-Speech ElevenLabs."""
import httpx

from app.core.config import get_settings
from app.core.exceptions import GatewayTimeoutError, ServiceUnavailableError, UpstreamServiceError


def synthesize(text: str, language: str) -> bytes:
    settings = get_settings()
    if not settings.ELEVENLABS_API_KEY or not settings.ELEVENLABS_VOICE_ID:
        raise ServiceUnavailableError("La synthèse vocale n'est pas configurée.")

    try:
        with httpx.Client(timeout=settings.VOICE_PROVIDER_TIMEOUT_SECONDS) as client:
            response = client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}",
                params={"output_format": "mp3_44100_128"},
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": text,
                    "model_id": settings.ELEVENLABS_TTS_MODEL,
                    "language_code": language,
                },
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise GatewayTimeoutError("Le service de synthèse vocale n'a pas répondu à temps.") from exc
    except httpx.HTTPError as exc:
        raise UpstreamServiceError("Le service de synthèse vocale a échoué. Réessayez plus tard.") from exc

    if not response.content or not response.headers.get("content-type", "").startswith("audio/"):
        raise UpstreamServiceError("Le service de synthèse vocale a renvoyé un résultat invalide.")
    return response.content
