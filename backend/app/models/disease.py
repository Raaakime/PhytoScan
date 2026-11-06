"""Maladies et leurs traductions (fr / wo / en).

Principe : la table "diseases" contient ce qui ne dépend pas de la langue (code, gravité),
la table "disease_translations" contient UNE ligne de textes par langue.
Ajouter une langue = ajouter des lignes, sans toucher au schéma.
"""
from typing import List, Optional

from sqlalchemy import JSON, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Disease(Base):
    __tablename__ = "diseases"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Code technique renvoyé par le modèle IA (ex. "cercospora"). Doit correspondre aux labels du modèle.
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    is_healthy: Mapped[bool] = mapped_column(default=False)
    # none | low | medium | high | very_high
    severity_level: Mapped[str] = mapped_column(String(20), default="none")

    translations: Mapped[List["DiseaseTranslation"]] = relationship(
        back_populates="disease", cascade="all, delete-orphan", lazy="selectin"
    )

    def get_translation(self, lang: str) -> "DiseaseTranslation":
        """Renvoie la traduction demandée ; à défaut le français ; à défaut la première disponible."""
        by_lang = {t.lang: t for t in self.translations}
        return by_lang.get(lang) or by_lang.get("fr") or self.translations[0]


class DiseaseTranslation(Base):
    __tablename__ = "disease_translations"
    __table_args__ = (UniqueConstraint("disease_id", "lang", name="uq_disease_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    disease_id: Mapped[int] = mapped_column(ForeignKey("diseases.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(5))
    name: Mapped[str] = mapped_column(String(200))
    pathogen: Mapped[str] = mapped_column(String(200))
    severity_label: Mapped[str] = mapped_column(String(50))   # ex. "Élevée"
    description: Mapped[str] = mapped_column(Text)
    symptoms: Mapped[list] = mapped_column(JSON, default=list)  # liste de textes
    remedies: Mapped[list] = mapped_column(JSON, default=list)  # liste de textes (recommandations)
    healthy_comparison: Mapped[Optional[str]] = mapped_column(Text, default=None)
    infected_comparison: Mapped[Optional[str]] = mapped_column(Text, default=None)

    disease: Mapped["Disease"] = relationship(back_populates="translations")
