"""Configuration centrale de l'application.

Toutes les valeurs viennent des variables d'environnement (ou du fichier .env).
Pour changer de base de données ou de modèle IA, on modifie le .env : jamais le code.
"""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Dossier racine du back (celui qui contient "app/", "uploads/", ".env"...)
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Lit le fichier .env à la racine du back ; ignore les variables inconnues
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    # --- Général ---
    APP_NAME: str = "PhytoScan AI - API"
    ENVIRONMENT: str = "dev"  # "dev" | "test" | "prod"
    # Même préfixe que le baseUrl du front (octopusApi.js) : http://localhost:8000/phytoscan/v1
    API_PREFIX: str = "/phytoscan/v1"

    # --- Base de données ---
    # SQLite par défaut (tests). En production : PostgreSQL ou MySQL (voir .env.example).
    DATABASE_URL: str = f"sqlite:///{(BASE_DIR / 'phytoscan.db').as_posix()}"
    AUTO_CREATE_TABLES: bool = True   # Crée les tables au démarrage (pratique en dev, remplacé par Alembic en prod)
    SEED_ON_STARTUP: bool = True      # Insère au démarrage les données de RÉFÉRENCE (maladies + traductions), sans doublon
    SEED_DEMO_PLANTS: bool = True     # Insère aussi les 3 plantes de démonstration (à mettre à false en production)

    # --- Sécurité / JWT ---
    SECRET_KEY: str = "dev-secret-a-changer-en-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # False = les routes restent ouvertes (le front n'a pas encore de connexion).
    # True  = un jeton valide est obligatoire partout où l'on utilise get_current_user.
    AUTH_REQUIRED: bool = False

    # --- CORS : origines autorisées à appeler l'API (Vite peut basculer de 5173 à 5174) ---
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ]

    # --- Fichiers uploadés ---
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_MB: int = 8

    # --- Intelligence artificielle ---
    ML_MODEL_BACKEND: str = "mock"    # "mock" = classifieur de test ; "custom" = votre vrai modèle
    ML_MODEL_NAME: str = "octopus-vision-mock"
    ML_MODEL_PATH: Path = BASE_DIR / "app" / "ml" / "weights" / "model.onnx"
    ML_LABELS_PATH: Path = BASE_DIR / "app" / "ml" / "labels.json"
    ASSISTANT_BACKEND: str = "mock"   # "mock" = réponses à base de règles ; extensible vers un LLM

    # --- Assistant vocal (désactivé tant que les clés fournisseurs ne sont pas configurées) ---
    VOICE_ENABLED: bool = False
    VOICE_MAX_AUDIO_MB: int = 8
    VOICE_MAX_AUDIO_SECONDS: int = 60
    VOICE_PROVIDER_TIMEOUT_SECONDS: int = 45
    VOICE_STT_PROVIDER: str = "openai"
    VOICE_TTS_PROVIDER: str = "elevenlabs"
    OPENAI_API_KEY: str = ""
    OPENAI_STT_MODEL: str = "gpt-transcribe"
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""
    ELEVENLABS_TTS_MODEL: str = "eleven_v4_turbo"
    WOLOF_TTS_ENABLED: bool = False
    HF_TOKEN: str = ""
    WOLOF_TTS_MODEL_CONFIG: str = "hf://abdazizsall/wolof-pocket-tts/config.yaml"
    WOLOF_TTS_VOICE_PROMPT: str = ""

    # --- Images de comparaison (servies par le front dans /public/assets) ---
    COMPARISON_HEALTHY_IMG: str = "/assets/comparaison_saine.jpg"
    COMPARISON_INFECTED_IMG: str = "/assets/comparaison_malade.jpg"

    @model_validator(mode="after")
    def _refuse_default_secret_in_prod(self):
        """Garde-fou : en production, on refuse de démarrer avec la clé secrète par défaut."""
        if self.ENVIRONMENT == "prod" and self.SECRET_KEY.startswith("dev-secret"):
            raise ValueError("SECRET_KEY par défaut interdite en production : définissez une valeur longue et aléatoire.")
        return self


@lru_cache
def get_settings() -> Settings:
    """Instance unique des réglages (mise en cache pour ne lire le .env qu'une fois)."""
    return Settings()
