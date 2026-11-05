"""Logique métier des plantes et de leur carnet de santé."""
import re
from datetime import date, datetime
from typing import List, Optional, Union

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.core.i18n import PLANT_STATUS_LABELS, format_date
from app.models import Disease, Plant, PlantCare, PlantHistory, PlantObservation, Scan, User
from app.schemas.plant import (CareCreate, CareOut, DiagnosticSaveRequest, HistoryCreate, HistoryOut,
                               ObservationCreate, ObservationOut, PlantCreate, PlantOut, PlantUpdate)
from app.services import disease_service

# Impact d'une maladie sur le score de santé (100 - pénalité)
SEVERITY_PENALTY = {"none": 0, "low": 20, "medium": 35, "high": 55, "very_high": 70}

# Clés toujours présentes dans "details" : le front les lit directement (details.soilMoisture, ...)
DETAIL_KEYS = ("yieldEstimate", "soilMoisture", "temperature", "notes")


# ---------------------------------------------------------------- utilitaires
def _owner_filter(owner_id: Optional[int]):
    """Un utilisateur connecté voit SES plantes ; sans connexion, on voit les plantes de démonstration (sans propriétaire)."""
    return Plant.owner_id.is_(None) if owner_id is None else Plant.owner_id == owner_id


def _next_plant_id(db: Session) -> str:
    """Génère le prochain identifiant lisible : P-001, P-002, ..."""
    numbers = [int(m.group(1)) for pid in db.scalars(select(Plant.id)).all()
               if (m := re.fullmatch(r"P-(\d+)", pid))]
    return f"P-{(max(numbers) if numbers else 0) + 1:03d}"


def parse_front_date(value: Optional[str]) -> date:
    """Lit une date envoyée par le front ('23/04/2025' ou '2025-04-23'). Aujourd'hui si absente/illisible."""
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime((value or "").strip(), fmt).date()
        except ValueError:
            continue
    return date.today()


def parse_confidence(value: Union[str, float, None]) -> Optional[float]:
    """Accepte 96.4, '96.4' ou '96.4%' et renvoie un nombre (ou None)."""
    if value is None:
        return None
    try:
        return float(str(value).replace("%", "").replace(",", ".").strip())
    except ValueError:
        return None


def serialize_plant(plant: Plant, lang: str) -> PlantOut:
    """Transforme une plante de la base en JSON pour le front.
    Les champs texte ne sont JAMAIS null (le front appelle .toLowerCase() sur plot, par exemple)."""
    status_label = PLANT_STATUS_LABELS.get(plant.status, {}).get(lang, plant.status)
    details = {**{k: "" for k in DETAIL_KEYS}, **(plant.details or {})}
    return PlantOut(
        id=plant.id, name=plant.name, species=plant.species, variety=plant.variety or "",
        status=plant.status, status_label=status_label, growth_stage=plant.growth_stage or "",
        planting_date=format_date(plant.planting_date, lang),
        last_observation=format_date(plant.last_observation, lang),
        plot=plant.plot or "", water_schedule=plant.water_schedule or "", image=plant.image or "",
        health_score=plant.health_score, alert=plant.alert, details=details,
        history=[HistoryOut(id=h.id, date=format_date(h.date, lang), type=h.type, result=h.result, notes=h.notes or "")
                 for h in plant.history],
        care=[CareOut(id=c.id, task=c.task, frequency=c.frequency or "", status=c.status or "") for c in plant.care],
        observations=[ObservationOut(id=o.id, date=format_date(o.date, lang), author=o.author, text=o.text)
                      for o in plant.observations],
    )


# ---------------------------------------------------------------- lecture
def list_plants(db: Session, owner_id: Optional[int]) -> List[Plant]:
    return list(db.scalars(select(Plant).where(_owner_filter(owner_id)).order_by(Plant.id)).all())


def get_plant(db: Session, plant_id: str, owner_id: Optional[int]) -> Plant:
    """Renvoie la plante si elle appartient bien à l'utilisateur, sinon 404 (on ne révèle pas son existence)."""
    plant = db.scalar(select(Plant).where(Plant.id == plant_id, _owner_filter(owner_id)))
    if plant is None:
        raise NotFoundError(f"Plante introuvable : {plant_id}")
    return plant


# ---------------------------------------------------------------- écriture
def create_plant(db: Session, data: PlantCreate, owner: Optional[User]) -> Plant:
    """Crée une culture avec la même fiche initiale que le formulaire du front (valeurs par défaut,
    premier événement d'historique, soins de base, première observation)."""
    today = date.today()
    values = data.model_dump()
    # Valeurs par défaut reprises de handleAddPlant() dans PlantRecordsScreen.jsx
    values["growth_stage"] = values["growth_stage"] or "Semis / Végétatif"
    values["water_schedule"] = values["water_schedule"] or "Goutte-à-goutte (quotidien)"
    values["image"] = values["image"] or "/assets/plante_1.jpg"
    values["planting_date"] = values["planting_date"] or today
    values["details"] = {
        "yieldEstimate": "4.0 kg / pied", "soilMoisture": "62%", "temperature": "24°C",
        "notes": "Culture enregistrée dans le carnet agronomique PhytoScan.", **(values["details"] or {})}

    plant = Plant(id=_next_plant_id(db), owner_id=owner.id if owner else None,
                  last_observation=today, **values)
    plant.history = [PlantHistory(date=today, type="Enregistrement", result="Culture initialisée",
                                  notes="Semis et repiquage validés.")]
    plant.care = [PlantCare(task="Arrosage matinal", frequency="Quotidien", status="En cours"),
                  PlantCare(task="Paillage racinaire", frequency="Mensuel", status="À prévoir")]
    plant.observations = [PlantObservation(date=today, author="Agriculteur",
                                           text="Plantation réalisée en conditions optimales.")]
    db.add(plant)
    db.commit()
    return plant


def update_plant(db: Session, plant: Plant, data: PlantUpdate) -> Plant:
    # exclude_unset : on ne modifie QUE les champs réellement envoyés par le front
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plant, field, value)
    db.commit()
    return plant


def delete_plant(db: Session, plant: Plant) -> None:
    db.delete(plant)  # l'historique, les soins et les observations partent avec (cascade)
    db.commit()


def add_history(db: Session, plant: Plant, data: HistoryCreate) -> Plant:
    entry = PlantHistory(plant_id=plant.id, date=data.date or date.today(),
                         type=data.type, result=data.result, notes=data.notes)
    db.add(entry)
    plant.last_observation = entry.date
    db.commit()
    db.refresh(plant)
    return plant


def add_observation(db: Session, plant: Plant, data: ObservationCreate) -> Plant:
    obs = PlantObservation(plant_id=plant.id, date=data.date or date.today(), author=data.author, text=data.text)
    db.add(obs)
    plant.last_observation = obs.date
    db.commit()
    db.refresh(plant)
    return plant


def add_care(db: Session, plant: Plant, data: CareCreate) -> Plant:
    db.add(PlantCare(plant_id=plant.id, task=data.task, frequency=data.frequency, status=data.status))
    db.commit()
    db.refresh(plant)
    return plant


# ---------------------------------------------------------------- diagnostics -> carnet de santé
def _apply_disease_state(plant: Plant, disease: Disease, lang: str, confidence: Optional[float]) -> None:
    """Met à jour l'état de la plante (statut, score de santé, alerte) d'après la maladie diagnostiquée."""
    t = disease.get_translation(lang)
    if disease.is_healthy:
        plant.status, plant.alert = "saine", None
        plant.health_score = min(100, round(confidence)) if confidence else 98
    else:
        plant.status = "malade" if disease.severity_level in ("high", "very_high") else "surveiller"
        plant.health_score = max(5, 100 - SEVERITY_PENALTY.get(disease.severity_level, 40))
        plant.alert = f"{t.name} : {t.description}"


def apply_scan_to_plant(db: Session, plant: Plant, scan: Scan, disease: Disease, lang: str) -> Plant:
    """Enregistre une analyse du back dans le carnet de santé : historique + statut + score de santé."""
    t = disease.get_translation(lang)
    today = scan.created_at.date()
    db.add(PlantHistory(plant_id=plant.id, date=today, type="Scan IA",
                        result=f"{t.name} ({scan.confidence}%)",
                        notes=(t.remedies[0] if t.remedies else t.description)))
    plant.last_observation = today
    _apply_disease_state(plant, disease, lang, scan.confidence)
    scan.plant_id = plant.id
    db.commit()
    db.refresh(plant)
    return plant


def save_diagnostic(db: Session, plant: Plant, data: DiagnosticSaveRequest, lang: str) -> Plant:
    """Enregistre un diagnostic décrit par le front ({diseaseName, confidence, date}), sans analysisId.
    Si le nom correspond à une maladie connue, l'état de la plante est aussi mis à jour."""
    when = parse_front_date(data.date)
    confidence = parse_confidence(data.confidence)
    disease = disease_service.find_disease_by_name(db, data.disease_name)

    result = data.disease_name + (f" ({confidence}%)" if confidence is not None else "")
    notes = None
    if disease is not None:
        remedies = disease.get_translation(lang).remedies
        notes = remedies[0] if remedies else None
        _apply_disease_state(plant, disease, lang, confidence)
    db.add(PlantHistory(plant_id=plant.id, date=when, type="Scan IA", result=result, notes=notes))
    plant.last_observation = when
    db.commit()
    db.refresh(plant)
    return plant
