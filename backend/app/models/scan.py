"""Historique des analyses d'images faites par l'IA."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import utcnow


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Identifiant public renvoyé au front (ex. "OCT-1A2B3C4D")
    analysis_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), default=None, index=True)
    # Plante associée (renseignée à l'envoi ou lors de l'enregistrement dans le carnet de santé)
    plant_id: Mapped[Optional[str]] = mapped_column(ForeignKey("plants.id", ondelete="SET NULL"), default=None, index=True)
    disease_id: Mapped[int] = mapped_column(ForeignKey("diseases.id"))
    image_path: Mapped[str] = mapped_column(String(300))       # chemin relatif dans UPLOAD_DIR
    confidence: Mapped[float] = mapped_column(Float)           # 0 à 100
    model_name: Mapped[str] = mapped_column(String(80))        # modèle ayant produit le résultat
    processing_ms: Mapped[int] = mapped_column(default=0)
    lang: Mapped[str] = mapped_column(String(5), default="fr")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
