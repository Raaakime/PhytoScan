"""Routes du diagnostic IA. `POST /scan/diagnose` est celle appelée par analyzePlantImage() du front."""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_lang
from app.db.session import get_db
from app.models import User
from app.schemas.plant import PlantOut
from app.schemas.scan import DiagnosisOut, SaveScanRequest
from app.services import plant_service, scan_service

router = APIRouter(prefix="/scan", tags=["Diagnostic IA"])


@router.post("/diagnose", response_model=DiagnosisOut)
def diagnose(
    image: UploadFile = File(..., description="Photo de la feuille (JPEG, PNG ou WEBP)"),
    model: Optional[str] = Form(None),                      # envoyé par le front, informatif (le modèle réel est choisi par le serveur)
    include_recommendations: bool = Form(True),
    plant_id: Optional[str] = Form(None, description="Plante ciblée (facultatif)"),
    hint: Optional[str] = Form(None, description="TEST uniquement : force un résultat (ex. healthy, cercospora)"),
    lang: str = Depends(get_lang),
    user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyse une photo de feuille et renvoie le diagnostic dans la langue demandée."""
    return scan_service.diagnose(db, image, lang, user, plant_id=plant_id, hint=hint,
                                 include_recommendations=include_recommendations)


# IMPORTANT : "/history" est déclarée AVANT "/{analysis_id}", sinon "history" serait pris pour un identifiant.
@router.get("/history", response_model=List[DiagnosisOut])
def history(limit: int = Query(20, ge=1, le=100), lang: str = Depends(get_lang),
            user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dernières analyses de l'utilisateur."""
    return scan_service.list_scans(db, lang, user, limit)


@router.get("/{analysis_id}", response_model=DiagnosisOut)
def get_one(analysis_id: str, lang: str = Depends(get_lang),
            user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Relit une analyse précédente."""
    return scan_service.get_scan(db, analysis_id, lang, user)


@router.post("/{analysis_id}/save", response_model=PlantOut)
def save_to_plant(analysis_id: str, body: SaveScanRequest, lang: str = Depends(get_lang),
                  user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Enregistre le diagnostic dans le carnet de santé d'une plante (bouton « Enregistrer » du front)."""
    plant = scan_service.save_scan_to_plant(db, analysis_id, body.plant_id, lang, user)
    return plant_service.serialize_plant(plant, lang)
