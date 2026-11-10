"""Adaptateur Speech-to-Text OpenAI pour les fichiers enregistrés."""
import httpx

from app.core.config import get_settings
from app.core.exceptions import GatewayTimeoutError, ServiceUnavailableError, UpstreamServiceError
from app.voice.audio_validation import ValidatedAudio

SUPPORTED_LANGUAGES = {"fr", "en"}


def transcribe(audio: ValidatedAudio, language: str) -> str:
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise ServiceUnavailableError("La transcription vocale n'est pas configurée.")
    if language not in SUPPORTED_LANGUAGES:
        raise ServiceUnavailableError("La transcription vocale n'est pas disponible dans cette langue.")

    try:
        with httpx.Client(timeout=settings.VOICE_PROVIDER_TIMEOUT_SECONDS) as client:
            response = client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                data={"model": settings.OPENAI_STT_MODEL, "language": language},
                files={"file": (audio.filename, audio.content, audio.media_type)},
            )
            response.raise_for_status()
            transcript = response.json().get("text")
    except httpx.TimeoutException as exc:
        raise GatewayTimeoutError("Le service de transcription n'a pas répondu à temps.") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise UpstreamServiceError("Le service de transcription a échoué. Réessayez plus tard.") from exc

    if not isinstance(transcript, str) or not transcript.strip():
        raise UpstreamServiceError("Aucune parole n'a pu être reconnue dans l'enregistrement.")
    return transcript.strip()
