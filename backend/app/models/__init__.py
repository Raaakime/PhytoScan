"""Importer tous les modèles ici garantit qu'ils sont enregistrés avant create_all()."""
from app.models.chat import ChatMessage  # noqa: F401
from app.models.disease import Disease, DiseaseTranslation  # noqa: F401
from app.models.plant import Plant, PlantCare, PlantHistory, PlantObservation  # noqa: F401
from app.models.scan import Scan  # noqa: F401
from app.models.user import User  # noqa: F401
