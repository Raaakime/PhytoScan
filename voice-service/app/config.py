"""Réglages du microservice : variables d'environnement préfixées VOICE_SERVICE_ (ou fichier .env).

Exemple : VOICE_SERVICE_API_TOKEN, VOICE_SERVICE_STT_MODEL, VOICE_SERVICE_DEVICE.
"""
from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="VOICE_SERVICE_", env_file=".env", extra="ignore")

    # --- sécurité ---
    API_TOKEN: SecretStr = SecretStr("")      # même valeur que VOICE_WOLOF_SERVICE_TOKEN côté backend
    ALLOW_NO_AUTH: bool = False               # uniquement pour un essai local ; jamais en production

    # --- moteurs ---
    ENGINE: Literal["hf", "fake"] = "hf"      # "fake" : moteurs factices pour les tests et la CI
    STT_ENABLED: bool = True
    TTS_ENABLED: bool = True
    STT_MODEL: str = "M9and2M/whisper-small-wolof"
    STT_LANGUAGE: str = ""                    # laisser vide : ces modèles Whisper n'ont pas de code « wo » natif
    TTS_MODEL: str = "bilalfaye/speecht5_tts-wolof"
    TTS_VOCODER: str = "microsoft/speecht5_hifigan"
    TTS_SPEAKER_EMBEDDING: str = "/models/speaker.npy"   # voir scripts/fetch_speaker_embedding.py
    DEVICE: str = "auto"                      # auto | cpu | cuda
    HF_TOKEN: SecretStr = SecretStr("")       # nécessaire seulement pour un modèle « gated »

    # --- charge ---
    MAX_CONCURRENT: int = 2                   # inférences simultanées (chaque inférence utilise plusieurs coeurs)
    MAX_AUDIO_SECONDS: float = 35
    MAX_TEXT_CHARS: int = 700

    @model_validator(mode="after")
    def _require_a_token(self):
        if not self.API_TOKEN.get_secret_value() and not self.ALLOW_NO_AUTH:
            raise ValueError("API_TOKEN est obligatoire (ou ALLOW_NO_AUTH=true pour un essai local).")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
