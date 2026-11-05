"""Schémas des plantes. La sortie reprend la structure de INITIAL_PLANTS (mockData.js)."""
from datetime import date
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import Field

from app.schemas.common import CamelModel

PlantStatus = Literal["saine", "surveiller", "malade"]


# ---------- Sorties ----------
class HistoryOut(CamelModel):
    id: int
    date: str                     # déjà formaté ("20 avril 2025") dans la langue demandée
    type: str
    result: str
    notes: Optional[str] = None


class CareOut(CamelModel):
    id: int
    task: str
    frequency: Optional[str] = None
    status: Optional[str] = None


class ObservationOut(CamelModel):
    id: int
    date: str
    author: str
    text: str


class PlantOut(CamelModel):
    id: str
    name: str
    species: str
    variety: Optional[str] = None
    status: PlantStatus
    status_label: str
    growth_stage: Optional[str] = None
    planting_date: str
    last_observation: str
    plot: Optional[str] = None
    water_schedule: Optional[str] = None
    image: Optional[str] = None
    health_score: int
    alert: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    history: List[HistoryOut] = []
    care: List[CareOut] = []
    observations: List[ObservationOut] = []


# ---------- Entrées ----------
class PlantCreate(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    species: str = Field(min_length=1, max_length=200)
    variety: Optional[str] = None
    status: PlantStatus = "saine"
    growth_stage: Optional[str] = None
    planting_date: Optional[date] = None
    plot: Optional[str] = None
    water_schedule: Optional[str] = None
    image: Optional[str] = None
    health_score: int = Field(default=100, ge=0, le=100)
    alert: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class PlantUpdate(CamelModel):
    """Tous les champs sont optionnels : seuls ceux envoyés sont modifiés (PATCH)."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    species: Optional[str] = Field(default=None, min_length=1, max_length=200)
    variety: Optional[str] = None
    status: Optional[PlantStatus] = None
    growth_stage: Optional[str] = None
    planting_date: Optional[date] = None
    last_observation: Optional[date] = None
    plot: Optional[str] = None
    water_schedule: Optional[str] = None
    image: Optional[str] = None
    health_score: Optional[int] = Field(default=None, ge=0, le=100)
    alert: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class HistoryCreate(CamelModel):
    date: Optional[date] = None            # par défaut : aujourd'hui
    type: str = Field(min_length=1, max_length=80)
    result: str = Field(min_length=1, max_length=300)
    notes: Optional[str] = None


class ObservationCreate(CamelModel):
    date: Optional[date] = None
    author: str = Field(default="Agriculteur", max_length=120)
    text: str = Field(min_length=1)


class CareCreate(CamelModel):
    task: str = Field(min_length=1, max_length=300)
    frequency: Optional[str] = None
    status: Optional[str] = None


class DiagnosticSaveRequest(CamelModel):
    """Format envoyé par onSaveDiagnosticToPlant() du front : {plantId, diseaseName, confidence, date}.
    La confiance peut être un nombre (96.4) ou le texte affiché ("96.4%")."""
    disease_name: str = Field(min_length=1, max_length=200)
    confidence: Optional[Union[str, float]] = None
    date: Optional[str] = None          # "jj/mm/aaaa" (format du front) ou "aaaa-mm-jj"
    analysis_id: Optional[str] = None   # facultatif : lie l'enregistrement à une analyse précise
