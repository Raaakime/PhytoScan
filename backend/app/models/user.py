"""Table des utilisateurs (agriculteurs, conseillers, administrateurs)."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    """Date/heure actuelle en UTC (utilisée comme valeur par défaut des colonnes de date)."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    farm_name: Mapped[Optional[str]] = mapped_column(String(160), default=None)
    agricultural_role: Mapped[Optional[str]] = mapped_column(String(120), default=None)
    hashed_password: Mapped[str] = mapped_column(String(255))  # jamais le mot de passe en clair
    preferred_lang: Mapped[str] = mapped_column(String(5), default="fr")  # fr | wo | en
    role: Mapped[str] = mapped_column(String(20), default="farmer")        # farmer | advisor | admin
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
