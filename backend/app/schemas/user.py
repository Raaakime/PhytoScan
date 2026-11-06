"""Schémas d'authentification et d'utilisateur."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import CamelModel


class UserCreate(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)   # 72 = limite de bcrypt
    full_name: Optional[str] = Field(default=None, max_length=120)
    farm_name: Optional[str] = Field(default=None, max_length=160)
    agricultural_role: Optional[str] = Field(default=None, max_length=120)
    preferred_lang: str = "fr"


class UserOut(CamelModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    farm_name: Optional[str] = None
    agricultural_role: Optional[str] = None
    preferred_lang: str
    role: str
    created_at: datetime


class TokenPair(BaseModel):
    """Réponse de connexion. Les noms suivent la convention OAuth2 (snake_case)."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
