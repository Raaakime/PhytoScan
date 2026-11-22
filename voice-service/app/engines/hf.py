"""Moteurs Hugging Face (Whisper wolof pour la reconnaissance, SpeechT5 wolof pour la synthèse).

`torch` et `transformers` ne sont importés qu'ici : le reste du service (et ses tests) n'en a pas besoin.
"""
import logging
from pathlib import Path

import numpy as np

from app.audio import SAMPLE_RATE, finalize_speech, join_with_pauses, split_sentences
from app.config import Settings

log = logging.getLogger("voice-service")


def resolve_device(requested: str) -> str:
    import torch

    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("DEVICE=cuda demandé mais aucun GPU CUDA n'est disponible.")
    return requested


class WhisperSTT:
    def __init__(self, settings: Settings, device: str):
        from transformers import pipeline

        token = settings.HF_TOKEN.get_secret_value() or None
        log.info("Chargement STT %s sur %s", settings.STT_MODEL, device)
        self._pipe = pipeline("automatic-speech-recognition", model=settings.STT_MODEL, device=device, token=token)
        self._language = settings.STT_LANGUAGE.strip()

    def transcribe(self, samples: np.ndarray) -> str:
        import torch

        generate_kwargs = {"language": self._language, "task": "transcribe"} if self._language else {}
        with torch.inference_mode():
            result = self._pipe({"raw": samples, "sampling_rate": SAMPLE_RATE}, generate_kwargs=generate_kwargs)
        return " ".join(str(result.get("text", "")).split())


class SpeechT5TTS:
    sample_rate = 16_000   # fréquence de sortie du vocodeur HiFi-GAN de SpeechT5
    MAX_CHARS_PER_CHUNK = 200

    def __init__(self, settings: Settings, device: str):
        import torch
        from transformers import SpeechT5ForTextToSpeech, SpeechT5HifiGan, SpeechT5Processor

        path = Path(settings.TTS_SPEAKER_EMBEDDING)
        if not path.is_file():
            raise RuntimeError(f"Empreinte de voix introuvable : {path}. Lancez scripts/fetch_speaker_embedding.py.")
        token = settings.HF_TOKEN.get_secret_value() or None
        log.info("Chargement TTS %s sur %s", settings.TTS_MODEL, device)
        self._torch = torch
        self._device = device
        self._processor = SpeechT5Processor.from_pretrained(settings.TTS_MODEL, token=token)
        self._model = SpeechT5ForTextToSpeech.from_pretrained(settings.TTS_MODEL, token=token).to(device).eval()
        self._vocoder = SpeechT5HifiGan.from_pretrained(settings.TTS_VOCODER, token=token).to(device).eval()
        embedding = np.load(path).astype(np.float32).reshape(1, -1)
        if embedding.shape != (1, 512):
            raise RuntimeError(f"Empreinte de voix invalide : {embedding.shape} (attendu : 512 valeurs).")
        self._speaker = torch.from_numpy(embedding).to(device)

    def synthesize(self, text: str) -> np.ndarray:
        parts = []
        for chunk in split_sentences(text, self.MAX_CHARS_PER_CHUNK):
            inputs = self._processor(text=chunk, return_tensors="pt")
            with self._torch.inference_mode():
                speech = self._model.generate_speech(
                    inputs["input_ids"].to(self._device), self._speaker, vocoder=self._vocoder)
            parts.append(finalize_speech(speech.cpu().numpy(), self.sample_rate))
        # Chaque phrase est normalisée puis assemblée : le volume reste constant d'une phrase à l'autre.
        return finalize_speech(join_with_pauses([p for p in parts if p.size], self.sample_rate), self.sample_rate)
