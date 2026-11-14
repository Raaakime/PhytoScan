"""Conversation vocale en wolof : reconnaissance locale -> assistant écrit existant -> synthèse locale.

Aucun fournisseur payant. La synthèse vocale est facultative : si elle échoue, la réponse écrite est quand même renvoyée.
"""
import base64
import logging
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, ServiceUnavailableError
from app.models import User
from app.schemas.assistant import AskResponse, VoiceChatResponse
from app.services import assistant_service
from app.voice.wolof import audio as wolof_audio
from app.voice.wolof import engine

log = logging.getLogger(__name__)
MAX_TTS_CHARS = 500


def _shorten(text: str) -> str:
    """Limite la synthèse vocale aux premières phrases (les modèles sont lents sur de longs textes)."""
    if len(text) <= MAX_TTS_CHARS:
        return text
    cut = text[:MAX_TTS_CHARS]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    return cut[:end + 1] if end > 100 else cut


def process_wolof_message(db: Session, upload: UploadFile, session_id: Optional[str],
                          user: Optional[User]) -> VoiceChatResponse:
    s = get_settings()
    if not s.VOICE_WOLOF_ENABLED:
        raise ServiceUnavailableError("La voix en wolof est désactivée sur ce serveur.")

    limit = s.VOICE_MAX_AUDIO_MB * 1024 * 1024
    raw = upload.file.read(limit + 1)
    if not raw:
        raise BadRequestError("Fichier audio vide.")
    if len(raw) > limit:
        raise BadRequestError(f"Fichier audio trop volumineux (maximum {s.VOICE_MAX_AUDIO_MB} Mo).")

    pcm = wolof_audio.decode_to_pcm16k(raw, s.VOICE_WOLOF_MAX_SECONDS)
    transcript = engine.transcribe(pcm)
    if not transcript:
        raise BadRequestError("Je n'ai pas compris votre question. Parlez plus près du micro et réessayez.")
    if len(transcript) > 2000:
        raise BadRequestError("La transcription dépasse la longueur maximale acceptée.")

    answer: AskResponse = assistant_service.ask(db, transcript, "wo", {}, session_id, user)

    audio_base64 = None
    audio_error = None
    try:
        wave, rate = engine.synthesize(_shorten(answer.text))
        audio_base64 = base64.b64encode(wolof_audio.to_wav_bytes(wave, rate)).decode("ascii")
    except Exception:  # noqa: BLE001 - la voix est facultative
        log.warning("Synthèse vocale wolof indisponible", exc_info=True)
        audio_error = "La lecture vocale en wolof est indisponible : le texte de la réponse reste valable."

    return VoiceChatResponse(
        transcript=transcript, text=answer.text, timestamp=answer.timestamp, session_id=answer.session_id,
        audio_base64=audio_base64, audio_mime_type="audio/wav" if audio_base64 else None,
        audio_error=audio_error,
    )
