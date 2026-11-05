"""Schéma des alertes phytosanitaires (panneau « Alertes en direct » de VoiceAssistantScreen)."""
from typing import List, Optional

from app.schemas.common import CamelModel


class AlertOut(CamelModel):
    id: str
    level: str                      # "danger" (plante malade) | "warning" (à surveiller)
    title: str                      # ex. "Plante 2 (Aubergine) — Parcelle B1"
    description: str
    plant_id: Optional[str] = None
    plot: Optional[str] = None
    date: str                       # date de la dernière observation, formatée dans la langue demandée


class AlertsResponse(CamelModel):
    count: int                      # alimente « N alertes actives »
    alerts: List[AlertOut]
