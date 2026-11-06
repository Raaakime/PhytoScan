"""Sécurité : hash des mots de passe (bcrypt) et jetons JWT (accès + rafraîchissement)."""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    """Hache un mot de passe. bcrypt ne lit que 72 octets : on tronque pour éviter une erreur."""
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Compare un mot de passe saisi avec son hash stocké."""
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))
    except ValueError:
        return False


def _create_token(user_id: int, token_type: str, expires: timedelta) -> str:
    """Fabrique un JWT signé contenant l'identifiant utilisateur, le type et la date d'expiration."""
    payload = {
        "sub": str(user_id),
        "type": token_type,  # "access" ou "refresh" : empêche d'utiliser l'un à la place de l'autre
        "exp": datetime.now(timezone.utc) + expires,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _create_token(user_id, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: int) -> str:
    return _create_token(user_id, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str, expected_type: str) -> Optional[int]:
    """Vérifie signature, expiration et type du jeton. Renvoie l'id utilisateur, ou None si invalide."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    try:
        return int(payload["sub"])
    except (KeyError, ValueError):
        return None
