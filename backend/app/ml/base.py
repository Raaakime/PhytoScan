"""Contrat commun de tous les classifieurs d'images.

Le reste de l'application ne connaît QUE cette interface. Pour brancher votre vrai modèle,
il suffit de fournir une classe qui hérite de BaseClassifier (voir custom_classifier.py).
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Optional

from PIL import Image


@dataclass
class Prediction:
    """Résultat d'une prédiction."""
    label: str                     # code de la maladie, ex. "cercospora" ou "healthy"
    confidence: float              # certitude de 0 à 100 (comme "96.4" dans le front)
    processing_ms: int             # temps de calcul en millisecondes
    model_name: str                # nom du modèle utilisé (traçabilité)
    probabilities: Dict[str, float] = field(default_factory=dict)  # score de chaque classe (optionnel)


class BaseClassifier(ABC):
    """Interface à respecter par tout classifieur (test ou réel)."""

    name: str = "base"

    @abstractmethod
    def predict(self, image: Image.Image, hint: Optional[str] = None) -> Prediction:
        """Analyse une image PIL et renvoie une Prediction.

        `hint` : valeur de forçage utilisée uniquement par le classifieur de test.
        """
        raise NotImplementedError
