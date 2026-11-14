"""Décodage audio (webm / ogg / mp4 / wav -> PCM 16 kHz mono) via ffmpeg, et encodage WAV."""
import io
import os
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Optional

import numpy as np

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, ServiceUnavailableError

SAMPLE_RATE = 16000


def find_ffmpeg() -> Optional[str]:
    """Cherche ffmpeg : 1) VOICE_FFMPEG_PATH (.env)  2) le Path du système  3) l'emplacement habituel de winget (Windows)."""
    configured = (get_settings().VOICE_FFMPEG_PATH or "").strip().strip('"')
    if configured and Path(configured).is_file():
        return configured
    on_path = shutil.which("ffmpeg")
    if on_path:
        return on_path
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        packages = Path(local_app_data) / "Microsoft" / "WinGet" / "Packages"
        if packages.is_dir():
            for candidate in sorted(packages.glob("Gyan.FFmpeg*/**/bin/ffmpeg.exe"), reverse=True):
                return str(candidate)
    return None


def decode_to_pcm16k(raw: bytes, max_seconds: int) -> np.ndarray:
    """Renvoie les échantillons float32 mono à 16 kHz (format attendu par les modèles)."""
    ffmpeg = find_ffmpeg()
    if ffmpeg is None:
        raise ServiceUnavailableError(
            "ffmpeg est introuvable. Installez-le ou indiquez son chemin complet dans VOICE_FFMPEG_PATH (.env).")
    try:
        proc = subprocess.run(
            [ffmpeg, "-v", "error", "-i", "pipe:0", "-t", str(max_seconds + 1),
             "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "pipe:1"],
            input=raw, capture_output=True, timeout=30)
    except FileNotFoundError as exc:
        raise ServiceUnavailableError(f"ffmpeg est introuvable à l'emplacement {ffmpeg}.") from exc
    except subprocess.TimeoutExpired as exc:
        raise BadRequestError("L'audio est trop long à traiter.") from exc
    if proc.returncode != 0 or not proc.stdout:
        raise BadRequestError("Fichier audio illisible. Réessayez avec un autre enregistrement.")

    pcm = np.frombuffer(proc.stdout, dtype=np.float32)
    seconds = len(pcm) / SAMPLE_RATE
    if seconds > max_seconds:
        raise BadRequestError(f"Enregistrement trop long (maximum {max_seconds} secondes).")
    if seconds < 0.3:
        raise BadRequestError("Enregistrement trop court : maintenez le micro un peu plus longtemps.")
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