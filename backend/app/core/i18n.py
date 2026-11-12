"""Outils multilingues : Français (fr), Wolof (wo), Anglais (en).

ATTENTION : les textes en wolof de ce fichier (et du seed) sont des propositions
reprises du front ou rédigées à titre de test. Ils DOIVENT être relus et validés
par un locuteur wolof avant toute mise en production (surtout traitements et doses).
"""
from datetime import date
from typing import Optional

SUPPORTED_LANGS = ("fr", "wo", "en")
DEFAULT_LANG = "fr"

# Noms des mois par langue (pour afficher "20 avril 2025" comme dans mockData.js)
MONTHS = {
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
           "septembre", "octobre", "novembre", "décembre"],
    "en": ["January", "February", "March", "April", "May", "June", "July", "August",
           "September", "October", "November", "December"],
    "wo": ["sanwiyee", "feebriyee", "mars", "awril", "mee", "suwen", "sulet", "ut",
           "sàttumbar", "oktoobar", "nowàmbar", "desàmbar"],
}

# Libellé de l'état d'une plante (champ "statusLabel" des fiches plantes)
PLANT_STATUS_LABELS = {
    "saine": {"fr": "Saine", "en": "Healthy", "wo": "Wér"},
    "surveiller": {"fr": "À surveiller", "en": "To monitor", "wo": "Saytu"},
    "malade": {"fr": "Malade", "en": "Sick", "wo": "Feebar"},
}

# Libellé du résultat d'un diagnostic (champ "statusLabel" du scan)
DIAGNOSIS_STATUS_LABELS = {
    "saine": {"fr": "Plante saine", "en": "Healthy plant", "wo": "Garab gu wér"},
    "malade": {"fr": "Maladie détectée", "en": "Disease detected", "wo": "Feebar bu ñu gis"},
}


def normalize_lang(value: Optional[str]) -> str:
    """Transforme 'fr-FR', 'EN', 'wo' ... en code supporté ; sinon renvoie la langue par défaut."""
    if not value:
        return DEFAULT_LANG
    code = value.strip().lower().split("-")[0].split("_")[0]
    return code if code in SUPPORTED_LANGS else DEFAULT_LANG


def parse_accept_language(header: Optional[str]) -> Optional[str]:
    """Lit l'en-tête HTTP Accept-Language et renvoie la première langue supportée (ou None)."""
    if not header:
        return None
    for part in header.split(","):
        code = part.split(";")[0].strip().lower().split("-")[0]
        if code in SUPPORTED_LANGS:
            return code
    return None


def format_date(value: Optional[date], lang: str) -> str:
    """Formate une date comme dans le front : '05 avril 2025'. Chaîne vide si pas de date."""
    if value is None:
        return ""
    months = MONTHS.get(lang, MONTHS[DEFAULT_LANG])
    return f"{value.day:02d} {months[value.month - 1]} {value.year}"


# Langues proposées dans le sélecteur de l'assistant (reprend ASSISTANT_LANGUAGES de mockData.js)
LANGUAGES = [
    {"code": "fr", "name": "Français", "flag": "🇫🇷"},
    {"code": "wo", "name": "Wolof (écrit)", "flag": "🇸🇳"},
    {"code": "en", "name": "English", "flag": "🇬🇧"},
]
