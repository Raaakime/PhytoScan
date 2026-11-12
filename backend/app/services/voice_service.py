"""Couche de service HTTP mince pour l'orchestrateur vocal."""
from app.core.exceptions import BadRequestError
from app.voice.providers import wolof_pocket_tts
from app.voice.voice_orchestrator import process_voice_message, voice_status


def synthesize_wolof_speech(text: str, language: str) -> bytes:
    if language != "wo":
        raise BadRequestError("Cette route de synthèse est réservée au wolof.")
    if not text.strip():
        raise BadRequestError("Le texte à prononcer ne peut pas être vide.")
    return wolof_pocket_tts.synthesize(text.strip())


__all__ = ["process_voice_message", "synthesize_wolof_speech", "voice_status"]
