"""Données de démonstration, reprises de mockData.js et octopusApi.js.

Lancer à la main :  python -m app.db.seed
Le script est IDEMPOTENT : il n'ajoute que ce qui manque (on peut le relancer sans doublons).

ATTENTION wolof : les traductions de démonstration sont des ébauches ; elles doivent être
validées par un locuteur wolof et un agronome avant toute utilisation en production.
"""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import (Disease, DiseaseTranslation, Plant, PlantCare, PlantHistory,
                        PlantObservation)

# ======================================================================
# MALADIES (clé = code technique renvoyé par le modèle IA)
# ======================================================================
DISEASES = {
    "healthy": {
        "is_healthy": True,
        "severity_level": "none",
        "translations": {
            "fr": {
                "name": "Plante saine", "pathogen": "Aucun", "severity_label": "Nulle",
                "description": "La plante présente une vigueur optimale, une photosynthèse efficace et aucun signe d'attaque parasitaire ou cryptogamique.",
                "symptoms": ["Couleur vert profond homogène", "Nervures et limbe bien formés",
                             "Absence de taches, parasites ou déformations"],
                "remedies": ["Poursuivre la conduite culturale actuelle",
                             "Poursuivre le programme de fertilisation et d'arrosage actuel",
                             "Contrôle préventif recommandé dans 7 jours",
                             "Maintenir une veille sanitaire régulière via PhytoScan AI"],
                "healthy_comparison": "Feuille témoin indemne de toute nécrose.",
            },
            "en": {
                "name": "Healthy plant", "pathogen": "None", "severity_label": "None",
                "description": "The plant shows optimal vigour, efficient photosynthesis and no sign of pest or fungal attack.",
                "symptoms": ["Uniform deep green colour", "Well-formed veins and leaf blade",
                             "No spots, pests or deformations"],
                "remedies": ["Continue the current cultivation practices",
                             "Keep the current fertilisation and watering programme",
                             "Preventive check recommended in 7 days",
                             "Keep up regular health monitoring with PhytoScan AI"],
                "healthy_comparison": "Reference leaf free of any necrosis.",
            },
            "wo": {
                "name": "Garab gu wér", "pathogen": "Amul",
                "severity_label": "Dara jafe-jafe",
                "description": "Garab gi dafay màgg bu baax te amul màndarga yu feeñu yu wone feebar walla njaxlaf.",
                "symptoms": ["Xob yi ñuul nañu te leer", "Xob yi ak seeni rëdd am nañu seen melokaan",
                             "Amul bàq yu ñuul, njaxlaf walla xob yu soppiku"],
                "remedies": ["Wéyal ni ngay topatoo garab gi tey",
                             "Wéyal ndox ak meññeef yi nga di joxe",
                             "Xoolaat garab gi ci ay fan ngir seet lu bees",
                             "Saytu garab gi saa su nekk"],
                "healthy_comparison": "Xob mu wér te amul bàq yu ñuul.",
            },
        },
    },
    "cercospora": {
        "is_healthy": False,
        "severity_level": "high",
        "translations": {
            "fr": {
                "name": "Tache foliaire (Cercospora)", "pathogen": "Cercospora capsici / solani",
                "severity_label": "Élevée",
                "description": "Présence de lésions circulaires brunes bordées d'un halo chlorotique caractéristique de l'infection fongique Cercospora.",
                "symptoms": ["Taches nécrotiques circulaires sur les feuilles",
                             "Halo jaune vif entourant les lésions",
                             "Dessèchement et chute précoce des feuilles basses"],
                "remedies": ["Supprimer et incinérer sans délai les feuilles fortement atteintes",
                             "Éviter absolument d'arroser le feuillage (arroser au sol)",
                             "Pulvériser un traitement antifongique bio (bouillie bordelaise ou décoction de prêle) sous 24h",
                             "Désinfecter les outils de taille à l'alcool 70°"],
                "healthy_comparison": "Plante saine : cuticule verte homogène.",
                "infected_comparison": "Plante malade : taches nécrotiques concentriques.",
            },
            "en": {
                "name": "Leaf spot (Cercospora)", "pathogen": "Cercospora capsici / solani",
                "severity_label": "High",
                "description": "Circular brown lesions surrounded by a chlorotic halo, typical of Cercospora fungal infection.",
                "symptoms": ["Circular necrotic spots on leaves", "Bright yellow halo around the lesions",
                             "Drying and early drop of lower leaves"],
                "remedies": ["Remove and burn heavily infected leaves immediately",
                             "Never water the foliage (water at soil level)",
                             "Spray an organic fungicide (Bordeaux mixture or horsetail decoction) within 24h",
                             "Disinfect pruning tools with 70% alcohol"],
                "healthy_comparison": "Healthy plant: uniform green cuticle.",
                "infected_comparison": "Diseased plant: concentric necrotic spots.",
            },
            # Ébauches wolof à faire valider par un locuteur et un agronome avant production.
            "wo": {
                "name": "Tàcc yu ñuul ci xob (Cercospora)", "pathogen": "Cercospora capsici / solani",
                "severity_label": "Ndaw ju mag",
                "description": "Tàcc yu ñuul ci xob yi, ak melo wu mboq : kon feebar bu sòrli ci Cercospora la.",
                "symptoms": ["Bàq yu weex-ñuul te wër xob yi", "Melo wu mboq ci wet bàq yi",
                             "Xob yu suufe yi dañuy wow te rot"],
                "remedies": ["Daggël xob yi feebar te jële leen ci tool bi",
                             "Bul tóol ndox ci kaw xob yi; tóol ko ci suuf, ci wetu reen yi",
                             "Su feebar bi yokkee, laajal ndimbal ci garab bu ñu may ci réew mi",
                             "Raxas jumtukaay yi ginnaaw boo daggee xob yi"],
                "healthy_comparison": "Xob mu wér, wu ñuul te amul bàq.",
                "infected_comparison": "Xob bu am bàq yu ñuul yu wër-wër.",
            },
        },
    },
    "mildew": {
        "is_healthy": False,
        "severity_level": "very_high",
        "translations": {
            "fr": {
                "name": "Mildiou (Phytophthora infestans)", "pathogen": "Oomycète fongique",
                "severity_label": "Très élevée",
                "description": "Maladie fulgurante créant des taches huileuses brun-vert devenant brunes et desséchées avec feutrage blanc au revers.",
                "symptoms": ["Taches huileuses sur la face supérieure", "Duvet blanc/grisâtre au dos de la feuille",
                             "Nécrose rapide des tiges et fruits"],
                "remedies": ["Couper immédiatement les parties touchées",
                             "Aérer les serres et espacer les plants", "Traitement au cuivre avant la pluie"],
            },
            "en": {
                "name": "Late blight (Phytophthora infestans)", "pathogen": "Fungal-like oomycete",
                "severity_label": "Very high",
                "description": "Fast-spreading disease causing oily green-brown spots that turn brown and dry, with white fuzz underneath.",
                "symptoms": ["Oily spots on the upper side", "White/greyish down on the underside of the leaf",
                             "Rapid necrosis of stems and fruits"],
                "remedies": ["Cut off affected parts immediately", "Ventilate greenhouses and space the plants",
                             "Apply copper treatment before rain"],
            },
            "wo": {
                "name": "Mildiou (Phytophthora infestans)", "pathogen": "Phytophthora infestans",
                "severity_label": "Feebar bu metti lool",
                "description": "Feebar bii dafay law gaaw. Dafay tàmbalee ak bàq yu ni mel ni diw ci xob yi, te mujj wow; ci suuf xob yi mën na am melokaanu poof bu weex.",
                "symptoms": ["Bàq yu ni mel ni diw ci kaw xob yi", "Poof bu weex walla mboq ci suuf xob yi",
                             "Xob yi, bant yi ak meññeef yi mën nañu wow gaaw"],
                "remedies": ["Daggël te jële yeneen yëf yi feebar bi laal",
                             "Ubbi bérab bi ngelaw man a jaar, te sori garab yi",
                             "Jëfandikoo garab bu am cuuru bu ñu may ci réew mi; laajal ku xam garab yi"],
            },
        },
    },
    # Oïdium : cité dans la fiche de la plante 2 (aubergine). Contenu rédigé pour le test, à faire valider par un agronome.
    "powdery_mildew": {
        "is_healthy": False,
        "severity_level": "medium",
        "translations": {
            "fr": {
                "name": "Oïdium", "pathogen": "Erysiphales (champignon)", "severity_label": "Moyenne",
                "description": "Voile blanchâtre poudreux sur les feuilles, favorisé par une humidité élevée, pouvant s'étendre rapidement.",
                "symptoms": ["Voile blanc poudreux sur les feuilles", "Jaunissement léger des feuilles inférieures",
                             "Déformation et dessèchement des feuilles atteintes"],
                "remedies": ["Traiter au bicarbonate ou au soufre sous 24h", "Aérer les rangs et réduire l'humidité",
                             "Retirer les feuilles les plus atteintes"],
            },
            "en": {
                "name": "Powdery mildew", "pathogen": "Erysiphales (fungus)", "severity_label": "Medium",
                "description": "Powdery whitish film on leaves, favoured by high humidity and able to spread quickly.",
                "symptoms": ["Powdery white film on leaves", "Slight yellowing of lower leaves",
                             "Deformation and drying of affected leaves"],
                "remedies": ["Treat with baking soda or sulphur within 24h", "Ventilate rows and reduce humidity",
                             "Remove the most affected leaves"],
            },
            "wo": {
                "name": "Oïdium (feebar bu weex ci xob)", "pathogen": "Erysiphales",
                "severity_label": "Feebar bu tollu",
                "description": "Melo mu weex ni powder dafay feeñ ci kaw xob yi. Tàngoor ak tooy mën nañu tax mu law gaaw.",
                "symptoms": ["Melo mu weex ni powder ci xob yi", "Xob yu suufe yi dañuy ñuul tuuti",
                             "Xob yi mën nañu soppiku te wow"],
                "remedies": ["Jëfandikoo bicarbonate walla soufre bu ñu may ci réew mi; laajal ku xam garab yi",
                             "Ubbi bérab bi ngelaw man a jaar te wàññi tooy bi",
                             "Daggël xob yi feebar bi laal lool"],
            },
        },
    },
}

# ======================================================================
# PLANTES (reprises de INITIAL_PLANTS ; dates converties au format ISO)
# ======================================================================
PLANTS = [
    {
        "id": "P-001", "name": "Plante 1", "species": "Tomate (Solanum lycopersicum)", "variety": "Roma VF",
        "status": "saine", "growth_stage": "Floraison & Fructification",
        "planting_date": date(2025, 3, 12), "last_observation": date(2025, 4, 20),
        "plot": "Parcelle A3 - Serre 1", "water_schedule": "Goutte-à-goutte (2x / jour)",
        "image": "/assets/plante_1.jpg", "health_score": 98, "alert": None,
        "details": {"yieldEstimate": "4.5 kg / pied", "soilMoisture": "65%", "temperature": "24°C",
                    "notes": "Croissance vigoureuse, feuillage bien vert sans aucune lésion apparente."},
        "history": [
            (date(2025, 4, 20), "Scan IA", "Feuillage sain (99.2%)", "Aucun agent pathogène détecté."),
            (date(2025, 4, 5), "Taille", "Égourmandage", "Retrait des gourmands bas."),
            (date(2025, 3, 12), "Plantation", "Repiquage réussi", "Terreau enrichi en compost bio."),
        ],
        "care": [("Arrosage matinal", "Quotidien", "Effectué"),
                 ("Apport purin d'ortie", "Tous les 14 jours", "Prévu le 25 avril"),
                 ("Paillage au pied", "Une fois par mois", "En place")],
        "observations": [
            (date(2025, 4, 20), "Agriculteur", "Fleurs abondantes, pollinisation en bonne voie."),
            (date(2025, 4, 10), "Conseiller agricole", "Très bon développement végétatif."),
        ],
    },
    {
        "id": "P-002", "name": "Plante 2", "species": "Aubergine (Solanum melongena)", "variety": "Black Beauty",
        "status": "surveiller", "growth_stage": "Végétatif avancé",
        "planting_date": date(2025, 3, 2), "last_observation": date(2025, 4, 22),
        "plot": "Parcelle B1 - Plein champ", "water_schedule": "Arrosage au pied (tous les 2 jours)",
        "image": "/assets/plante_2.jpg", "health_score": 74,
        "alert": "Premiers signes d'oïdium et jaunissement léger sur feuilles inférieures.",
        "details": {"yieldEstimate": "3.2 kg / pied", "soilMoisture": "52%", "temperature": "27°C",
                    "notes": "Apparition de légers voiles blanchâtres sur les feuilles basses. Risque de propagation si humidité élevée."},
        "history": [
            (date(2025, 4, 22), "Scan IA", "Suspicion Oïdium (78%)", "Intervention préventive conseillée."),
            (date(2025, 4, 14), "Fertilisation", "Engrais organique potassium", "Bonne reprise."),
        ],
        "care": [("Traitement bicarbonate ou soufre", "Immédiat", "Urgent (24h)"),
                 ("Aération du rang", "Une fois", "À faire")],
        "observations": [
            (date(2025, 4, 22), "Système PhytoScan", "Dégradation légère détectée par rapport au scan précédent."),
        ],
    },
    {
        "id": "P-003", "name": "Plante 3", "species": "Piment (Capsicum chinense)", "variety": "Antillais / Habanero",
        "status": "malade", "growth_stage": "Début floraison",
        "planting_date": date(2025, 2, 15), "last_observation": date(2025, 4, 23),
        "plot": "Parcelle C2 - Planche 4", "water_schedule": "Manuel le soir",
        "image": "/assets/plante_3.jpg", "health_score": 41,
        "alert": "Attaque sévère de Cercosporiose (Taches foliaires nécrotiques). Traitement d'urgence requis.",
        "details": {"yieldEstimate": "1.8 kg / pied", "soilMoisture": "48%", "temperature": "29°C",
                    "notes": "Multiples taches brunes circulaires avec halo jaunâtre. Chute prématurée des feuilles touchées."},
        "history": [
            (date(2025, 4, 23), "Scan IA", "Tache foliaire (Cercospora) confirmée (96.4%)", "Isoler la plante et traiter."),
            (date(2025, 4, 18), "Scan IA", "Anomalie foliaire détectée (62%)", "Surveillance accrue recommandée."),
        ],
        "care": [("Suppression des feuilles atteintes", "Immédiat", "Urgent"),
                 ("Application fongicide cuivre / décoction de prêle", "Sous 24h", "Recommandé"),
                 ("Désinfection du sécateur", "Après chaque coupe", "Impératif")],
        "observations": [
            (date(2025, 4, 23), "Agent Octopus IA", "Propagation fongique rapide favorisée par la rosée matinale."),
        ],
    },
]


def seed_diseases(db: Session) -> None:
    """Ajoute les maladies et traductions manquantes, puis complète les champs wolof vides."""
    for code, data in DISEASES.items():
        disease = db.scalar(select(Disease).where(Disease.code == code))
        if disease is None:
            disease = Disease(code=code, is_healthy=data["is_healthy"], severity_level=data["severity_level"])
            db.add(disease)
            db.flush()  # obtient l'id avant d'ajouter les traductions
        existing = {t.lang: t for t in disease.translations}
        for lang, tr in data["translations"].items():
            if lang not in existing:
                db.add(DiseaseTranslation(disease_id=disease.id, lang=lang, **tr))
            elif lang == "wo":
                # Backfill blank fields in existing installations without overwriting reviewed text.
                for field, value in tr.items():
                    if not getattr(existing[lang], field):
                        setattr(existing[lang], field, value)
    db.commit()


def seed_plants(db: Session) -> None:
    """Ajoute les 3 plantes de démonstration si elles n'existent pas (propriétaire = aucun)."""
    for p in PLANTS:
        if db.get(Plant, p["id"]) is not None:
            continue
        plant = Plant(**{k: v for k, v in p.items() if k not in ("history", "care", "observations")})
        plant.history = [PlantHistory(date=d, type=t, result=r, notes=n) for d, t, r, n in p["history"]]
        plant.care = [PlantCare(task=t, frequency=f, status=s) for t, f, s in p["care"]]
        plant.observations = [PlantObservation(date=d, author=a, text=x) for d, a, x in p["observations"]]
        db.add(plant)
    db.commit()


def run_seed(demo_plants: bool = True) -> None:
    """Insère les données nécessaires au fonctionnement (maladies + traductions) puis, si demandé,
    les plantes de démonstration. En production : demo_plants=False."""
    db = SessionLocal()
    try:
        seed_diseases(db)
        if demo_plants:
            seed_plants(db)
    finally:
        db.close()


if __name__ == "__main__":
    # Exemples :
    #   python -m app.db.seed                    -> tables (si absentes) + maladies + plantes de démo
    #   python -m app.db.seed --no-demo          -> maladies uniquement (production, tables gérées par Alembic)
    import argparse

    parser = argparse.ArgumentParser(description="Insère les données initiales de PhytoScan.")
    parser.add_argument("--no-demo", action="store_true", help="Ne pas insérer les plantes de démonstration")
    parser.add_argument("--create-tables", action="store_true", help="Créer les tables sans Alembic (dev uniquement)")
    args = parser.parse_args()

    if args.create_tables or not args.no_demo:
        from app.db.base import Base
        from app.db.session import engine
        import app.models  # noqa: F401  (enregistre les tables)
        Base.metadata.create_all(bind=engine)
    run_seed(demo_plants=not args.no_demo)
    print("Données initiales insérées.")
