"""Logique du diagnostic : image -> IA -> base de données -> réponse pour le front."""
import uuid
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.core.i18n import DIAGNOSIS_STATUS_LABELS
from app.ml import get_classifier
from app.models import Disease, Scan, User
from app.schemas.scan import ComparisonOut, DiagnosisOut
from app.services import disease_service, plant_service
from app.utils.file_storage import read_and_validate_image, save_image

settings = get_settings()


def _build_response(scan: Scan, disease: Disease, lang: str, include_recommendations: bool = True) -> DiagnosisOut:
    """Assemble le JSON exactement au format attendu par ScanScreen.jsx."""
    t = disease.get_translation(lang)
    status = "saine" if disease.is_healthy else "malade"
    local_time = scan.created_at  # UTC ; le front peut convertir si besoin
    return DiagnosisOut(
        status=status,
        status_label=DIAGNOSIS_STATUS_LABELS[status].get(lang, DIAGNOSIS_STATUS_LABELS[status]["fr"]),
        is_healthy=disease.is_healthy,
        disease_name=t.name, disease_code=disease.code, pathogen=t.pathogen,
        confidence=scan.confidence, severity=t.severity_label,
        analysis_id=scan.analysis_id,
        date=local_time.strftime("%d/%m/%Y"), time=local_time.strftime("%H:%M"),
        diagnosis=t.description,
        recommendations=(t.remedies or []) if include_recommendations else [],
        comparison=ComparisonOut(
            healthy_img=settings.COMPARISON_HEALTHY_IMG, infected_img=settings.COMPARISON_INFECTED_IMG,
            healthy_desc=t.healthy_comparison, infected_desc=t.infected_comparison),
        model_name=scan.model_name, processing_ms=scan.processing_ms,
        image_url=f"/media/{scan.image_path}", plant_id=scan.plant_id,
    )


def diagnose(db: Session, upload: UploadFile, lang: str, user: Optional[User],
             plant_id: Optional[str] = None, hint: Optional[str] = None,
             include_recommendations: bool = True) -> DiagnosisOut:
    """Flux complet d'un diagnostic."""
    # 1) Contrôle et sauvegarde de l'image
    content, image, extension = read_and_validate_image(upload)

    # 2) Si une plante est ciblée, on vérifie qu'elle existe et appartient à l'utilisateur
    if plant_id:
        plant_service.get_plant(db, plant_id, user.id if user else None)

    # 3) Prédiction par le modèle IA (mock aujourd'hui, votre modèle demain)
    prediction = get_classifier().predict(image, hint=hint)

    # 4) Retrouver la fiche maladie correspondant au code prédit
    disease = disease_service.get_disease_by_code(db, prediction.label)

    # 5) Sauvegarde de l'image puis de l'analyse
    image_path = save_image(content, extension)
    scan = Scan(
        analysis_id=f"OCT-{uuid.uuid4().hex[:8].upper()}",
        user_id=user.id if user else None, plant_id=plant_id, disease_id=disease.id,
        image_path=image_path, confidence=prediction.confidence, model_name=prediction.model_name,
        processing_ms=prediction.processing_ms, lang=lang,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return _build_response(scan, disease, lang, include_recommendations)


def _get_owned_scan(db: Session, analysis_id: str, user: Optional[User]) -> Scan:
    """Récupère une analyse appartenant à l'utilisateur courant (ou anonyme)."""
    scan = db.scalar(select(Scan).where(Scan.analysis_id == analysis_id))
    if scan is None or scan.user_id != (user.id if user else None):
        raise NotFoundError(f"Analyse introuvable : {analysis_id}")
    return scan


def get_scan(db: Session, analysis_id: str, lang: str, user: Optional[User]) -> DiagnosisOut:
    scan = _get_owned_scan(db, analysis_id, user)
    return _build_response(scan, db.get(Disease, scan.disease_id), lang)


def list_scans(db: Session, lang: str, user: Optional[User], limit: int = 20) -> List[DiagnosisOut]:
    scans = db.scalars(
        select(Scan).where(Scan.user_id.is_(None) if user is None else Scan.user_id == user.id)
        .order_by(Scan.created_at.desc(), Scan.id.desc()).limit(limit)).all()
    return [_build_response(s, db.get(Disease, s.disease_id), lang) for s in scans]


def save_scan_to_plant(db: Session, analysis_id: str, plant_id: str, lang: str, user: Optional[User]):
    """Enregistre le diagnostic dans le carnet de santé d'une plante et renvoie la plante mise à jour."""
    scan = _get_owned_scan(db, analysis_id, user)
    plant = plant_service.get_plant(db, plant_id, user.id if user else None)
    return plant_service.apply_scan_to_plant(db, plant, scan, db.get(Disease, scan.disease_id), lang)
