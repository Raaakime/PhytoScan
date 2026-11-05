"""Point d'entrée de l'API.  Lancer :  uvicorn app.main:app --reload --port 8000"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401  (enregistre toutes les tables)

settings = get_settings()

# Le dossier doit exister AVANT le montage des fichiers statiques
(settings.UPLOAD_DIR / "scans").mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Actions au démarrage : création des tables (dev) et données de démonstration."""
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)
    if settings.SEED_ON_STARTUP:
        from app.db.seed import run_seed
        run_seed(demo_plants=settings.SEED_DEMO_PLANTS)
    yield


app = FastAPI(title=settings.APP_NAME, version="0.1.0", lifespan=lifespan)

# CORS : autorise le front (Vite, port 5173) à appeler l'API depuis le navigateur
app.add_middleware(
    CORSMiddleware, allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    """Transforme les erreurs métier en réponses JSON : {"detail": "..."}."""
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health", tags=["Système"])
def health():
    """Vérification rapide que l'API fonctionne."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}
# for route in app.routes:
#     print(route.path)

app.include_router(api_router, prefix=settings.API_PREFIX)
# Images enregistrées (ex. /media/scans/xxxx.jpg)
app.mount("/media", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="media")
