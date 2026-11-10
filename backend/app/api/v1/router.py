"""Assemble toutes les routes de la version 1 de l'API."""
from fastapi import APIRouter

from app.api.v1.endpoints import alerts, assistant, auth, diseases, plants, scans, system, voice

api_router = APIRouter()
api_router.include_router(system.router)
api_router.include_router(auth.router)
api_router.include_router(scans.router)
api_router.include_router(plants.router)
api_router.include_router(diseases.router)
api_router.include_router(assistant.router)
api_router.include_router(alerts.router)
api_router.include_router(voice.router)
