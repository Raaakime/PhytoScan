"""Moteurs factices : déterministes, instantanés, sans modèle. Pour les tests et la CI (ENGINE=fake)."""
import numpy as np

from app.audio import SAMPLE_RATE, finalize_speech


class FakeSTT:
    def transcribe(self, samples: np.ndarray) -> str:
        return "nanga def" if float(np.max(np.abs(samples))) > 0.01 else ""


class FakeTTS:
    sample_rate = SAMPLE_RATE

    def synthesize(self, text: str) -> np.ndarray:
        seconds = min(0.05 * len(text), 10.0)
        t = np.arange(int(seconds * self.sample_rate)) / self.sample_rate
        return finalize_speech(0.3 * np.sin(2 * np.pi * 180 * t), self.sample_rate)
