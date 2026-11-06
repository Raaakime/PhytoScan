# Image de production du back PhytoScan (NON testée dans l'environnement de développement : à valider chez vous)
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# Dépendances d'abord (meilleur cache Docker)
COPY requirements.txt requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY . .
EXPOSE 8000

# 1) applique les migrations, 2) lance l'API
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
