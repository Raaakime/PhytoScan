"""Alertes phytosanitaires : calculées à partir de l'état réel des plantes (plus de données en dur).

Limite actuelle : pas d'alerte météo (ex. « risque de mildiou ») car aucune source météo n'est branchée.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.core.i18n import format_date
from app.schemas.alert import AlertOut, AlertsResponse
from app.services import plant_service


def _short(text: Optional[str], sep: str) -> str:
    """'Parcelle B1 - Plein champ' -> 'Parcelle B1' ; 'Aubergine (Solanum melongena)' -> 'Aubergine'."""
    return (text or "").split(sep)[0].strip()


def build_alerts(db: Session, lang: str, owner_id: Optional[int]) -> AlertsResponse:
    plants = [p for p in plant_service.list_plants(db, owner_id) if p.status != "saine"]
    # Les plantes malades d'abord, puis celles à surveiller ; à gravité égale, les plus récentes d'abord
    plants.sort(key=lambda p: (p.status != "malade", -(p.last_observation.toordinal() if p.last_observation else 0)))

    alerts = []
    for p in plants:
        plot = _short(p.plot, " - ")
        title = f"{p.name} ({_short(p.species, '(')})" + (f" — {plot}" if plot else "")
        alerts.append(AlertOut(
            id=f"alert-{p.id}", level="danger" if p.status == "malade" else "warning", title=title,
            description=p.alert or (p.details or {}).get("notes", ""), plant_id=p.id, plot=plot,
            date=format_date(p.last_observation, lang)))
    return AlertsResponse(count=len(alerts), alerts=alerts)
