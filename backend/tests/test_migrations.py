"""Vérifie que les migrations Alembic fonctionnent et restent synchronisées avec les modèles."""
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _alembic(args, db_url):
    """Lance Alembic dans un sous-processus avec sa propre base de données."""
    env = {**os.environ, "DATABASE_URL": db_url}
    return subprocess.run([sys.executable, "-m", "alembic", *args], cwd=ROOT, env=env,
                          capture_output=True, text=True)


def test_migrations_up_no_drift_and_down(tmp_path):
    url = f"sqlite:///{tmp_path / 'migration.db'}"
    up = _alembic(["upgrade", "head"], url)
    assert up.returncode == 0, up.stderr
    # "check" échoue si un modèle a changé SANS migration correspondante : pense à générer la migration !
    check = _alembic(["check"], url)
    assert check.returncode == 0, check.stdout + check.stderr
    down = _alembic(["downgrade", "base"], url)
    assert down.returncode == 0, down.stderr


def test_prod_refuses_default_secret():
    from app.core.config import Settings
    with pytest.raises(ValueError):
        Settings(_env_file=None, ENVIRONMENT="prod", SECRET_KEY="dev-secret-a-changer")
    # Une vraie clé est acceptée
    Settings(_env_file=None, ENVIRONMENT="prod", SECRET_KEY="x" * 40)
