"""Classe de base de tous les modèles SQLAlchemy."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Tous les modèles (tables) héritent de cette classe."""
    pass
