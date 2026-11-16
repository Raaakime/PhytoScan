"""Classifieur PhytoScan : EfficientNetB0 au format TFLite (fonctionne hors ligne).

Emplacement prévu par app/ml/__init__.py (ML_MODEL_BACKEND=custom). Il respecte le contrat du MockClassifier :
    predict(image: PIL.Image, hint=None) -> Prediction(label, confidence, processing_ms, model_name, probabilities)
- label      : un code existant dans la table "diseases" (voir CLASS_TO_CODE)
- confidence : pourcentage 0-100
Le prétraitement (rescaling / normalisation) est INTÉGRÉ au modèle : on lui donne des pixels 0-255.
"""
import json
import threading
from time import perf_counter
from typing import Dict, List, Optional

import numpy as np
from PIL import Image

try:
    from tflite_runtime.interpreter import Interpreter
except ImportError:
    try:
        from ai_edge_litert.interpreter import Interpreter
    except ImportError:
        from tensorflow.lite.python.interpreter import Interpreter

from app.core.config import get_settings
from app.ml.base import BaseClassifier, Prediction
from app.ml.mock_classifier import KNOWN_LABELS, MockClassifier

# Classe du modèle -> code de la table "diseases".
# Les cultures partagent la même fiche pour une même maladie (mildiou, gale...) ; les 3 "healthy" -> "healthy".
CLASS_TO_CODE: Dict[str, str] = {
    "Pepper__bell___Bacterial_spot": "bacterial_spot",
    "Pepper__bell___healthy": "healthy",
    "Potato___Early_blight": "early_blight",
    "Potato___Late_blight": "late_blight",
    "Potato___healthy": "healthy",
    "Tomato_Bacterial_spot": "bacterial_spot",
    "Tomato_Early_blight": "early_blight",
    "Tomato_Late_blight": "late_blight",
    "Tomato_Leaf_Mold": "leaf_mold",
    "Tomato_Septoria_leaf_spot": "septoria",
    "Tomato_Spider_mites_Two_spotted_spider_mite": "spider_mites",
    "Tomato__Target_Spot": "target_spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus": "tylcv",
    "Tomato__Tomato_mosaic_virus": "tomato_mosaic",
    "Tomato_healthy": "healthy",
}


class CustomClassifier(BaseClassifier):
    name = "custom"

    def __init__(self) -> None:
        s = get_settings()
        self.model_name = s.ML_MODEL_NAME
        self._model_path = str(s.ML_MODEL_PATH)
        self._labels: List[str] = json.loads(s.ML_LABELS_PATH.read_text(encoding="utf-8"))
        unknown = [c for c in self._labels if c not in CLASS_TO_CODE]
        if unknown:
            raise ValueError(f"Classes sans correspondance dans CLASS_TO_CODE : {unknown}")
        self._lock = threading.Lock()      # un Interpreter TFLite n'est pas thread-safe
        self._interp: Optional[Interpreter] = None
        self._mock = MockClassifier()      # utilisé uniquement pour le paramètre de test `hint`

    def _load(self) -> Interpreter:
        if self._interp is None:
            it = Interpreter(model_path=self._model_path, num_threads=2)
            it.allocate_tensors()
            
            out_n = it.get_output_details()[0]["shape"][-1]
            if out_n != len(self._labels):
                raise ValueError(f"Le modèle sort {out_n} classes mais labels.json en contient {len(self._labels)}.")
            self._interp = it
        return self._interp

    def predict(self, image: Image.Image, hint: Optional[str] = None) -> Prediction:
        if hint in KNOWN_LABELS:           # forçage de test : même comportement qu'avant
            return self._mock.predict(image, hint=hint)

        start = perf_counter()
        with self._lock:
            it = self._load()
            inp, out = it.get_input_details()[0], it.get_output_details()[0]
            h, w = int(inp["shape"][1]), int(inp["shape"][2])
            arr = np.asarray(image.convert("RGB").resize((w, h)))
            it.set_tensor(inp["index"], np.expand_dims(arr, 0).astype(inp["dtype"]))   # pixels 0-255
            it.invoke()
            probs = it.get_tensor(out["index"])[0].astype(np.float64)

        if not 0.99 <= probs.sum() <= 1.01:   # sécurité si le modèle renvoie des logits
            e = np.exp(probs - probs.max())
            probs = e / e.sum()

        # On additionne les probabilités des classes qui pointent vers la même fiche (ex. 3 « healthy »).
        scores: Dict[str, float] = {}
        for label, p in zip(self._labels, probs):
            code = CLASS_TO_CODE[label]
            scores[code] = scores.get(code, 0.0) + float(p) * 100
        best = max(scores, key=scores.get)
        top3 = dict(sorted(((k, round(v, 1)) for k, v in scores.items()), key=lambda kv: -kv[1])[:3])

        return Prediction(best, round(scores[best], 1), max(1, int((perf_counter() - start) * 1000)),
                          self.model_name, top3)