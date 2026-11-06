"""Schéma d'une fiche maladie (remplace COMMON_DISEASES de mockData.js)."""
from typing import List, Optional

from app.schemas.common import CamelModel


class DiseaseOut(CamelModel):
    code: str
    name: str
    pathogen: str
    severity: str            # libellé traduit, ex. "Élevée"
    severity_level: str      # code stable : none | low | medium | high | very_high
    is_healthy: bool
    description: str
    symptoms: List[str]
    remedies: List[str]
    healthy_comparison: Optional[str] = None
    infected_comparison: Optional[str] = None
