"""Routes des cultures (écran PlantRecordsScreen) : CRUD + carnet de santé."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_lang
from app.db.session import get_db
from app.models import User
from app.schemas.plant import (CareCreate, DiagnosticSaveRequest, HistoryCreate, ObservationCreate, PlantCreate, PlantOut,
                               PlantUpdate)
from app.services import plant_service as svc

router = APIRouter(prefix="/plants", tags=["Cultures"])


def _owner_id(user: Optional[User]) -> Optional[int]:
    return user.id if user else None


@router.get("", response_model=List[PlantOut])
def list_plants(lang: str = Depends(get_lang), user: Optional[User] = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Liste des plantes de l'utilisateur (ou plantes de démonstration si non connecté)."""
    return [svc.serialize_plant(p, lang) for p in svc.list_plants(db, _owner_id(user))]


@router.post("", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
def create_plant(data: PlantCreate, lang: str = Depends(get_lang),
                 user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ajoute une nouvelle culture."""
    return svc.serialize_plant(svc.create_plant(db, data, user), lang)


@router.get("/{plant_id}", response_model=PlantOut)
def get_plant(plant_id: str, lang: str = Depends(get_lang),
              user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fiche complète d'une plante."""
    return svc.serialize_plant(svc.get_plant(db, plant_id, _owner_id(user)), lang)


@router.patch("/{plant_id}", response_model=PlantOut)
def update_plant(plant_id: str, data: PlantUpdate, lang: str = Depends(get_lang),
                 user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Modifie partiellement une plante (seuls les champs envoyés changent)."""
    plant = svc.get_plant(db, plant_id, _owner_id(user))
    return svc.serialize_plant(svc.update_plant(db, plant, data), lang)


@router.delete("/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plant(plant_id: str, user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Supprime une plante et tout son carnet de santé."""
    svc.delete_plant(db, svc.get_plant(db, plant_id, _owner_id(user)))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{plant_id}/history", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
def add_history(plant_id: str, data: HistoryCreate, lang: str = Depends(get_lang),
                user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ajoute un événement à l'historique (scan, taille, fertilisation...)."""
    plant = svc.get_plant(db, plant_id, _owner_id(user))
    return svc.serialize_plant(svc.add_history(db, plant, data), lang)


@router.post("/{plant_id}/observations", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
def add_observation(plant_id: str, data: ObservationCreate, lang: str = Depends(get_lang),
                    user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ajoute une observation libre."""
    plant = svc.get_plant(db, plant_id, _owner_id(user))
    return svc.serialize_plant(svc.add_observation(db, plant, data), lang)


@router.post("/{plant_id}/care", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
def add_care(plant_id: str, data: CareCreate, lang: str = Depends(get_lang),
             user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ajoute une tâche de soin."""
    plant = svc.get_plant(db, plant_id, _owner_id(user))
    return svc.serialize_plant(svc.add_care(db, plant, data), lang)


@router.post("/{plant_id}/diagnostics", response_model=PlantOut, status_code=status.HTTP_201_CREATED)
def save_diagnostic(plant_id: str, data: DiagnosticSaveRequest, lang: str = Depends(get_lang),
                    user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    """Enregistre un diagnostic dans le carnet de santé. Accepte exactement le format de
    onSaveDiagnosticToPlant() du front : {diseaseName, confidence, date} (analysisId facultatif)."""
    plant = svc.get_plant(db, plant_id, _owner_id(user))
    return svc.serialize_plant(svc.save_diagnostic(db, plant, data, lang), lang)
