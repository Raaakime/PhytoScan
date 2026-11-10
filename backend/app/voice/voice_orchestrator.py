"""Orchestration STT -> assistant conversationnel existant -> TTS."""
import base64
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AppError, BadRequestError, ServiceUnavailableError
from app.models import User
from app.schemas.assistant import AskResponse, VoiceChatResponse
from app.services import assistant_service
from app.voice.audio_validation import read_and_validate_audio
from app.voice.providers import elevenlabs_tts, openai_stt

SUPPORTED_LANGUAGES = {"fr", "en"}


def voice_status() -> dict:
    settings = get_settings()
    stt_ready = (
        settings.VOICE_STT_PROVIDER == "openai" and bool(settings.OPENAI_API_KEY)
    )
    tts_ready = (
        settings.VOICE_TTS_PROVIDER == "elevenlabs"
        and bool(settings.ELEVENLABS_API_KEY and settings.ELEVENLABS_VOICE_ID)
    )
    enabled = settings.VOICE_ENABLED and stt_ready and tts_ready
    return {
        "enabled": enabled,
        "sttReady": stt_ready,
        "ttsReady": tts_ready,
        "supportedLanguages": ["fr", "en"],
        "message": None if enabled else "Configurez les clés STT/TTS et VOICE_ENABLED=true côté backend.",
    }


def process_voice_message(
    db: Session,
    upload: UploadFile,
    language: str,
    session_id: Optional[str],
    user: User,
) -> VoiceChatResponse:
    settings = get_settings()
    status = voice_status()
    if not settings.VOICE_ENABLED:
        raise ServiceUnavailableError("L'assistant vocal est désactivé sur ce serveur.")
    if not status["sttReady"] or not status["ttsReady"]:
        raise ServiceUnavailableError(status["message"])
    if language not in SUPPORTED_LANGUAGES:
        raise BadRequestError(
            "La conversation vocale est disponible en français et en anglais. "
            "Pour le wolof, utilisez la conversation écrite."
        )

    audio = read_and_validate_audio(upload)
    stt_provider = {
        "openai": openai_stt.transcribe,
    }.get(settings.VOICE_STT_PROVIDER)
    if stt_provider is None:
        raise ServiceUnavailableError(
            f"Fournisseur STT non pris en charge : {settings.VOICE_STT_PROVIDER}."
        )
    transcript = stt_provider(audio, language)
    if len(transcript) > 2000:
        raise BadRequestError("La transcription dépasse la longueur maximale acceptée.")

    answer: AskResponse = assistant_service.ask(db, transcript, language, {}, session_id, user)
    audio_base64 = None
    audio_error = None
    try:
        tts_provider = {
            "elevenlabs": elevenlabs_tts.synthesize,
        }.get(settings.VOICE_TTS_PROVIDER)
        if tts_provider is None:
            raise ServiceUnavailableError(
                f"Fournisseur TTS non pris en charge : {settings.VOICE_TTS_PROVIDER}."
            )
        speech = tts_provider(answer.text, language)
        audio_base64 = base64.b64encode(speech).decode("ascii")
    except AppError as exc:
        audio_error = exc.detail

    return VoiceChatResponse(
        transcript=transcript,
        text=answer.text,
        timestamp=answer.timestamp,
        session_id=answer.session_id,
        audio_base64=audio_base64,
        audio_mime_type="audio/mpeg" if audio_base64 else None,
        audio_error=audio_error,
    )
