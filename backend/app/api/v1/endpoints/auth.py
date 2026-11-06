"""Routes d'authentification : /auth/register, /auth/login, /auth/refresh, /auth/me."""
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.session import get_db
from app.models import User
from app.schemas.user import RefreshRequest, TokenPair, UserCreate, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Crée un compte utilisateur."""
    return auth_service.register_user(db, data)


@router.post("/login", response_model=TokenPair)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Connexion (formulaire OAuth2 standard : champs `username` = e-mail, et `password`)."""
    return auth_service.login(db, form.username, form.password)


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    """Renouvelle les jetons à partir du refresh_token."""
    return auth_service.refresh(db, data.refresh_token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(require_user)):
    """Profil de l'utilisateur connecté."""
    return user
