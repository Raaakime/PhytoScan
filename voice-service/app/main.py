"""Microservice d'inférence vocale wolof de PhytoScan.

    POST /v1/transcribe   WAV 16 kHz mono 16 bits  ->  {"text": "..."}
    POST /v1/synthesize   {"text": "..."}          ->  audio/wav
    GET  /health          le processus répond (liveness)
    GET  /ready           les moteurs sont chargés (readiness)

Les modèles sont chargés AVANT d'accepter du trafic ; un échec de chargement arrête le service (message clair
dans les journaux) au lieu de répondre en erreur à chaque requête.
"""
import hmac
import logging
import threading
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.audio import AudioFormatError, finalize_speech, read_wav, write_wav
from app.config import Settings, get_settings
from app.engines import Engines, build_engines

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("voice-service")


class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    started = time.perf_counter()
    app.state.engines = build_engines(settings)
    app.state.gate = threading.BoundedSemaphore(max(1, settings.MAX_CONCURRENT))
    log.info("Moteurs prêts en %.1f s (stt=%s tts=%s)", time.perf_counter() - started,
             app.state.engines.stt is not None, app.state.engines.tts is not None)
    yield


app = FastAPI(title="PhytoScan voice-service", version="1.0.0", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None)   # service interne : pas de documentation publique


def require_token(request: Request, settings: Settings = Depends(get_settings)) -> None:
    expected = settings.API_TOKEN.get_secret_value()
    if not expected:   # ALLOW_NO_AUTH (garanti par la validation des réglages)
        return
    header = request.headers.get("authorization", "")
    supplied = header[7:] if header.lower().startswith("bearer ") else ""
    if not hmac.compare_digest(supplied.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Jeton invalide.", headers={"WWW-Authenticate": "Bearer"})


def engines(request: Request) -> Engines:
    return request.app.state.engines


class _Slot:
    """Refuse tout de suite quand tous les moteurs sont occupés : le backend réessaie ou bascule sur le texte."""

    def __init__(self, request: Request):
        self._gate = request.app.state.gate

    def __enter__(self):
        if not self._gate.acquire(blocking=False):
            raise HTTPException(status_code=503, detail="Service occupé, réessayez dans un instant.",
                                headers={"Retry-After": "3"})

    def __exit__(self, *exc):
        self._gate.release()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready(loaded: Engines = Depends(engines)):
    return {"stt": loaded.stt is not None, "tts": loaded.tts is not None}


@app.post("/v1/transcribe", dependencies=[Depends(require_token)])
def transcribe(request: Request, file: UploadFile = File(...), loaded: Engines = Depends(engines),
               settings: Settings = Depends(get_settings)):
    if loaded.stt is None:
        raise HTTPException(status_code=503, detail="Reconnaissance vocale désactivée sur ce service.")
    max_bytes = int(settings.MAX_AUDIO_SECONDS * 16_000 * 2) + 4096
    data = file.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="Audio trop volumineux.")
    try:
        samples = read_wav(data, settings.MAX_AUDIO_SECONDS)
    except AudioFormatError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    with _Slot(request):
        started = time.perf_counter()
        text = loaded.stt.transcribe(samples)
        elapsed = time.perf_counter() - started
    log.info("transcribe audio=%.1fs chars=%d elapsed=%.2fs", samples.size / 16_000, len(text), elapsed)
    return {"text": text, "durationSeconds": round(samples.size / 16_000, 2), "elapsedMs": int(elapsed * 1000)}


@app.post("/v1/synthesize", dependencies=[Depends(require_token)])
def synthesize(request: Request, body: SynthesisRequest, loaded: Engines = Depends(engines),
               settings: Settings = Depends(get_settings)):
    if loaded.tts is None:
        raise HTTPException(status_code=503, detail="Synthèse vocale désactivée sur ce service.")
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Texte vide.")
    if len(text) > settings.MAX_TEXT_CHARS:
        raise HTTPException(status_code=413, detail=f"Texte trop long (maximum {settings.MAX_TEXT_CHARS} caractères).")

    with _Slot(request):
        started = time.perf_counter()
        samples = finalize_speech(loaded.tts.synthesize(text), loaded.tts.sample_rate)
        elapsed = time.perf_counter() - started
    if samples.size == 0:
        raise HTTPException(status_code=502, detail="Le modèle n'a produit aucun son.")
    seconds = samples.size / loaded.tts.sample_rate
    log.info("synthesize chars=%d audio=%.1fs elapsed=%.2fs rtf=%.2f", len(text), seconds, elapsed, elapsed / seconds)
    return Response(content=write_wav(samples, loaded.tts.sample_rate), media_type="audio/wav",
                    headers={"X-Audio-Seconds": f"{seconds:.2f}"})
