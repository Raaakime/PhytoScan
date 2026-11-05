"""Schémas du diagnostic : le JSON de sortie reprend EXACTEMENT les champs lus par ScanScreen.jsx."""
from typing import List, Optional

from app.schemas.common import CamelModel


class ComparisonOut(CamelModel):
    healthy_img: str
    infected_img: str
    healthy_desc: Optional[str] = None
    infected_desc: Optional[str] = None


class DiagnosisOut(CamelModel):
    success: bool = True
    status: str                       # "saine" | "malade"
    status_label: str                 # ex. "Maladie détectée"
    is_healthy: bool
    disease_name: str
    disease_code: str                 # code technique (extra, utile pour le front)
    pathogen: str
    confidence: float                 # nombre (le front ajoute le "%")
    severity: str
    analysis_id: str
    date: str                         # "jj/mm/aaaa"
    time: str                         # "hh:mm"
    diagnosis: str
    recommendations: List[str]
    comparison: ComparisonOut
    model_name: str                   # extra : modèle utilisé
    processing_ms: int                # extra : le front affiche aujourd'hui "120 ms" en dur
    image_url: str                    # extra : adresse de l'image enregistrée
    plant_id: Optional[str] = None


class SaveScanRequest(CamelModel):
    plant_id: str
