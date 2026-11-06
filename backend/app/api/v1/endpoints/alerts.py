"""Route des alertes phytosanitaires (panneau de droite de l'assistant)."""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_lang
from app.db.session import get_db
from app.models import User
from app.schemas.alert import AlertsResponse
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["Alertes"])


@router.get("", response_model=AlertsResponse)
def list_alerts(lang: str = Depends(get_lang), user: Optional[User] = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Alertes actives (plantes malades ou à surveiller)."""
    return alert_service.build_alerts(db, lang, user.id if user else None)
