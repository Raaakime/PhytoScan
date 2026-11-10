"""API de conversation vocale en mode Push-to-Talk."""
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.session import get_db
from app.models import User
from app.schemas.assistant import VoiceChatResponse, VoiceStatusResponse
from app.services import voice_service

router = APIRouter(prefix="/voice", tags=["Assistant vocal"])


@router.get("/status", response_model=VoiceStatusResponse)
def status():
    return voice_service.voice_status()


@router.post("/chat", response_model=VoiceChatResponse)
def chat(
    audio: UploadFile = File(...),
    language: str = Form("fr"),
    session_id: Optional[str] = Form(None, max_length=60),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return voice_service.process_voice_message(db, audio, language, session_id, user)
