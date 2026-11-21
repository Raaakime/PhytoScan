# Microservice vocal wolof de PhytoScan.
# NON construit pendant le développement (le démon Docker n'était pas lancé) : faites un premier
# `docker compose build` et vérifiez /ready avant toute mise en production. Le code Python qu'il embarque, lui, est testé.
FROM python:3.12-slim

ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu   # GPU : https://download.pytorch.org/whl/cu126

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/hf VOICE_SERVICE_TTS_SPEAKER_EMBEDDING=/models/speaker.npy

WORKDIR /srv
RUN useradd --system --uid 10001 --home-dir /srv voice && mkdir -p /models && chown voice /models

COPY requirements.txt requirements-models.txt ./
RUN pip install --index-url ${TORCH_INDEX} "torch>=2.15,<3" \
 && pip install -r requirements.txt \
 && pip install -r requirements-models.txt

COPY app ./app
COPY scripts ./scripts

USER voice
EXPOSE 8080
VOLUME /models

# Un seul worker : les modèles tiennent en mémoire ; pour absorber plus de trafic, ajoutez des réplicas.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD python -c "import json,urllib.request,sys; r=json.load(urllib.request.urlopen('http://127.0.0.1:8080/ready', timeout=4)); sys.exit(0 if (r['stt'] or r['tts']) else 1)"
