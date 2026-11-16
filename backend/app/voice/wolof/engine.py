import io
import os
import httpx
import numpy as np


# L'URL de votre espace gratuit Hugging Face (ex: https://hf.space)
HF_SPACE_URL = os.getenv(
    "HF_WOLOF_SPACE_URL", "https://hf.space"
).rstrip("/")


def transcribe(pcm: np.ndarray) -> str:
  """Envoie l'audio au Hugging Face Space et récupère le texte wolof."""
  # On convertit le tableau numpy en fichier WAV en mémoire
  from app.voice.wolof.audio import SAMPLE_RATE, to_wav_bytes

  wav_bytes = to_wav_bytes(pcm, SAMPLE_RATE)

  with httpx.Client(timeout=60.0) as client:
    response = client.post(
        f"{HF_SPACE_URL}/transcribe",
        files={"file": ("audio.wav", wav_bytes, "audio/wav")},
    )
    response.raise_for_status()
    return response.json().get("text", "").strip()


def synthesize(text: str) -> tuple[np.ndarray, int]:
  """Envoie le texte wolof au Hugging Face Space et récupère l'audio."""
  with httpx.Client(timeout=60.0) as client:
    response = client.post(f"{HF_SPACE_URL}/synthesize", json={"text": text})
    response.raise_for_status()

    # Lecture des octets WAV reçus en tableau numpy float32
    import wave

    with wave.open(io.BytesIO(response.content), "rb") as wf:
      rate = wf.getframerate()
      frames = wf.readframes(wf.getnframes())
      pcm16 = np.frombuffer(frames, dtype=np.int16)
      samples = pcm16.astype(np.float32) / 32767.0
      return samples, rate
