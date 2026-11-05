"""Plantes suivies + leur carnet de santé (historique, soins, observations).

Reprend la structure de INITIAL_PLANTS dans mockData.js.
"""
from datetime import date
from typing import List, Optional

from sqlalchemy import JSON, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Plant(Base):
    __tablename__ = "plants"

    # Identifiant lisible comme dans le front : "P-001", "P-002"...
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    # Propriétaire. NULL = plante de démonstration visible sans connexion.
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, default=None)

    name: Mapped[str] = mapped_column(String(120))
    species: Mapped[str] = mapped_column(String(200))
    variety: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    status: Mapped[str] = mapped_column(String(20), default="saine")  # saine | surveiller | malade
    growth_stage: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    planting_date: Mapped[Optional[date]] = mapped_column(Date, default=None)
    last_observation: Mapped[Optional[date]] = mapped_column(Date, default=None)
    plot: Mapped[Optional[str]] = mapped_column(String(200), default=None)            # parcelle
    water_schedule: Mapped[Optional[str]] = mapped_column(String(200), default=None)  # planning d'arrosage
    image: Mapped[Optional[str]] = mapped_column(String(300), default=None)
    health_score: Mapped[int] = mapped_column(default=100)  # 0 à 100
    alert: Mapped[Optional[str]] = mapped_column(Text, default=None)
    # { yieldEstimate, soilMoisture, temperature, notes } : structure souple stockée en JSON
    details: Mapped[dict] = mapped_column(JSON, default=dict)

    # Les plus récents d'abord ; supprimés automatiquement avec la plante
    history: Mapped[List["PlantHistory"]] = relationship(
        cascade="all, delete-orphan", order_by="PlantHistory.date.desc(), PlantHistory.id.desc()", lazy="selectin")
    care: Mapped[List["PlantCare"]] = relationship(
        cascade="all, delete-orphan", order_by="PlantCare.id", lazy="selectin")
    observations: Mapped[List["PlantObservation"]] = relationship(
        cascade="all, delete-orphan", order_by="PlantObservation.date.desc(), PlantObservation.id.desc()", lazy="selectin")


class PlantHistory(Base):
    """Événements passés : scan IA, taille, fertilisation, plantation..."""
    __tablename__ = "plant_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    plant_id: Mapped[str] = mapped_column(ForeignKey("plants.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)
    type: Mapped[str] = mapped_column(String(80))      # ex. "Scan IA"
    result: Mapped[str] = mapped_column(String(300))
    notes: Mapped[Optional[str]] = mapped_column(Text, default=None)


class PlantCare(Base):
    """Tâches de soin : arrosage, traitement, paillage..."""
    __tablename__ = "plant_care"

    id: Mapped[int] = mapped_column(primary_key=True)
    plant_id: Mapped[str] = mapped_column(ForeignKey("plants.id", ondelete="CASCADE"), index=True)
    task: Mapped[str] = mapped_column(String(300))
    frequency: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    status: Mapped[Optional[str]] = mapped_column(String(120), default=None)


class PlantObservation(Base):
    """Notes libres de l'agriculteur, du conseiller ou du système."""
    __tablename__ = "plant_observations"

    id: Mapped[int] = mapped_column(primary_key=True)
    plant_id: Mapped[str] = mapped_column(ForeignKey("plants.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)
    author: Mapped[str] = mapped_column(String(120))
    text: Mapped[str] = mapped_column(Text)
