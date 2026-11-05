"""Accès aux fiches maladies et construction de leur version traduite."""
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import Disease
from app.schemas.disease import DiseaseOut


def get_disease_by_code(db: Session, code: str) -> Disease:
    disease = db.scalar(select(Disease).where(Disease.code == code))
    if disease is None:
        raise NotFoundError(f"Maladie inconnue : {code}")
    return disease


def serialize_disease(disease: Disease, lang: str) -> DiseaseOut:
    """Assemble la fiche dans la langue demandée (repli automatique sur le français)."""
    t = disease.get_translation(lang)
    return DiseaseOut(
        code=disease.code, name=t.name, pathogen=t.pathogen, severity=t.severity_label,
        severity_level=disease.severity_level, is_healthy=disease.is_healthy,
        description=t.description, symptoms=t.symptoms or [], remedies=t.remedies or [],
        healthy_comparison=t.healthy_comparison, infected_comparison=t.infected_comparison,
    )


def list_diseases(db: Session, lang: str) -> List[DiseaseOut]:
    diseases = db.scalars(select(Disease).order_by(Disease.id)).all()
    return [serialize_disease(d, lang) for d in diseases]


def find_disease_by_name(db: Session, name: str):
    """Retrouve une maladie à partir d'un nom affiché (dans n'importe quelle langue).
    Sert quand le front n'envoie que le nom (ex. « Tache foliaire (Cercospora) »). Renvoie None si inconnue."""
    from app.models import DiseaseTranslation  # import local pour éviter un import circulaire inutile
    wanted = name.strip().lower()
    for tr in db.scalars(select(DiseaseTranslation)).all():
        if tr.name.strip().lower() == wanted:
            return tr.disease
    # Repli : correspondance partielle (ex. « Cercospora » dans « Tache foliaire (Cercospora) »)
    for tr in db.scalars(select(DiseaseTranslation)).all():
        if tr.name.strip().lower() in wanted or wanted in tr.name.strip().lower():
            return tr.disease
    return None
