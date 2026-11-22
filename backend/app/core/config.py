"""Configuration centrale de l'application.

Toutes les valeurs viennent des variables d'environnement (ou du fichier .env).
Pour changer de base de données ou de modèle IA, on modifie le .env : jamais le code.
"""
from functools import lru_cache
from pathlib import Path
from typing import List, Literal

from pydantic import SecretStr, model_validator
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
    # "mock" = réponses à base de règles (gratuit, sans clé) ; "gemini" = LLM Gemini, avec repli sur les règles
    ASSISTANT_BACKEND: Literal["mock", "gemini"] = "mock"
    ASSISTANT_LLM_LANGUAGES: str = "fr,en"        # langues confiées au LLM ; les autres (wolof) restent sur les règles
    ASSISTANT_LLM_RATE_PER_MINUTE: int = 10       # par utilisateur connecté (0 = illimité) ; au-delà : réponse par règles
    ASSISTANT_LLM_DAILY_QUOTA: int = 200
    ASSISTANT_LLM_MAX_CHARS: int = 700            # une réponse lue à voix haute doit rester courte

    # --- Assistant vocal (voir backend/README.md, section « Assistant vocal ») ---
    VOICE_ENABLED: bool = False
    VOICE_MAX_AUDIO_MB: int = 8
    VOICE_MAX_AUDIO_SECONDS: int = 30            # durée max d'une question parlée
    VOICE_MIN_AUDIO_SECONDS: float = 0.4
    VOICE_TTS_MAX_CHARS: int = 600               # texte lu à voix haute : au-delà, coupé à la dernière phrase entière
    VOICE_MAX_CONCURRENT: int = 4                # requêtes vocales traitées en même temps par processus
    VOICE_RATE_LIMIT_PER_MINUTE: int = 6         # par utilisateur (0 = illimité)
    VOICE_DAILY_QUOTA: int = 100                 # par utilisateur et par jour (0 = illimité)
    VOICE_TTS_CACHE_ENTRIES: int = 128
    VOICE_PROVIDER_TIMEOUT_SECONDS: float = 30

    # Français / anglais : « gemini » (une clé pour la voix et l'assistant), « openai » = toute API compatible OpenAI
    # (OpenAI, passerelle interne, freellmapi en développement), « elevenlabs » pour la voix seulement.
    VOICE_STT_PROVIDER: Literal["gemini", "openai", "none"] = "gemini"
    VOICE_TTS_PROVIDER: Literal["gemini", "openai", "elevenlabs", "none"] = "gemini"
    VOICE_OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    VOICE_OPENAI_API_KEY: SecretStr = SecretStr("")
    VOICE_STT_MODEL: str = "gpt-4o-mini-transcribe"
    VOICE_STT_PROMPT_FR: str = (
        "Assistant agricole PhytoScan. Vocabulaire : plante 1, plante 2, parcelle, tomate, poivron, "
        "aubergine, mildiou, oïdium, cercospora, arrosage, traitement, feuilles."
    )
    VOICE_STT_PROMPT_EN: str = (
        "PhytoScan farming assistant. Vocabulary: plant 1, plant 2, plot, tomato, pepper, eggplant, "
        "mildew, powdery mildew, cercospora, watering, treatment, leaves."
    )
    VOICE_TTS_MODEL: str = "gpt-4o-mini-tts"
    VOICE_TTS_VOICE: str = "nova"
    # Consignes de diction envoyées aux modèles qui les acceptent (gpt-4o-mini-tts). Vide pour tts-1.
    VOICE_TTS_INSTRUCTIONS_FR: str = (
        "Parle en français avec une diction très claire, un rythme posé et un ton chaleureux de conseiller agricole."
    )
    VOICE_TTS_INSTRUCTIONS_EN: str = (
        "Speak English with very clear diction, a calm pace and the warm tone of a farm advisor."
    )
    ELEVENLABS_API_KEY: SecretStr = SecretStr("")
    ELEVENLABS_VOICE_ID: str = ""
    ELEVENLABS_TTS_MODEL: str = "eleven_multilingual_v2"

    # --- Gemini (reconnaissance, voix et assistant) : https://aistudio.google.com/ ---
    # ATTENTION : avec l'offre GRATUITE, Google peut utiliser les contenus envoyés (dont les voix) pour améliorer ses
    # produits. Pour de vrais utilisateurs, activez la facturation (offre payante : contenus non utilisés).
    GEMINI_API_KEY: SecretStr = SecretStr("")
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_TIMEOUT_SECONDS: float = 20
    GEMINI_LLM_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_LLM_THINKING_LEVEL: str = "minimal"    # latence minimale ; « low » pour gemini-3.8-flash (« minimal » non pris en charge)
    GEMINI_LLM_MAX_OUTPUT_TOKENS: int = 600       # compte aussi les « pensées » du modèle
    GEMINI_STT_MODEL: str = "gemini-3.5-transcribe"
    GEMINI_STT_VOCABULARY: str = (
        "plante, parcelle, tomate, poivron, aubergine, piment, oignon, mildiou, oïdium, cercospora, "
        "arrosage, traitement, feuilles, PhytoScan"
    )
    GEMINI_TTS_MODEL: str = "gemini-3.8-flash-tts"
    GEMINI_TTS_VOICE: str = "Erinome"             # voix « Clear » ; autres : Sulafat (chaleureuse), Achird (amicale)...
    GEMINI_TTS_STYLE_FR: str = "voix calme, très claire et chaleureuse d'un conseiller agricole, diction posée"
    GEMINI_TTS_STYLE_EN: str = "calm, very clear and warm voice of a farm advisor, steady pace"

    # Wolof : microservice d'inférence « voice-service » (modèles ouverts auto-hébergés).
    VOICE_WOLOF_SERVICE_URL: str = ""            # ex. http://voice-service:8080 ; vide = wolof vocal désactivé
    VOICE_WOLOF_SERVICE_TOKEN: SecretStr = SecretStr("")
    VOICE_WOLOF_TIMEOUT_SECONDS: float = 45

    # --- Images de comparaison (servies par le front dans /public/assets) ---
    COMPARISON_HEALTHY_IMG: str = "/assets/comparaison_saine.jpg"
    COMPARISON_INFECTED_IMG: str = "/assets/comparaison_malade.jpg"

    @model_validator(mode="after")
    def _refuse_default_secret_in_prod(self):
        """Garde-fou : en production, on refuse de démarrer avec la clé secrète par défaut."""
        if self.ENVIRONMENT == "prod" and self.SECRET_KEY.startswith("dev-secret"):
            raise ValueError("SECRET_KEY par défaut interdite en production : définissez une valeur longue et aléatoire.")
        if self.ASSISTANT_BACKEND == "gemini" and not self.GEMINI_API_KEY.get_secret_value():
            raise ValueError("ASSISTANT_BACKEND=gemini exige GEMINI_API_KEY (ou repassez ASSISTANT_BACKEND=mock).")
        return self


@lru_cache
def get_settings() -> Settings:
    """Instance unique des réglages (mise en cache pour ne lire le .env qu'une fois)."""
    return Settings()