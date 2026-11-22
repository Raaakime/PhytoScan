"""Schémas de l'assistant vocal (JSON en camelCase, comme le reste de l'API)."""
from typing import Dict, Optional

from pydantic import Field

from app.schemas.common import CamelModel


class LanguageCapabilities(CamelModel):
    stt: bool = Field(description="La reconnaissance vocale (micro) est utilisable dans cette langue.")
    tts: bool = Field(description="La lecture à voix haute est utilisable dans cette langue.")


class VoiceStatusResponse(CamelModel):
    enabled: bool
    requires_auth: bool = True
    max_recording_seconds: int
    max_speech_chars: int
    languages: Dict[str, LanguageCapabilities]


class VoiceChatResponse(CamelModel):
    language: str
    transcript: str                              # ce que le serveur a compris
    text: str                                    # réponse écrite de l'assistant
    timestamp: str                               # "hh:mm"
    session_id: str
    audio_base64: Optional[str] = None           # réponse parlée ; null si la synthèse est indisponible
    audio_mime_type: Optional[str] = None
    audio_truncated: bool = False                # la réponse écrite était trop longue pour être lue en entier
    audio_error: Optional[str] = None            # pourquoi il n'y a pas d'audio (la réponse écrite reste valable)


class SpeechRequest(CamelModel):
    text: str = Field(min_length=1, max_length=2000)
    language: str = "fr"
