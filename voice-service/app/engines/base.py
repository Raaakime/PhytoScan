"""Interfaces des moteurs. Un nouveau modèle = une nouvelle classe qui les respecte + une ligne dans `build_engines`."""
from typing import Protocol

import numpy as np


class STTEngine(Protocol):
    def transcribe(self, samples: np.ndarray) -> str:
        """`samples` : float32 mono 16 kHz. Renvoie le texte wolof reconnu."""


class TTSEngine(Protocol):
    sample_rate: int

    def synthesize(self, text: str) -> np.ndarray:
        """Renvoie des échantillons float32 mono à `sample_rate`, déjà prêts à être encodés."""
