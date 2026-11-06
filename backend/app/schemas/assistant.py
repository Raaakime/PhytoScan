"""Schémas de l'assistant vocal (formats de askOctopusAssistant dans octopusApi.js)."""
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.schemas.common import CamelModel


class AskRequest(CamelModel):
    question: str = Field(min_length=1, max_length=2000)
    language: str = "fr"                        # fr | wo | en
    context: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None            # pour regrouper une discussion (généré si absent)


class AskResponse(CamelModel):
    text: str
    timestamp: str                              # "hh:mm"
    audio_url: Optional[str] = None             # reste null tant que la synthèse vocale n'est pas branchée
    session_id: str


class ChatMessageOut(CamelModel):
    id: int
    sender: str                                 # "user" | "bot" (comme dans INITIAL_CHAT_MESSAGES)
    text: str
    timestamp: str
    has_audio: bool = False


class HistoryResponse(CamelModel):
    session_id: str
    messages: List[ChatMessageOut]


class SuggestionsResponse(CamelModel):
    language: str
    questions: List[str]


class LanguageOut(CamelModel):
    code: str
    name: str
    flag: str
