"""Validation et sauvegarde des images envoyées par le front."""
import io
import uuid
from typing import Tuple

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings
from app.core.exceptions import BadRequestError

settings = get_settings()

# Formats acceptés (on vérifie le VRAI contenu avec Pillow, pas seulement l'extension annoncée)
ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


def read_and_validate_image(upload: UploadFile) -> Tuple[bytes, Image.Image, str]:
    """Lit le fichier envoyé, contrôle taille + format, et renvoie (octets, image PIL, extension)."""
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    content = upload.file.read(max_bytes + 1)  # on lit 1 octet de plus pour détecter un dépassement

    if not content:
        raise BadRequestError("Le fichier image est vide.")
    if len(content) > max_bytes:
        raise BadRequestError(f"Image trop volumineuse (maximum {settings.MAX_UPLOAD_MB} Mo).")

    try:
        probe = Image.open(io.BytesIO(content))
        probe.verify()                                  # vérifie que le fichier n'est pas corrompu
        image = Image.open(io.BytesIO(content))         # verify() invalide l'objet : on rouvre
        image.load()
    except (UnidentifiedImageError, OSError):
        raise BadRequestError("Le fichier envoyé n'est pas une image valide (JPEG, PNG ou WEBP).")

    extension = ALLOWED_FORMATS.get(image.format or "")
    if extension is None:
        raise BadRequestError("Format d'image non supporté (JPEG, PNG ou WEBP uniquement).")
    return content, image, extension


def save_image(content: bytes, extension: str) -> str:
    """Enregistre l'image sous un nom aléatoire et renvoie son chemin RELATIF (ex. 'scans/ab12.jpg')."""
    folder = settings.UPLOAD_DIR / "scans"
    folder.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"       # le nom client n'est jamais utilisé (sécurité)
    (folder / filename).write_bytes(content)
    return f"scans/{filename}"
