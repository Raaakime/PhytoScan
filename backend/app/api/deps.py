"""Dépendances FastAPI partagées par les routes : langue, utilisateur courant, base de données."""
from typing import Optional

from fastapi import Depends, Header, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.i18n import DEFAULT_LANG, normalize_lang, parse_accept_language
from app.core.security import decode_token
from app.db.session import get_db
from app.models import User

settings = get_settings()

# auto_error=False : l'absence de jeton n'est PAS une erreur automatique.
# C'est ce qui permet de laisser les routes ouvertes tant que AUTH_REQUIRED=false.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login", auto_error=False)


def get_lang(lang: Optional[str] = Query(default=None, description="fr | wo | en"),
             accept_language: Optional[str] = Header(default=None)) -> str:
    """Détermine la langue de réponse. Priorité : paramètre ?lang= > en-tête Accept-Language > français.
    Conseil front : envoyer toujours ?lang= (l'en-tête du navigateur ne reflète pas la langue choisie dans l'app)."""
    if lang:
        return normalize_lang(lang)
    return parse_accept_language(accept_language) or DEFAULT_LANG


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    """Renvoie l'utilisateur connecté, ou None si anonyme.

    - AUTH_REQUIRED=false : sans jeton -> None (route ouverte). Un jeton PRÉSENT mais invalide reste refusé.
    - AUTH_REQUIRED=true  : sans jeton -> 401.
    """
    if token is None:
        if settings.AUTH_REQUIRED:
            raise UnauthorizedError("Authentification requise.")
        return None
    user_id = decode_token(token, "access")
    user = db.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        raise UnauthorizedError("Jeton invalide ou expiré.")
    return user


def require_user(user: Optional[User] = Depends(get_current_user)) -> User:
    """Pour les routes qui exigent TOUJOURS un compte (ex. /auth/me)."""
    if user is None:
        raise UnauthorizedError("Authentification requise.")
    return user
