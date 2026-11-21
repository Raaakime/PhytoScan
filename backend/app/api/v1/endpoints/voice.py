"""Assistant vocal : état, question parlée (micro) et lecture à voix haute d'un texte, en français, anglais et wolof."""
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.session import get_db
from app.models import User
from app.schemas.voice import SpeechRequest, VoiceChatResponse, VoiceStatusResponse
from app.services import voice_service
from app.voice.pipeline import VoicePipeline

router = APIRouter(prefix="/voice", tags=["Assistant vocal"])


@router.get("/status", response_model=VoiceStatusResponse)
def status(pipeline: VoicePipeline = Depends(voice_service.get_voice_pipeline)):
    """Ce que le serveur sait faire, langue par langue (le front masque ce qui n'est pas disponible)."""
    return voice_service.voice_status(pipeline)


@router.post("/chat", response_model=VoiceChatResponse)
def chat(
    audio: UploadFile = File(..., description="Enregistrement du navigateur : WebM, MP4/M4A, Ogg, WAV ou MP3."),
    language: str = Form("fr", description="fr | en | wo"),
    session_id: Optional[str] = Form(None, max_length=60),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    pipeline: VoicePipeline = Depends(voice_service.get_voice_pipeline),
):
    """Question parlée -> transcription -> réponse de l'assistant -> réponse parlée (JSON, audio en base64)."""
    return voice_service.voice_chat(pipeline, db, audio.file, language, session_id, user)


@router.post("/speech", response_class=Response, responses={200: {"content": {"audio/mpeg": {}, "audio/wav": {}}}})
def speech(
    body: SpeechRequest,
    user: User = Depends(require_user),
    pipeline: VoicePipeline = Depends(voice_service.get_voice_pipeline),
):
    """Lit un texte à voix haute (bouton « Écouter »). Le texte long est coupé à la dernière phrase entière."""
    audio, truncated = pipeline.speak(body.text, body.language, user)
    headers = {"Cache-Control": "no-store"}
    if truncated:
        headers["X-Audio-Truncated"] = "true"
    return Response(content=audio.content, media_type=audio.mime_type, headers=headers)
