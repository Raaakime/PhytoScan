"""Décodage audio (webm / ogg / mp4 / wav -> PCM 16 kHz mono) via PyAV (av), et encodage WAV."""

import io
import wave

import av
import numpy as np

from app.core.exceptions import BadRequestError

SAMPLE_RATE = 16000


def decode_to_pcm16k(raw: bytes, max_seconds: int) -> np.ndarray:
  """Renvoie les échantillons float32 mono à 16 kHz (format attendu par les modèles)."""
  try:
    container = av.open(io.BytesIO(raw))
  except av.AVError as exc:
    raise BadRequestError(
        "Fichier audio illisible. Réessayez avec un autre enregistrement."
    ) from exc

  audio_streams = [s for s in container.streams if s.type == "audio"]
  if not audio_streams:
    container.close()
    raise BadRequestError("Aucune piste audio trouvée dans le fichier.")

  resampler = av.AudioResampler(
      format="fltp",
      layout="mono",
      rate=SAMPLE_RATE,
  )

  chunks: list[np.ndarray] = []
  total_samples = 0
  # Limite stricte pour éviter de charger un fichier géant en mémoire sur Render
  max_samples_limit = int((max_seconds + 1) * SAMPLE_RATE)

  try:
    for frame in container.decode(audio_streams[0]):
      for resampled_frame in resampler.resample(frame):
        arr = resampled_frame.to_ndarray()
        # Format fltp mono -> tableau 2D (1, N), on aplatit en 1D float32
        mono_chunk = arr[0].astype(np.float32)
        chunks.append(mono_chunk)
        total_samples += len(mono_chunk)
        if total_samples > max_samples_limit:
          break
      if total_samples > max_samples_limit:
        break

    # Vider le tampon interne du resampler à la fin du flux
    for resampled_frame in resampler.resample(None):
      arr = resampled_frame.to_ndarray()
      mono_chunk = arr[0].astype(np.float32)
      chunks.append(mono_chunk)
      total_samples += len(mono_chunk)
  except av.AVError as exc:
    raise BadRequestError("Erreur lors de la lecture du flux audio.") from exc
  finally:
    container.close()

  if not chunks:
    raise BadRequestError(
        "Fichier audio vide ou illisible. Réessayez avec un autre"
        " enregistrement."
    )

  pcm = np.concatenate(chunks)
  seconds = len(pcm) / SAMPLE_RATE

  if seconds > max_seconds:
    raise BadRequestError(
        f"Enregistrement trop long (maximum {max_seconds} secondes)."
    )
  if seconds < 0.3:
    raise BadRequestError(
        "Enregistrement trop court : maintenez le micro un peu plus longtemps."
    )

  return pcm


def to_wav_bytes(samples: np.ndarray, sample_rate: int) -> bytes:
  """Encode des échantillons float32 [-1, 1] en WAV 16 bits mono."""
  pcm16 = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
  buffer = io.BytesIO()
  with wave.open(buffer, "wb") as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(sample_rate)
    wav.writeframes(pcm16.tobytes())
  return buffer.getvalue()
