"""Routes du catalogue des maladies (remplace COMMON_DISEASES du front)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_lang
from app.db.session import get_db
from app.schemas.disease import DiseaseOut
from app.services import disease_service

router = APIRouter(prefix="/diseases", tags=["Maladies"])


@router.get("", response_model=List[DiseaseOut])
def list_diseases(lang: str = Depends(get_lang), db: Session = Depends(get_db)):
    """Toutes les fiches maladies dans la langue demandée."""
    return disease_service.list_diseases(db, lang)


@router.get("/{code}", response_model=DiseaseOut)
def get_disease(code: str, lang: str = Depends(get_lang), db: Session = Depends(get_db)):
    """Une fiche maladie (ex. /diseases/cercospora)."""
    return disease_service.serialize_disease(disease_service.get_disease_by_code(db, code), lang)
