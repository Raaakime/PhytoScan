"""Fabrique de classifieur : choisit le modèle selon ML_MODEL_BACKEND (.env)."""
from functools import lru_cache

from app.core.config import get_settings
from app.ml.base import BaseClassifier


@lru_cache
def get_classifier() -> BaseClassifier:
    """Renvoie l'unique instance du classifieur (chargée une seule fois)."""
    backend = get_settings().ML_MODEL_BACKEND.lower()
    if backend == "custom":
        from app.ml.custom_classifier import CustomClassifier
        return CustomClassifier()
    if backend == "mock":
        from app.ml.mock_classifier import MockClassifier
        return MockClassifier()
    raise ValueError(f"ML_MODEL_BACKEND inconnu : {backend!r} (attendu : 'mock' ou 'custom')")
