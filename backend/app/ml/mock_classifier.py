"""Classifieur de TEST (aucune vraie IA).

Il estime simplement la proportion de pixels « brun/jaune » (lésions possibles) par rapport
aux pixels verts. Si cette proportion dépasse un seuil, il répond « cercospora », sinon « healthy ».
C'est suffisant pour tester tout le flux (upload -> diagnostic -> base de données -> front),
mais ce n'est PAS un diagnostic fiable : il sera remplacé par votre vrai modèle.
"""
from time import perf_counter
from typing import Optional

from PIL import Image

from app.core.config import get_settings
from app.ml.base import BaseClassifier, Prediction

# Codes que le classifieur de test sait renvoyer (doivent exister dans la table "diseases")
KNOWN_LABELS = ("healthy", "cercospora", "mildew", "powdery_mildew")
LESION_THRESHOLD = 0.10  # au-delà de 10 % de pixels « lésion », on considère la feuille malade


class MockClassifier(BaseClassifier):
    name = "mock"

    def __init__(self) -> None:
        self.model_name = get_settings().ML_MODEL_NAME

    def predict(self, image: Image.Image, hint: Optional[str] = None) -> Prediction:
        start = perf_counter()

        # Forçage explicite (utile pour les tests automatiques et les démos) : ?hint=healthy
        if hint in KNOWN_LABELS:
            return Prediction(hint, 97.0, self._elapsed(start), self.model_name, {hint: 97.0})

        # Réduction de l'image à 64x64 pour aller vite, puis lecture des pixels RGB 3 octets par 3 octets
        data = image.convert("RGB").resize((64, 64)).tobytes()
        green = lesion = 0
        for i in range(0, len(data), 3):
            r, g, b = data[i], data[i + 1], data[i + 2]
            if g > r + 8 and g > b + 8:
                green += 1                       # pixel vert = tissu sain
            elif r > b + 30 and r >= g * 0.85:
                lesion += 1                      # pixel brun / jaune / orangé = lésion possible

        total = green + lesion
        ratio = lesion / total if total else 0.0

        if ratio >= LESION_THRESHOLD:
            label = "cercospora"
            # Plus il y a de lésions, plus la « certitude » simulée monte (80 -> 97 %)
            confidence = 80 + min(ratio, 0.4) / 0.4 * 17
        else:
            label = "healthy"
            # Moins il y a de lésions, plus la « certitude » simulée monte (90 -> 98 %)
            confidence = 90 + (1 - ratio / LESION_THRESHOLD) * 8

        confidence = round(confidence, 1)
        return Prediction(label, confidence, self._elapsed(start), self.model_name, {label: confidence})

    @staticmethod
    def _elapsed(start: float) -> int:
        """Durée écoulée en millisecondes (au moins 1)."""
        return max(1, int((perf_counter() - start) * 1000))
