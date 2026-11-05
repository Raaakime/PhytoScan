"""Configuration des tests : base SQLite jetable, créée avant l'import de l'application."""
import io
import os
import tempfile

# Ces variables DOIVENT être définies avant d'importer "app" (les réglages sont lus à l'import)
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["ENVIRONMENT"] = "test"

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app

API = "/phytoscan/v1"


@pytest.fixture(scope="session")
def client():
    # Le "with" déclenche le démarrage de l'app : création des tables + seed
    with TestClient(app) as c:
        yield c


def make_image(kind: str) -> bytes:
    """Fabrique une image de test : 'healthy' = feuille verte unie, 'sick' = feuille verte avec grosses taches brunes."""
    img = Image.new("RGB", (200, 200), (40, 140, 50))
    if kind == "sick":
        d = ImageDraw.Draw(img)
        for x in range(10, 190, 50):
            for y in range(10, 190, 50):
                d.ellipse((x, y, x + 30, y + 30), fill=(140, 80, 30))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
