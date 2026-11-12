"""Tests de bout en bout de l'API (base SQLite temporaire)."""
from sqlalchemy import select

from tests.conftest import API, make_image


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


# ---------------- diagnostic ----------------
def test_diagnose_healthy_leaf(client):
    r = client.post(f"{API}/scan/diagnose", files={"image": ("a.jpg", make_image("healthy"), "image/jpeg")})
    body = r.json()
    assert r.status_code == 200
    assert body["status"] == "saine" and body["isHealthy"] is True
    assert body["statusLabel"] == "Plante saine"
    assert isinstance(body["confidence"], float)


def test_diagnose_sick_leaf_contract_fields(client):
    r = client.post(f"{API}/scan/diagnose", files={"image": ("a.jpg", make_image("sick"), "image/jpeg")})
    body = r.json()
    assert body["status"] == "malade" and body["diseaseCode"] == "cercospora"
    # Tous les champs lus par ScanScreen.jsx doivent exister
    for key in ("statusLabel", "diseaseName", "confidence", "pathogen", "severity",
                "recommendations", "comparison", "analysisId"):
        assert key in body
    assert len(body["recommendations"]) >= 3
    assert body["comparison"]["healthyImg"].endswith("comparaison_saine.jpg")


def test_diagnose_language_and_fallback(client):
    img = {"image": ("a.jpg", make_image("sick"), "image/jpeg")}
    en = client.post(f"{API}/scan/diagnose", files=img, params={"lang": "en"}).json()
    assert en["diseaseName"] == "Leaf spot (Cercospora)"
    img = {"image": ("a.jpg", make_image("sick"), "image/jpeg")}
    wo = client.post(f"{API}/scan/diagnose", files=img, params={"lang": "wo"}).json()
    assert wo["diseaseName"].startswith("Tàcc")


def test_diagnose_rejects_non_image(client):
    r = client.post(f"{API}/scan/diagnose", files={"image": ("a.jpg", b"pas une image", "image/jpeg")})
    assert r.status_code == 400


def test_diagnose_hint_forces_result(client):
    r = client.post(f"{API}/scan/diagnose", data={"hint": "mildew"},
                    files={"image": ("a.jpg", make_image("healthy"), "image/jpeg")})
    assert r.json()["diseaseCode"] == "mildew"


def test_scan_history_and_save_to_plant(client):
    scan = client.post(f"{API}/scan/diagnose", data={"hint": "cercospora"},
                       files={"image": ("a.jpg", make_image("healthy"), "image/jpeg")}).json()
    assert client.get(f"{API}/scan/{scan['analysisId']}").status_code == 200
    assert len(client.get(f"{API}/scan/history").json()) >= 1

    before = client.get(f"{API}/plants/P-001").json()
    saved = client.post(f"{API}/scan/{scan['analysisId']}/save", json={"plantId": "P-001"}).json()
    assert saved["status"] == "malade"
    assert saved["history"][0]["type"] == "Scan IA"
    assert len(saved["history"]) == len(before["history"]) + 1


# ---------------- plantes ----------------
def test_plants_seeded_like_mockdata(client):
    plants = client.get(f"{API}/plants").json()
    assert {"P-001", "P-002", "P-003"} <= {p["id"] for p in plants}
    p2 = client.get(f"{API}/plants/P-002").json()
    assert p2["statusLabel"] == "À surveiller"
    assert p2["plantingDate"] == "02 mars 2025"
    assert p2["details"]["soilMoisture"] == "52%"
    assert client.get(f"{API}/plants/P-002", params={"lang": "en"}).json()["plantingDate"] == "02 March 2025"


def test_plant_crud(client):
    r = client.post(f"{API}/plants", json={"name": "Plante test", "species": "Gombo", "plantingDate": "2025-05-01"})
    assert r.status_code == 201
    pid = r.json()["id"]
    assert client.patch(f"{API}/plants/{pid}", json={"status": "surveiller"}).json()["statusLabel"] == "À surveiller"
    assert len(client.post(f"{API}/plants/{pid}/care", json={"task": "Arrosage"}).json()["care"]) == 3
    assert client.post(f"{API}/plants/{pid}/observations", json={"text": "RAS"}).status_code == 201
    assert client.delete(f"{API}/plants/{pid}").status_code == 204
    assert client.get(f"{API}/plants/{pid}").status_code == 404


# ---------------- maladies ----------------
def test_diseases_catalog(client):
    assert len(client.get(f"{API}/diseases").json()) == 4
    assert client.get(f"{API}/diseases/unknown").status_code == 404


def test_wolof_disease_catalog_has_no_missing_fields(client):
    diseases = client.get(f"{API}/diseases", params={"lang": "wo"}).json()
    assert len(diseases) == 4
    for disease in diseases:
        assert disease["name"]
        assert disease["description"]
        assert disease["symptoms"]
        assert disease["remedies"]


def test_seed_backfills_empty_wolof_translation_fields(client):
    from app.db.seed import seed_diseases
    from app.db.session import SessionLocal
    from app.models import Disease

    with SessionLocal() as db:
        cercospora = db.scalar(select(Disease).where(Disease.code == "cercospora"))
        translation = next(item for item in cercospora.translations if item.lang == "wo")
        translation.symptoms = []
        db.commit()

        seed_diseases(db)
        db.refresh(translation)
        assert translation.symptoms


# ---------------- assistant ----------------
def test_assistant_answers_in_three_languages(client):
    fr = client.post(f"{API}/assistant/ask", json={"question": "Quelle est la santé de la plante 2 ?", "language": "fr"}).json()
    assert "Aubergine" in fr["text"] and "surveiller" in fr["text"].lower()
    en = client.post(f"{API}/assistant/ask", json={"question": "How do I treat Cercospora leaf spot?", "language": "en"}).json()
    assert "Cercospora" in en["text"]
    wo = client.post(f"{API}/assistant/ask", json={"question": "Naka la wàllu garab 2 gi deme ?", "language": "wo"}).json()
    assert "Batañse" in wo["text"] or "Aubergine" in wo["text"]
    hist = client.get(f"{API}/assistant/history", params={"session_id": fr["sessionId"]}).json()
    assert [m["sender"] for m in hist["messages"]] == ["user", "bot"]


def test_wolof_assistant_recognizes_diacritics_and_common_intents(client):
    plant = client.post(
        f"{API}/assistant/ask",
        json={"question": "Naka la wàllu garab 2 gi deme ?", "language": "wo"},
    ).json()
    assert "Aubergine" in plant["text"]
    assert "À surveiller" not in plant["text"]

    disease = client.post(
        f"{API}/assistant/ask",
        json={"question": "Nan lañuy fajee tàcc yu ñuul ci xobi tomate ?", "language": "wo"},
    ).json()
    assert "Ngir faj" in disease["text"]
    assert "Pour traiter" not in disease["text"]

    sick = client.post(
        f"{API}/assistant/ask",
        json={"question": "Ban garab ñoo feebar leegi ?", "language": "wo"},
    ).json()
    assert "Garab yi ñu war a saytu" in sick["text"]


# ---------------- authentification ----------------
def test_auth_flow(client):
    creds = {
        "email": "Awa@Example.com",
        "password": "motdepasse123",
        "fullName": "Awa",
        "farmName": "Ferme des Niayes",
        "agriculturalRole": "Maraîcher / Exploitant Agricole",
        "preferredLang": "wo",
    }
    registered = client.post(f"{API}/auth/register", json=creds)
    assert registered.status_code == 201
    assert registered.json()["farmName"] == creds["farmName"]
    assert registered.json()["agriculturalRole"] == creds["agriculturalRole"]
    assert registered.json()["preferredLang"] == "wo"
    assert client.post(f"{API}/auth/register", json=creds).status_code == 409   # e-mail déjà pris

    bad = client.post(f"{API}/auth/login", data={"username": "awa@example.com", "password": "faux"})
    assert bad.status_code == 401

    tokens = client.post(f"{API}/auth/login", data={"username": "awa@example.com", "password": "motdepasse123"}).json()
    auth = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert client.get(f"{API}/auth/me", headers=auth).json()["email"] == "awa@example.com"
    assert client.get(f"{API}/auth/me").status_code == 401                          # /me exige toujours un compte
    assert client.get(f"{API}/auth/me", headers={"Authorization": "Bearer xxx"}).status_code == 401

    new = client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).json()
    assert "access_token" in new
    # Un jeton d'accès ne doit pas pouvoir servir de jeton de rafraîchissement
    assert client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["access_token"]}).status_code == 401

    # Isolation : cet utilisateur ne voit pas les plantes de démonstration, mais voit les siennes
    assert client.get(f"{API}/plants", headers=auth).json() == []
    mine = client.post(f"{API}/plants", headers=auth, json={"name": "Ma plante", "species": "Mil"}).json()
    assert [p["id"] for p in client.get(f"{API}/plants", headers=auth).json()] == [mine["id"]]
    assert client.get(f"{API}/plants/{mine['id']}").status_code == 404              # invisible en anonyme


# ---------------- ajouts du lot 2 ----------------
def test_health_under_api_prefix_for_config_modal(client):
    """OctopusConfigModal appelle {baseUrl}/health."""
    body = client.get(f"{API}/health").json()
    assert body["status"] == "ok" and body["mlBackend"] == "mock"


def test_plant_fields_never_null_for_front(client):
    """PlantRecordsScreen appelle plot.toLowerCase() : plot ne doit jamais être null."""
    created = client.post(f"{API}/plants", json={"name": "Sans parcelle", "species": "Mil"}).json()
    assert created["plot"] == "" and created["variety"] == ""
    assert created["image"] == "/assets/plante_1.jpg" and created["healthScore"] == 100
    assert created["details"]["soilMoisture"] == "62%"
    assert created["history"][0]["type"] == "Enregistrement" and len(created["observations"]) == 1
    client.delete(f"{API}/plants/{created['id']}")


def test_save_diagnostic_front_payload(client):
    """Format exact de onSaveDiagnosticToPlant : confidence en texte, date jj/mm/aaaa, sans analysisId."""
    r = client.post(f"{API}/plants/P-001/diagnostics",
                    json={"plantId": "P-001", "diseaseName": "Tache foliaire (Cercospora)",
                          "confidence": "96.4%", "date": "23/04/2025"})
    assert r.status_code == 201
    plant = r.json()
    assert plant["status"] == "malade" and plant["alert"]
    entry = next(h for h in plant["history"] if h["date"] == "23 avril 2025" and h["type"] == "Scan IA"
                 and h["result"].startswith("Tache foliaire"))
    assert entry["result"] == "Tache foliaire (Cercospora) (96.4%)"
    # Nom inconnu : l'historique est écrit mais l'état n'est pas modifié
    r2 = client.post(f"{API}/plants/P-002/diagnostics", json={"diseaseName": "Maladie inconnue", "confidence": 50})
    assert r2.status_code == 201 and r2.json()["status"] == "surveiller"


def test_alerts_computed_from_plants(client):
    data = client.get(f"{API}/alerts").json()
    assert data["count"] == len(data["alerts"]) >= 2
    levels = [a["level"] for a in data["alerts"]]
    assert levels == sorted(levels, key=lambda l: l != "danger")      # danger en premier
    p2 = next(a for a in data["alerts"] if a["plantId"] == "P-002")
    assert p2["title"] == "Plante 2 (Aubergine) — Parcelle B1"


def test_assistant_front_generated_queries(client):
    """Requêtes longues générées par les boutons des écrans."""
    ask = lambda q, lang="fr": client.post(f"{API}/assistant/ask", json={"question": q, "language": lang}).json()["text"]
    # Bouton « Demander le protocole » (PlantRecordsScreen) : plante + remèdes déduits de l'alerte
    t = ask('Alerte sur Plante 2 (Aubergine) : "Premiers signes d\'oïdium et jaunissement léger". Quels remèdes et protocoles appliquer immédiatement ?')
    assert "Aubergine" in t and "Oïdium" in t and "bicarbonate" in t
    # Bouton « Consulter l'Assistant » : soins d'une plante nommée
    t = ask('Quels sont les soins et recommandations pour ma plante "Plante 1" (Tomate) en parcelle "Parcelle A3" ?')
    assert "Soins prévus" in t and "Arrosage matinal" in t
    # Bouton de ScanScreen
    t = ask('Comment traiter efficacement la maladie "Tache foliaire (Cercospora)" (Cercospora capsici / solani) détectée lors de mon diagnostic ?')
    assert "Tache foliaire" in t and "bouillie bordelaise" in t


def test_assistant_suggestions_and_languages(client):
    assert len(client.get(f"{API}/assistant/suggestions", params={"language": "wo"}).json()["questions"]) == 4
    assert [l["code"] for l in client.get(f"{API}/assistant/languages").json()] == ["fr", "wo", "en"]
