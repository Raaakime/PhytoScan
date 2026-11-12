"""Validation des fichiers audio reçus avant leur transmission au fournisseur STT."""
from dataclasses import dataclass
from io import BytesIO

import av
from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, PayloadTooLargeError, UnsupportedMediaTypeError


@dataclass(frozen=True)
class ValidatedAudio:
    content: bytes
    filename: str
    media_type: str


_MEDIA_TYPE_EXTENSIONS = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/m4a": "mp4",
    "audio/webm": "webm",
}


def _detect_audio_format(content: bytes) -> tuple[str, str]:
    if content.startswith(b"RIFF") and content[8:12] == b"WAVE":
        return "wav", "audio/wav"
    if content.startswith(b"ID3") or (
        len(content) >= 2 and content[0] == 0xFF and content[1] & 0xE0 == 0xE0
    ):
        return "mp3", "audio/mpeg"
    if len(content) >= 8 and content[4:8] == b"ftyp":
        return "mp4", "audio/mp4"
    if content.startswith(b"\x1a\x45\xdf\xa3"):
        return "webm", "audio/webm"
    raise UnsupportedMediaTypeError("Format audio non pris en charge. Envoyez un fichier WAV, MP3, MP4/M4A ou WebM.")


def _audio_duration(content: bytes) -> float:
    try:
        with av.open(BytesIO(content)) as container:
            if not any(stream.type == "audio" for stream in container.streams):
                raise BadRequestError("Le fichier ne contient pas de piste audio.")
            if container.duration is not None:
                return container.duration / av.time_base
            stream = next((stream for stream in container.streams if stream.type == "audio"), None)
            if stream is None or stream.duration is None or stream.time_base is None:
                raise BadRequestError("Impossible de déterminer la durée de l'enregistrement.")
            return float(stream.duration * stream.time_base)
    except BadRequestError:
        raise
    except (av.error.FFmpegError, OSError, ValueError) as exc:
        raise BadRequestError("Le fichier audio est illisible ou incomplet.") from exc


def read_and_validate_audio(upload: UploadFile) -> ValidatedAudio:
    settings = get_settings()
    max_bytes = settings.VOICE_MAX_AUDIO_MB * 1024 * 1024
    content = upload.file.read(max_bytes + 1)

    if not content:
        raise BadRequestError("Le fichier audio est vide.")
    if len(content) > max_bytes:
        raise PayloadTooLargeError(
            f"Enregistrement trop volumineux (maximum {settings.VOICE_MAX_AUDIO_MB} Mo)."
        )

    extension, detected_media_type = _detect_audio_format(content)
    declared_media_type = (upload.content_type or "").split(";", 1)[0].strip().lower()
    if declared_media_type not in _MEDIA_TYPE_EXTENSIONS:
        raise UnsupportedMediaTypeError("Type MIME audio non pris en charge.")
    if _MEDIA_TYPE_EXTENSIONS[declared_media_type] != extension:
        raise UnsupportedMediaTypeError("Le type MIME ne correspond pas au contenu du fichier.")

    duration = _audio_duration(content)
    if duration <= 0:
        raise BadRequestError("L'enregistrement audio ne contient aucune durée exploitable.")
    if duration > settings.VOICE_MAX_AUDIO_SECONDS:
        raise BadRequestError(
            f"Enregistrement trop long (maximum {settings.VOICE_MAX_AUDIO_SECONDS} secondes)."
        )

    return ValidatedAudio(
        content=content,
        filename=f"recording.{extension}",
        media_type=detected_media_type,
    )
