"""Réception et normalisation des enregistrements.

Quel que soit le navigateur (WebM/Opus de Chrome et Firefox, MP4/AAC de Safari, WAV, MP3, Ogg), un
enregistrement est décodé une seule fois en PCM mono 16 kHz, puis ré-encodé en WAV. Tous les moteurs de
reconnaissance reçoivent donc le même format, et les limites (taille, durée, silence) sont appliquées ici.

La durée est mesurée en DÉCODANT le flux : les WebM produits par MediaRecorder n'ont pas de durée dans leur
en-tête, ce qui rend toute validation par métadonnées peu fiable.
"""
import io
import wave
from dataclasses import dataclass
from typing import BinaryIO, Optional

import av
import numpy as np

from app.core.exceptions import BadRequestError, PayloadTooLargeError, UnsupportedMediaTypeError

SAMPLE_RATE = 16_000
MIN_RMS = 0.004          # en dessous (environ -48 dBFS), l'enregistrement est considéré comme silencieux
TARGET_PEAK = 0.9
MAX_GAIN = 6.0           # remonte un micro faible sans amplifier le bruit de façon excessive


@dataclass(frozen=True)
class Recording:
    samples: np.ndarray  # float32 mono, SAMPLE_RATE
    seconds: float

    def to_wav(self) -> bytes:
        return to_wav(self.samples, SAMPLE_RATE)


def sniff_format(head: bytes) -> Optional[str]:
    """Identifie le conteneur d'après ses premiers octets (jamais d'après le nom ou le type MIME déclarés)."""
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "wav"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "matroska,webm"
    if head[4:8] == b"ftyp":
        return "mov,mp4,m4a,3gp,3g2,mj2"
    if head[:4] == b"OggS":
        return "ogg"
    if head[:3] == b"ID3" or (len(head) > 1 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0):
        return "mp3"
    return None


def read_upload(stream: BinaryIO, max_bytes: int, max_mb: int) -> bytes:
    data = stream.read(max_bytes + 1)
    if not data:
        raise BadRequestError("L'enregistrement est vide.")
    if len(data) > max_bytes:
        raise PayloadTooLargeError(f"Enregistrement trop volumineux (maximum {max_mb} Mo).")
    return data


def decode_pcm(data: bytes, max_seconds: float) -> np.ndarray:
    """Décode vers un tableau float32 mono 16 kHz. S'arrête dès que la durée maximale est dépassée."""
    container_format = sniff_format(data[:16])
    if container_format is None:
        raise UnsupportedMediaTypeError("Format audio non pris en charge. Envoyez du WAV, MP3, MP4/M4A, Ogg ou WebM.")

    limit = int(max_seconds * SAMPLE_RATE)
    chunks: list[np.ndarray] = []
    total = 0
    try:
        with av.open(io.BytesIO(data), format=container_format) as container:
            stream = next((s for s in container.streams if s.type == "audio"), None)
            if stream is None:
                raise BadRequestError("Le fichier ne contient pas de piste audio.")
            resampler = av.AudioResampler(format="s16", layout="mono", rate=SAMPLE_RATE)
            for frame in container.decode(stream):
                for out in resampler.resample(frame):
                    chunk = out.to_ndarray().reshape(-1)
                    chunks.append(chunk)
                    total += chunk.size
                    if total > limit:
                        raise BadRequestError(f"Enregistrement trop long (maximum {int(max_seconds)} secondes).")
            for out in resampler.resample(None):  # vide le tampon du rééchantillonneur
                chunk = out.to_ndarray().reshape(-1)
                chunks.append(chunk)
                total += chunk.size
    except BadRequestError:
        raise
    except (av.error.FFmpegError, OSError, ValueError) as exc:
        raise BadRequestError("Le fichier audio est illisible ou incomplet.") from exc

    if not chunks:
        raise BadRequestError("L'enregistrement ne contient aucun son exploitable.")
    pcm = np.concatenate(chunks).astype(np.float32) / 32768.0
    if pcm.size > limit:
        raise BadRequestError(f"Enregistrement trop long (maximum {int(max_seconds)} secondes).")
    return pcm


def normalize_level(samples: np.ndarray) -> np.ndarray:
    """Supprime la composante continue et remonte les enregistrements faibles (gain plafonné)."""
    samples = samples - float(np.mean(samples))
    peak = float(np.max(np.abs(samples)))
    if peak <= 0:
        return samples
    gain = min(TARGET_PEAK / peak, MAX_GAIN)
    return np.clip(samples * gain, -1.0, 1.0).astype(np.float32)


def load_recording(
    stream: BinaryIO, *, max_mb: int, min_seconds: float, max_seconds: float
) -> Recording:
    """Lit, décode et valide un enregistrement ; renvoie des erreurs HTTP lisibles par l'utilisateur."""
    data = read_upload(stream, max_mb * 1024 * 1024, max_mb)
    samples = decode_pcm(data, max_seconds)
    seconds = samples.size / SAMPLE_RATE
    if seconds < min_seconds:
        raise BadRequestError("Enregistrement trop court : parlez un peu plus longtemps avant d'arrêter le micro.")
    rms = float(np.sqrt(np.mean(np.square(samples))))
    if rms < MIN_RMS:
        raise BadRequestError("Je n'ai rien entendu. Vérifiez votre micro et parlez plus près.")
    return Recording(samples=normalize_level(samples), seconds=seconds)


def to_wav(samples: np.ndarray, sample_rate: int) -> bytes:
    pcm16 = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    out = io.BytesIO()
    with wave.open(out, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm16.tobytes())
    return out.getvalue()
