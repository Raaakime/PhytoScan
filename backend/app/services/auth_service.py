"""Logique d'authentification : inscription, connexion, rafraîchissement du jeton."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.i18n import normalize_lang
from app.core.security import (create_access_token, create_refresh_token, decode_token,
                               hash_password, verify_password)
from app.models import User
from app.schemas.user import TokenPair, UserCreate


def _tokens_for(user: User) -> TokenPair:
    return TokenPair(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


def register_user(db: Session, data: UserCreate) -> User:
    """Crée un compte. L'e-mail est stocké en minuscules et doit être unique."""
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise ConflictError("Un compte existe déjà avec cet e-mail.")
    user = User(email=email, hashed_password=hash_password(data.password),
                full_name=data.full_name, preferred_lang=normalize_lang(data.preferred_lang))
    db.add(user)
    db.commit()
    return user


def login(db: Session, email: str, password: str) -> TokenPair:
    """Vérifie les identifiants et renvoie un couple de jetons.
    Même message d'erreur pour e-mail inconnu ou mauvais mot de passe (ne révèle pas quel e-mail existe)."""
    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user or not user.is_active or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("E-mail ou mot de passe incorrect.")
    return _tokens_for(user)


def refresh(db: Session, refresh_token: str) -> TokenPair:
    """Échange un jeton de rafraîchissement valide contre une nouvelle paire de jetons."""
    user_id = decode_token(refresh_token, "refresh")
    user = db.get(User, user_id) if user_id else None
    if not user or not user.is_active:
        raise UnauthorizedError("Jeton de rafraîchissement invalide ou expiré.")
    return _tokens_for(user)
