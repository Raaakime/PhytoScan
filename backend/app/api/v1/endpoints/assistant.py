"""Routes de l'assistant vocal. `POST /assistant/ask` est appelée par askOctopusAssistant() du front."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.core.i18n import LANGUAGES
from app.schemas.assistant import (AskRequest, AskResponse, HistoryResponse, LanguageOut,
                                    SuggestionsResponse)
from app.services import assistant_service

router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/ask", response_model=AskResponse)
def ask(body: AskRequest, user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Pose une question à l'assistant (la langue vient du champ `language`, comme dans le front)."""
    return assistant_service.ask(db, body.question, body.language, body.context, body.session_id, user)


@router.get("/history", response_model=HistoryResponse)
def history(session_id: str = Query(...), user: Optional[User] = Depends(get_current_user),
            db: Session = Depends(get_db)):
    """Relit une discussion enregistrée."""
    return assistant_service.get_history(db, session_id, user)


@router.get("/languages", response_model=List[LanguageOut])
def languages():
    """Langues disponibles (remplace ASSISTANT_LANGUAGES du front)."""
    return LANGUAGES


@router.get("/suggestions", response_model=SuggestionsResponse)
def suggestions(language: str = Query("fr")):
    """Questions suggérées dans la langue choisie (remplace SAMPLE_QUESTIONS du front)."""
    return assistant_service.get_suggestions(language)
