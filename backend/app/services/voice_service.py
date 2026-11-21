"""Couche service de l'assistant vocal : construit le pipeline une seule fois et le fournit aux routes."""
import base64
from functools import lru_cache
from typing import BinaryIO, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import User
from app.schemas.voice import VoiceChatResponse, VoiceStatusResponse
from app.voice.pipeline import VoicePipeline
from app.voice.registry import build_registry


@lru_cache
def get_voice_pipeline() -> VoicePipeline:
    settings = get_settings()
    return VoicePipeline(build_registry(settings), settings)


def shutdown_voice() -> None:
    if get_voice_pipeline.cache_info().currsize:
        get_voice_pipeline().close()
        get_voice_pipeline.cache_clear()


def voice_status(pipeline: VoicePipeline) -> VoiceStatusResponse:
    return VoiceStatusResponse(**pipeline.status())


def voice_chat(pipeline: VoicePipeline, db: Session, stream: BinaryIO, language: str,
               session_id: Optional[str], user: User) -> VoiceChatResponse:
    turn = pipeline.converse(db, stream, language, session_id, user)
    return VoiceChatResponse(
        language=turn.language,
        transcript=turn.transcript,
        text=turn.answer.text,
        timestamp=turn.answer.timestamp,
        session_id=turn.answer.session_id,
        audio_base64=base64.b64encode(turn.speech.content).decode("ascii") if turn.speech else None,
        audio_mime_type=turn.speech.mime_type if turn.speech else None,
        audio_truncated=turn.speech_truncated,
        audio_error=turn.audio_error,
    )
