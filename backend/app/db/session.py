"""Moteur de base de données et sessions.

L'URL (DATABASE_URL) décide du type de base : SQLite, PostgreSQL ou MySQL.
Le reste du code ne change jamais.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()

# SQLite impose une option spéciale pour être utilisé par plusieurs threads (FastAPI en utilise plusieurs)
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping : teste la connexion avant usage (évite les erreurs "connexion perdue" sur MySQL/PostgreSQL)
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    """Dépendance FastAPI : ouvre une session par requête et la ferme toujours à la fin."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
