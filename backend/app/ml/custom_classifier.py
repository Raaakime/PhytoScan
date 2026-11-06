"""Classifieur pour VOTRE modèle entraîné (format ONNX).

Mise en service :
  1. Déposer le fichier dans app/ml/weights/model.onnx
  2. Mettre à jour app/ml/labels.json : la liste des codes de maladies DANS L'ORDRE des sorties du modèle
     (chaque code doit exister dans la table "diseases").
  3. Dans .env : ML_MODEL_BACKEND=custom  (et installer onnxruntime + numpy : requirements-prod.txt)
  4. Adapter app/ml/preprocessing.py si votre entraînement utilise d'autres valeurs.
Aucune route ni table à modifier.
"""
import json
from time import perf_counter
from typing import Optional

from PIL import Image

from app.core.config import get_settings
from app.ml.base import BaseClassifier, Prediction
from app.ml.preprocessing import preprocess


class CustomClassifier(BaseClassifier):
    name = "custom"

    def __init__(self) -> None:
        settings = get_settings()
        try:
            import onnxruntime as ort
        except ImportError as exc:  # message clair si la dépendance manque
            raise RuntimeError("onnxruntime n'est pas installé : pip install onnxruntime numpy") from exc

        if not settings.ML_MODEL_PATH.exists():
            raise RuntimeError(f"Modèle introuvable : {settings.ML_MODEL_PATH}")

        # Chargement unique au démarrage (le modèle reste en mémoire)
        self.session = ort.InferenceSession(str(settings.ML_MODEL_PATH), providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.labels = json.loads(settings.ML_LABELS_PATH.read_text(encoding="utf-8"))
        self.model_name = settings.ML_MODEL_NAME

    def predict(self, image: Image.Image, hint: Optional[str] = None) -> Prediction:
        import numpy as np

        start = perf_counter()
        scores = self.session.run(None, {self.input_name: preprocess(image)})[0][0]

        # Softmax : transforme les scores bruts en probabilités (somme = 1)
        exp = np.exp(scores - np.max(scores))
        probs = exp / exp.sum()

        best = int(np.argmax(probs))
        return Prediction(
            label=self.labels[best],
            confidence=round(float(probs[best]) * 100, 1),
            processing_ms=max(1, int((perf_counter() - start) * 1000)),
            model_name=self.model_name,
            probabilities={self.labels[i]: round(float(p) * 100, 2) for i, p in enumerate(probs)},
        )
