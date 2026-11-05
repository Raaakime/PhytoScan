"""Environnement Alembic : outil de migration du schéma de la base de données.

L'URL de la base vient de DATABASE_URL (.env), comme pour l'application : on migre donc
SQLite, PostgreSQL ou MySQL avec exactement les mêmes commandes.

  alembic upgrade head                              -> applique toutes les migrations
  alembic revision --autogenerate -m "description"  -> génère une migration après modification d'un modèle
  alembic downgrade -1                              -> annule la dernière migration
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.db.base import Base
import app.models  # noqa: F401  (enregistre toutes les tables dans Base.metadata)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

DB_URL = get_settings().DATABASE_URL
# Le caractère % est spécial dans alembic.ini : on le double
config.set_main_option("sqlalchemy.url", DB_URL.replace("%", "%%"))

target_metadata = Base.metadata
# SQLite ne sait pas modifier une table existante : Alembic doit alors la reconstruire (mode "batch")
IS_SQLITE = DB_URL.startswith("sqlite")


def run_migrations_offline() -> None:
    """Mode « hors ligne » : produit le SQL sans se connecter (alembic upgrade head --sql)."""
    context.configure(url=DB_URL, target_metadata=target_metadata, literal_binds=True,
                      dialect_opts={"paramstyle": "named"}, compare_type=True, render_as_batch=IS_SQLITE)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Mode normal : se connecte à la base et applique les migrations."""
    connectable = engine_from_config(config.get_section(config.config_ini_section, {}),
                                     prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata,
                          compare_type=True, render_as_batch=IS_SQLITE)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
