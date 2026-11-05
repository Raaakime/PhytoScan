"""Route d'état du serveur, utilisée par le bouton « Tester la connectivité » de OctopusConfigModal."""
from fastapi import APIRouter

from app.core.config import get_settings
from app.ml import get_classifier

router = APIRouter(tags=["Système"])


@router.get("/health")
def health():
    """Renvoie l'état de l'API et du modèle IA actif (mock ou custom)."""
    settings = get_settings()
    classifier = get_classifier()
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "mlBackend": classifier.name,                 # "mock" ou "custom"
        "modelName": settings.ML_MODEL_NAME,
        "authRequired": settings.AUTH_REQUIRED,
    }
