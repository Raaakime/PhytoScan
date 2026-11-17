"""Assistant vocal : interface commune + implémentation à base de règles alimentée par la base de données.

Pour brancher un vrai LLM plus tard : créer une classe LLMAssistant(BaseAssistant) et l'ajouter
dans get_assistant() (variable ASSISTANT_BACKEND). Les routes ne changent pas.

Les réponses sont composées à partir des données enregistrées : plantes (état, score de santé, alerte),
historique (diagnostics, traitements, observations) et soins. La base de données est la source de vérité :
le champ `context` n'est utilisé que pour la météo (Open-Meteo, récupérée par le front) :
`{"weather": {...}, "risks": [...]}`. Il doit être un objet JSON, pas un tableau.

ATTENTION : les phrases wolof sont des propositions à faire valider par un locuteur.
Les clés absentes de la section wolof retombent sur le français (À TRADUIRE).
"""
import re
import uuid
from abc import ABC, abstractmethod
from datetime import date, datetime, time
from functools import lru_cache
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.i18n import PLANT_STATUS_LABELS, normalize_lang
from app.models import ChatMessage, Plant, User
from app.schemas.assistant import AskResponse, ChatMessageOut, HistoryResponse, SuggestionsResponse
from app.services import disease_service

# ---------------------------------------------------------------- textes par langue
TEXTS = {
    "fr": {
        "and": "et",
        "more": " Et {n} de plus.",
        "no_plants": "Aucune plante n'est enregistrée dans votre exploitation.",
        "plant_missing": "Je ne trouve pas la plante {n} dans votre exploitation.",
        # état d'une plante
        "plant": "{name} ({species}) : état « {status} », score de santé {score}/100.",
        "alert_on": " Alerte active : {alert}.",
        "last_entry": " Dernier relevé : {result} ({date}).",
        # 1) plante la plus malade
        "worst": "La culture la plus préoccupante est {name} ({species}) : état « {status} », santé {score}/100.",
        "worst_ok": "Bonne nouvelle : toutes vos cultures vont bien. La plus fragile reste {name} ({species}), avec {score}/100.",
        "worst_next": " Viennent ensuite {items}.",
        "item_score": "{name} ({score}/100)",
        # 2) alertes
        "alerts_one": "Vous avez une alerte active : {items}.",
        "alerts": "Vous avez {n} alertes actives : {items}.",
        "alerts_none": "Aucune alerte active pour le moment.",
        "alerts_watch": " Gardez tout de même un œil sur {items}.",
        "alert_item": "{name} — {alert}",
        "plant_alert": "Alerte sur {name} : {alert}.",
        "plant_no_alert": "{name} n'a aucune alerte active.",
        # 3) et 4) diagnostics
        "diag_none": "Aucun diagnostic enregistré pour l'instant.",
        "diag_none_plant": "Aucun diagnostic n'est enregistré pour {name}.",
        "last_diag": "Le dernier diagnostic date du {date} : {name}, {result}.",
        "last_diag_status": " {name} est actuellement « {status} » ({score}/100).",
        "diag_list_one": "Un seul diagnostic est enregistré : {items}.",
        "diag_list": "{n} diagnostics sont enregistrés, du plus récent au plus ancien : {items}.",
        "diag_item": "{name} : {result} ({date})",
        "history_none": "Aucun historique n'est enregistré pour l'instant.",
        "history_list": "Voici l'historique enregistré, du plus récent au plus ancien : {items}.",
        "history_item": "{name} : {type}, {result} ({date})",
        # 6) maladie citée
        "disease": "Pour traiter « {name} » : {remedies}.",
        "disease_affected": " Cela concerne actuellement {items}.",
        # 7) soins
        "care": "Soins prévus pour {name} : {items}.",
        "care_all": "Voici les soins prévus dans votre carnet : {items}.",
        "care_none": "Aucun soin n'est enregistré pour le moment.",
        # 8) plantes malades
        "sick_one": "Une culture demande de l'attention : {items}.",
        "sick": "{n} cultures demandent de l'attention : {items}.",
        "none_sick": "Bonne nouvelle : toutes vos plantes sont saines.",
        "sick_item": "{name} ({status}, {score}/100)",
        # 9) arrosage
        "watering": "Par forte chaleur, arrosez tôt le matin ou après le coucher du soleil directement au pied sans mouiller le feuillage, en maintenant un bon paillage.",
        "watering_plants": " Dans votre carnet : {items}.",
        "watering_sick": " Pour {items}, évitez de mouiller le feuillage.",
        "watering_weather": "Aujourd'hui, il fait {temp} °C avec {hum} % d'humidité{rain}. ",
        # météo (données Open-Meteo envoyées par le front)
        "weather_none": "Je n'ai pas encore de données météo : autorisez la localisation dans le navigateur ou réessayez dans un instant.",
        "weather_now": "Météo actuelle{place} : {temp} °C, {hum} % d'humidité{rain}.",
        "weather_rain": ", {mm} mm de pluie",
        "weather_range": " Aujourd'hui, entre {min} et {max} °C.",
        "weather_risks": " Risques sanitaires liés au climat : {items}.",
        "weather_risk_item": "{plant} ({disease}, risque {level})",
        "weather_no_risk": " Aucun risque sanitaire particulier lié au climat pour vos cultures dans les 48 prochaines heures.",
        "level_high": "élevé",
        "level_moderate": "modéré",
        "tip_heat": " Forte chaleur : arrosez tôt le matin ou en fin de journée.",
        "tip_humid": " Humidité élevée : aérez les cultures et évitez de mouiller le feuillage.",
        "tip_rain": " Pluie : reportez l'arrosage.",
        # 10) réponse par défaut
        "overview": "Plantes suivies : {total} (saines : {healthy}, à surveiller : {watch}). Alertes actives : {alerts}.",
        "default": "{overview} Je peux vous dire quelle plante est la plus malade, vos alertes, le dernier diagnostic, les soins prévus ou comment traiter une maladie.",
    },
    "en": {
        "and": "and",
        "more": " And {n} more.",
        "no_plants": "No plants are registered on your farm.",
        "plant_missing": "I can't find plant {n} on your farm.",
        "plant": "{name} ({species}): status “{status}”, health score {score}/100.",
        "alert_on": " Active alert: {alert}.",
        "last_entry": " Latest record: {result} ({date}).",
        "worst": "The most worrying crop is {name} ({species}): status “{status}”, health {score}/100.",
        "worst_ok": "Good news: all your crops are doing well. The most fragile is still {name} ({species}), at {score}/100.",
        "worst_next": " Next in line: {items}.",
        "item_score": "{name} ({score}/100)",
        "alerts_one": "You have one active alert: {items}.",
        "alerts": "You have {n} active alerts: {items}.",
        "alerts_none": "No active alerts right now.",
        "alerts_watch": " Still, keep an eye on {items}.",
        "alert_item": "{name} — {alert}",
        "plant_alert": "Alert on {name}: {alert}.",
        "plant_no_alert": "{name} has no active alert.",
        "diag_none": "No diagnosis recorded yet.",
        "diag_none_plant": "No diagnosis is recorded for {name}.",
        "last_diag": "The latest diagnosis is from {date}: {name}, {result}.",
        "last_diag_status": " {name} is currently “{status}” ({score}/100).",
        "diag_list_one": "Only one diagnosis is recorded: {items}.",
        "diag_list": "{n} diagnoses are recorded, newest first: {items}.",
        "diag_item": "{name}: {result} ({date})",
        "history_none": "No history is recorded yet.",
        "history_list": "Here is the recorded history, newest first: {items}.",
        "history_item": "{name}: {type}, {result} ({date})",
        "disease": "To treat “{name}”: {remedies}.",
        "disease_affected": " This currently affects {items}.",
        "care": "Planned care for {name}: {items}.",
        "care_all": "Here is the planned care in your logbook: {items}.",
        "care_none": "No care is recorded yet.",
        "sick_one": "One crop needs attention: {items}.",
        "sick": "{n} crops need attention: {items}.",
        "none_sick": "Good news: all your plants are healthy.",
        "sick_item": "{name} ({status}, {score}/100)",
        "watering": "During hot spells, irrigate early in the morning or late evening directly at the root zone, keeping organic mulch.",
        "watering_plants": " In your logbook: {items}.",
        "watering_sick": " For {items}, avoid wetting the foliage.",
        "watering_weather": "Today it is {temp} °C with {hum} % humidity{rain}. ",
        "weather_none": "I don't have weather data yet: allow location access in your browser or try again in a moment.",
        "weather_now": "Current weather{place}: {temp} °C, {hum} % humidity{rain}.",
        "weather_rain": ", {mm} mm of rain",
        "weather_range": " Today, between {min} and {max} °C.",
        "weather_risks": " Climate-related health risks: {items}.",
        "weather_risk_item": "{plant} ({disease}, {level} risk)",
        "weather_no_risk": " No particular climate-related health risk for your crops over the next 48 hours.",
        "level_high": "high",
        "level_moderate": "moderate",
        "tip_heat": " Strong heat: water early in the morning or late in the day.",
        "tip_humid": " High humidity: ventilate the crops and avoid wetting the foliage.",
        "tip_rain": " Rain: postpone watering.",
        "overview": "Plants tracked: {total} (healthy: {healthy}, to watch: {watch}). Active alerts: {alerts}.",
        "default": "{overview} You can ask me which plant is the sickest, about your alerts, the latest diagnosis, planned care, or how to treat a disease.",
    },
}

# Wolof : seules les phrases déjà proposées sont en wolof ; le reste retombe sur le français (À TRADUIRE).
_WO_OVERRIDES = {
    "plant_missing": "Gisuma garab {n} ci sa tool.",
    "plant": "{name} ({species}) : mbir mi mooy « {status} », {score}/100.",
    "disease": "Ngir faj « {name} » : {remedies}.",
    "sick_one": "Garab yi ñu war a saytu : {items}.",
    "sick": "Garab yi ñu war a saytu : {items}.",
    "none_sick": "Garab yépp wér nañu.",
    "watering": "Bu tàngoor baree, suubal garab yi suba teel wala ci ngoon gu tëdd, ci suuf gi rekk te bu tooyal xob yi.",
    "default": "Degg naa sa laaj ci « {q} ».",
}
TEXTS["wo"] = {**TEXTS["fr"], **_WO_OVERRIDES}

# Questions suggérées affichées en badges (reprend SAMPLE_QUESTIONS de mockData.js)
SUGGESTIONS = {
    "fr": ["Quelle est la santé de la plante 2 ?", "Comment traiter la tache foliaire (Cercospora) ?",
           "Quelles plantes sont actuellement malades ?", "Conseils d'arrosage pour mes tomates par forte chaleur"],
    "wo": ["Amul garab gu wara Saytu fi léegi ?", "Nan lañuy fajee tàcc yu ñuul ci xobi tomate ?",
           "Ban garab ñoo feebar leegi ?", "Ñaata yoon laay suub xob yi bu tàngoor baree ?"],
    "en": ["What is the health status of plant 2?", "How do I treat Cercospora leaf spot?",
           "Which crops need urgent attention today?", "Watering tips for tomatoes during hot weather"],
}

# ---------------------------------------------------------------- mots-clés (3 langues)
# "powdery" est testé avant "mildew".
DISEASE_KEYWORDS = [
    ("powdery_mildew", ("oïdium", "oidium", "powdery")),
    ("mildew", ("mildiou", "mildew", "blight")),
    ("cercospora", ("cercospora", "tache", "tàcc", "spot")),
]
DISEASE_WORDS = dict(DISEASE_KEYWORDS)

WORST_KEYWORDS = ("plus malade", "plus critique", "plus préoccupante", "plus fragile", "worst", "most critical", "sickest")
ALERT_KEYWORDS = ("alerte", "alert")
LAST_DIAGNOSTIC_KEYWORDS = ("dernier diagnostic", "last diagnosis", "latest diagnosis", "last diagnostic")
DIAGNOSTIC_KEYWORDS = ("diagnostic", "diagnosis", "diagnoses", "maladies détectées", "detected diseases")
HISTORY_KEYWORDS = ("historique", "history", "carnet de santé")
SICK_KEYWORDS = ("malade", "feebar", "sick", "urgent", "attention", "diseased")
WHICH_PLANTS_KEYWORDS = ("quelles plantes", "which plants", "which crops")
WEATHER_KEYWORDS = ("météo", "meteo", "quel temps", "temps fait", "weather", "climat", "climate", "température", "temperature", "humidité", "humidity", "pluie", "rain", "risque", "risk")
WATER_KEYWORDS = ("arros", "suub", "water", "irrig", "besoin d'eau")
TREAT_KEYWORDS = ("remède", "remede", "protocole", "traiter", "traitement", "treat", "remed", "protocol", "faj")
CARE_PATTERN = re.compile(r"\b(soins?|care|entretien|recommandations?)\b")  # \b : « besoin » ne doit pas matcher « soin »

_PLANT_REF = re.compile(r"(?:plante|garab|plant)\s*(\d+)")              # « plante 2 », « garab 2 »
_NUMBERED_NAME = re.compile(r"\s*(?:plante|garab|plant)\s*0*(\d+)\s*", re.IGNORECASE)  # nom du type « Plante 01 »

SCAN_HISTORY_TYPE = "Scan IA"
MAX_ITEMS = 5


# ---------------------------------------------------------------- petits utilitaires
def _has(text: str, words) -> bool:
    return any(w in text for w in words)


def _join(items, tx) -> str:
    """« a, b et c » / « a, b and c »."""
    items = list(items)
    if len(items) <= 1:
        return "".join(items)
    return f"{', '.join(items[:-1])} {tx['and']} {items[-1]}"


def _cap(items, limit: int = MAX_ITEMS):
    return items[:limit], max(0, len(items) - limit)


def _n(tx, key: str, n: int) -> str:
    """Choisit la variante « _one » (singulier) quand elle existe et que n == 1."""
    one = tx.get(f"{key}_one")
    return one if (n == 1 and one) else tx[key]


def _trim(text) -> str:
    """Retire la ponctuation finale pour pouvoir composer une phrase proprement."""
    return str(text or "").strip().rstrip(".!?… ")


def _short(text, limit: int = 160) -> str:
    text = str(text or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;: ") + "…"


def _sentence(text: str) -> str:
    text = text.strip()
    return text if text.endswith((".", "!", "?", "…")) else text + "."


def _species(p) -> str:
    """« Aubergine (Solanum melongena) » -> « Aubergine » (plus naturel à l'oral)."""
    return str(getattr(p, "species", "") or "").split(" (")[0]


def _status(p, lang: str) -> str:
    labels = PLANT_STATUS_LABELS.get(p.status) or {}
    return labels.get(lang) or str(p.status)


def _health_key(p):
    """Tri du plus fragile au plus sain ; les plantes sans score passent en dernier."""
    score = getattr(p, "health_score", None)
    return (score is None, score if score is not None else 0, p.name)


_DATE_FORMATS = ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%d/%m/%Y %H:%M", "%d-%m-%Y")


def _to_datetime(value) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, time.min)
    if isinstance(value, str):
        raw = value.strip()
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(raw, fmt)
            except ValueError:
                continue
    return None


def _fmt_date(value) -> str:
    """Affiche toutes les dates en JJ/MM/AAAA, que la base renvoie un objet date ou un texte."""
    parsed = _to_datetime(value)
    if parsed is not None:
        return parsed.strftime("%d/%m/%Y")
    return str(value) if value else "—"


def _entry_key(h):
    """Clé de tri chronologique d'une entrée d'historique (date, puis id en cas d'égalité)."""
    when = _to_datetime(getattr(h, "date", None)) or datetime.min
    entry_id = getattr(h, "id", 0)
    return (when, entry_id if isinstance(entry_id, int) else 0)


def _history(p) -> list:
    return list(getattr(p, "history", None) or [])


def _care_list(p) -> list:
    return list(getattr(p, "care", None) or [])


def _care_label(c) -> str:
    label = c.task
    if getattr(c, "frequency", None):
        label += f" ({c.frequency})"
    if getattr(c, "status", None):
        label += f", {str(c.status).lower()}"
    return label


def _number(value) -> Optional[int]:
    try:
        return round(float(value))
    except (TypeError, ValueError):
        return None


def _weather_from_context(context):
    """Extrait (météo, risques) du contexte envoyé par le front ; (None, []) si absent ou invalide."""
    if not isinstance(context, dict):
        return None, []
    weather = context.get("weather")
    if not isinstance(weather, dict) or _number(weather.get("temperature")) is None \
            or _number(weather.get("humidity")) is None:
        return None, []
    risks = context.get("risks")
    return weather, [r for r in risks if isinstance(r, dict)] if isinstance(risks, list) else []


def _rain_mm(weather: dict) -> float:
    today = weather.get("today") if isinstance(weather.get("today"), dict) else {}
    values = []
    for raw in (weather.get("precipitation"), today.get("rain")):
        try:
            values.append(float(raw))
        except (TypeError, ValueError):
            pass
    return max(values, default=0.0)


def _fmt_mm(rain: float, lang: str) -> str:
    """1.2 -> « 1,2 » en français/wolof ; 3.0 -> « 3 »."""
    text = f"{rain:.1f}".rstrip("0").rstrip(".") or "0"
    return text if lang == "en" else text.replace(".", ",")


def _weather_tips(tx, weather: dict, kinds=("heat", "humid", "rain")) -> str:
    """Conseils déduits des chiffres du jour (mêmes seuils que le front : 35 °C, 85 %, 5 mm)."""
    temp, hum, rain = _number(weather.get("temperature")), _number(weather.get("humidity")), _rain_mm(weather)
    tips = ""
    if "heat" in kinds and temp is not None and temp >= 35:
        tips += tx["tip_heat"]
    if "humid" in kinds and hum is not None and hum >= 85:
        tips += tx["tip_humid"]
    if "rain" in kinds and rain > 0:
        tips += tx["tip_rain"]
    return tips


# ---------------------------------------------------------------- interface
class BaseAssistant(ABC):
    @abstractmethod
    def answer(self, db: Session, question: str, lang: str, context: dict, owner_id: Optional[int]) -> str:
        """Renvoie le texte de la réponse dans la langue demandée."""


def _owner_clause(owner_id: Optional[int]):
    return Plant.owner_id.is_(None) if owner_id is None else Plant.owner_id == owner_id


class RuleBasedAssistant(BaseAssistant):
    """Détecte les intentions par mots-clés et compose la réponse avec les données de la base."""

    # ------------------------------------------------ recherche
    @staticmethod
    def _name_pattern(name: str):
        """Motif tolérant pour retrouver un nom dans une question : « Plante 01 » accepte aussi « plante01 »,
        mais « Plante 1 » ne doit pas être reconnu dans « plante 10 »."""
        tokens = re.findall(r"[^\W\d_]+|\d+", (name or "").lower())
        if not tokens:
            return None
        return re.compile(r"(?<!\w)" + r"\s*".join(re.escape(t) for t in tokens) + r"(?!\w)")

    @classmethod
    def _find_plant(cls, plants: List[Plant], q: str):
        """Retrouve la plante visée. Ordre de recherche :
        1) par nom (« Plante 01 », « Plant 100 », « Tomate Cœur de Bœuf »), les noms les plus longs d'abord ;
        2) par numéro (« plante 1 » -> « Plante 01 », puis identifiant P-001) ;
        Renvoie (plante, numéro_demandé_introuvable)."""
        for p in sorted(plants, key=lambda p: -len(p.name or "")):
            pattern = cls._name_pattern(p.name)
            if pattern and pattern.search(q):
                return p, None
        if m := _PLANT_REF.search(q):
            n = int(m.group(1))
            for p in plants:
                numbered = _NUMBERED_NAME.fullmatch(p.name or "")
                if numbered and int(numbered.group(1)) == n:
                    return p, None
            found = next((p for p in plants if p.id == f"P-{n:03d}"), None)
            return found, (None if found else n)
        return None, None

    @staticmethod
    def _entries(plants: List[Plant], scans_only: bool):
        """Couples (plante, entrée d'historique), éventuellement limités aux diagnostics par scan."""
        return [(p, h) for p in plants for h in _history(p)
                if not scans_only or getattr(h, "type", None) == SCAN_HISTORY_TYPE]

    def _latest_entry(self, plant: Plant, scans_only: bool = False):
        entries = [h for _, h in self._entries([plant], scans_only)]
        return max(entries, key=_entry_key) if entries else None

    # ------------------------------------------------ composition des réponses
    def _plant_summary(self, tx, lang, plant: Plant) -> str:
        text = tx["plant"].format(name=plant.name, species=_species(plant),
                                  status=_status(plant, lang), score=plant.health_score)
        if plant.alert:
            text += tx["alert_on"].format(alert=_trim(plant.alert))
        last = self._latest_entry(plant)
        if last is not None:
            text += tx["last_entry"].format(result=_trim(last.result), date=_fmt_date(last.date))
        return text

    def _worst(self, tx, lang, scope: List[Plant]) -> str:
        if not scope:
            return tx["no_plants"]
        ranked = sorted(scope, key=_health_key)
        worst = ranked[0]
        healthy = worst.status == "saine" and not worst.alert
        text = tx["worst_ok" if healthy else "worst"].format(
            name=worst.name, species=_species(worst), status=_status(worst, lang), score=worst.health_score)
        if worst.alert:
            text += tx["alert_on"].format(alert=_trim(worst.alert))
        last = self._latest_entry(worst)
        if last is not None:
            text += tx["last_entry"].format(result=_trim(last.result), date=_fmt_date(last.date))
        others = [p for p in ranked[1:] if p.status != "saine" or p.alert][:3]
        if others:
            text += tx["worst_next"].format(items=_join(
                [tx["item_score"].format(name=p.name, score=p.health_score) for p in others], tx))
        return text

    def _alerts(self, tx, scope: List[Plant], plant: Optional[Plant]) -> str:
        alerting = sorted([p for p in scope if p.alert], key=_health_key)
        if plant is not None:
            if not alerting:
                return tx["plant_no_alert"].format(name=plant.name)
            return tx["plant_alert"].format(name=plant.name, alert=_trim(plant.alert))
        if not alerting:
            text = tx["alerts_none"]
            watch = [p.name for p in sorted(scope, key=_health_key) if p.status != "saine"]
            if watch:
                text += tx["alerts_watch"].format(items=_join(watch[:MAX_ITEMS], tx))
            return text
        shown, extra = _cap(alerting)
        items = "; ".join(tx["alert_item"].format(name=p.name, alert=_trim(p.alert)) for p in shown)
        text = _n(tx, "alerts", len(alerting)).format(n=len(alerting), items=items)
        return text + (tx["more"].format(n=extra) if extra else "")

    def _last_diagnostic(self, tx, lang, scope: List[Plant], plant: Optional[Plant]) -> str:
        entries = self._entries(scope, scans_only=True)
        if not entries:
            return tx["diag_none_plant"].format(name=plant.name) if plant else tx["diag_none"]
        p, h = max(entries, key=lambda e: _entry_key(e[1]))
        text = tx["last_diag"].format(date=_fmt_date(h.date), name=p.name, result=_trim(h.result))
        notes = _short(getattr(h, "notes", None))
        if notes:
            text += " " + _sentence(notes)
        return text + tx["last_diag_status"].format(name=p.name, status=_status(p, lang), score=p.health_score)

    def _diagnostics(self, tx, scope: List[Plant], plant: Optional[Plant], with_all: bool) -> str:
        entries = self._entries(scope, scans_only=not with_all)
        if not entries:
            if with_all:
                return tx["history_none"]
            return tx["diag_none_plant"].format(name=plant.name) if plant else tx["diag_none"]
        entries.sort(key=lambda e: _entry_key(e[1]), reverse=True)
        shown, extra = _cap(entries, 6)
        if with_all:
            items = "; ".join(tx["history_item"].format(name=p.name, type=h.type, result=_trim(h.result),
                                                        date=_fmt_date(h.date)) for p, h in shown)
            text = tx["history_list"].format(items=items)
        else:
            items = "; ".join(tx["diag_item"].format(name=p.name, result=_trim(h.result),
                                                     date=_fmt_date(h.date)) for p, h in shown)
            text = (tx["diag_list_one"] if len(entries) == 1 else tx["diag_list"]).format(
                n=len(entries), items=items)
        return text + (tx["more"].format(n=extra) if extra else "")

    def _care(self, tx, scope: List[Plant], plant: Optional[Plant]) -> str:
        if plant is not None:
            items = [_care_label(c) for c in _care_list(plant)]
            return tx["care"].format(name=plant.name, items="; ".join(items)) if items else tx["care_none"]
        items = [f"{p.name} : {_care_label(c)}" for p in scope for c in _care_list(p)]
        if not items:
            return tx["care_none"]
        shown, extra = _cap(items, 6)
        return tx["care_all"].format(items="; ".join(shown)) + (tx["more"].format(n=extra) if extra else "")

    def _watering(self, tx, lang, scope: List[Plant], weather: Optional[dict] = None) -> str:
        text = tx["watering"]
        if weather:
            rain = _rain_mm(weather)
            intro = tx["watering_weather"].format(
                temp=_number(weather.get("temperature")), hum=_number(weather.get("humidity")),
                rain=tx["weather_rain"].format(mm=_fmt_mm(rain, lang)) if rain > 0 else "")
            # La chaleur et l'humidité sont déjà couvertes par le conseil de base et par « watering_sick ».
            text = intro + text + _weather_tips(tx, weather, kinds=("rain",))
        tasks = [f"{p.name} : {_care_label(c)}" for p in scope for c in _care_list(p)
                 if _has(str(c.task).lower(), WATER_KEYWORDS)]
        if tasks:
            text += tx["watering_plants"].format(items="; ".join(tasks[:3]))
        fragile = [p.name for p in sorted(scope, key=_health_key) if p.status != "saine"]
        if fragile:
            text += tx["watering_sick"].format(items=_join(fragile[:3], tx))
        return text

    def _weather(self, tx, lang, weather: Optional[dict], risks: List[dict]) -> str:
        if not weather:
            return tx["weather_none"]
        rain = _rain_mm(weather)
        label = str(weather.get("location") or "").strip()[:60]
        text = tx["weather_now"].format(
            place=f" ({label})" if label else "", temp=_number(weather.get("temperature")),
            hum=_number(weather.get("humidity")),
            rain=tx["weather_rain"].format(mm=_fmt_mm(rain, lang)) if rain > 0 else "")
        today = weather.get("today") if isinstance(weather.get("today"), dict) else {}
        if _number(today.get("min")) is not None and _number(today.get("max")) is not None:
            text += tx["weather_range"].format(min=_number(today["min"]), max=_number(today["max"]))
        text += _weather_tips(tx, weather)
        if risks:
            shown, extra = _cap(risks, 4)
            items = "; ".join(tx["weather_risk_item"].format(
                plant=str(r.get("plant", ""))[:60], disease=str(r.get("disease", ""))[:80],
                level=tx["level_high"] if r.get("level") == "high" else tx["level_moderate"]) for r in shown)
            text += tx["weather_risks"].format(items=items) + (tx["more"].format(n=extra) if extra else "")
        else:
            text += tx["weather_no_risk"]
        return text

    @staticmethod
    def _overview(tx, plants: List[Plant]) -> str:
        if not plants:
            return tx["no_plants"]
        healthy = sum(1 for p in plants if p.status == "saine")
        return tx["overview"].format(total=len(plants), healthy=healthy, watch=len(plants) - healthy,
                                     alerts=sum(1 for p in plants if p.alert))

    def _current_blob(self, plant: Plant) -> str:
        """Texte décrivant la situation actuelle d'une plante : son alerte et son dernier diagnostic."""
        last_scan = self._latest_entry(plant, scans_only=True)
        return f"{plant.alert or ''} {getattr(last_scan, 'result', '') or ''}".lower()

    # ------------------------------------------------ point d'entrée
    def answer(self, db: Session, question: str, lang: str, context: dict, owner_id: Optional[int]) -> str:
        tx = TEXTS[lang]
        q = question.lower()
        plants = db.scalars(select(Plant).where(_owner_clause(owner_id)).order_by(Plant.id)).all()
        weather, weather_risks = _weather_from_context(context)

        # La plante visée est repérée d'abord (sans répondre) : elle sert à restreindre les réponses
        # (« dernier diagnostic de la plante 2 », « alerte de la plante 2 »...).
        plant, missing_n = self._find_plant(plants, q)
        if missing_n is not None:
            return tx["plant_missing"].format(n=missing_n)
        scope = [plant] if plant is not None else plants
        # Une demande de remède (ex. « Alerte sur Plante 2 ... Quels remèdes appliquer ? ») passe par
        # la plante et la maladie, pas par la simple liste des alertes ou des diagnostics.
        wants_treatment = _has(q, TREAT_KEYWORDS)

        # 1) Plante la plus malade
        if _has(q, WORST_KEYWORDS):
            return self._worst(tx, lang, scope)

        # 2) Alertes
        if not wants_treatment and _has(q, ALERT_KEYWORDS):
            return self._alerts(tx, scope, plant)

        # 3) Dernier diagnostic (avant « diagnostic », qui le contient)
        if not wants_treatment and _has(q, LAST_DIAGNOSTIC_KEYWORDS):
            return self._last_diagnostic(tx, lang, scope, plant)

        # 4) Diagnostics enregistrés (ou historique complet)
        with_all = _has(q, HISTORY_KEYWORDS)
        if not wants_treatment and (with_all or _has(q, DIAGNOSTIC_KEYWORDS)):
            return self._diagnostics(tx, scope, plant, with_all)

        parts: List[str] = []

        # 5) Plante ciblée -> son état, son alerte et son dernier relevé
        if plant is not None:
            parts.append(self._plant_summary(tx, lang, plant))

        # 6) Maladie citée -> traitements. Pour un remède sans maladie nommée, on la déduit de l'alerte
        #    de la plante, puis de son dernier diagnostic.
        text_for_disease = q
        if plant is not None and wants_treatment:
            if plant.alert:
                text_for_disease += " " + plant.alert.lower()
            last_scan = self._latest_entry(plant, scans_only=True)
            if last_scan is not None and last_scan.result:
                text_for_disease += " " + str(last_scan.result).lower()
        disease_code = next((c for c, words in DISEASE_KEYWORDS if _has(text_for_disease, words)), None)
        if disease_code:
            disease = disease_service.get_disease_by_code(db, disease_code)
            if disease is not None:
                t = disease.get_translation(lang)
                text = tx["disease"].format(name=t.name, remedies="; ".join(t.remedies))
                if plant is None:  # quelles plantes sont touchées en ce moment ?
                    affected = [p.name for p in plants if _has(self._current_blob(p), DISEASE_WORDS[disease_code])]
                    if affected:
                        text += tx["disease_affected"].format(items=_join(affected[:MAX_ITEMS], tx))
                parts.append(text)

        # 7) Soins
        if CARE_PATTERN.search(q):
            parts.append(self._care(tx, scope, plant))

        # Arrosage d'une plante précise : conseil général + ses tâches d'arrosage
        if plant is not None and _has(q, WATER_KEYWORDS):
            parts.append(self._watering(tx, lang, scope, weather))

        if parts:
            return " ".join(part.strip() for part in parts)

        # 8) Plantes malades / à surveiller
        asks_which_plants = _has(q, WHICH_PLANTS_KEYWORDS) and not _has(q, WATER_KEYWORDS)
        if _has(q, SICK_KEYWORDS) or asks_which_plants:
            sick = sorted([p for p in plants if p.status != "saine"], key=_health_key)
            if not sick:
                return tx["none_sick"]
            shown, extra = _cap(sick)
            items = ", ".join(tx["sick_item"].format(name=p.name, status=_status(p, lang), score=p.health_score)
                              for p in shown)
            text = _n(tx, "sick", len(sick)).format(n=len(sick), items=items)
            return text + (tx["more"].format(n=extra) if extra else "")

        # 8 bis) Météo et risques climatiques (si la question ne parle pas d'arrosage)
        if _has(q, WEATHER_KEYWORDS) and not _has(q, WATER_KEYWORDS):
            return self._weather(tx, lang, weather, weather_risks)

        # 9) Arrosage (personnalisé avec la météo du jour si elle est connue)
        if _has(q, WATER_KEYWORDS):
            return self._watering(tx, lang, plants, weather)

        # 10) Réponse par défaut : un état des lieux de l'exploitation
        return tx["default"].format(q=question, overview=self._overview(tx, plants))


@lru_cache
def get_assistant() -> BaseAssistant:
    """Choisit l'implémentation selon ASSISTANT_BACKEND (.env)."""
    backend = get_settings().ASSISTANT_BACKEND.lower()
    if backend == "mock":
        return RuleBasedAssistant()
    raise ValueError(f"ASSISTANT_BACKEND inconnu : {backend!r}")


# ---------------------------------------------------------------- orchestration
def get_suggestions(language: str) -> SuggestionsResponse:
    lang = normalize_lang(language)
    return SuggestionsResponse(language=lang, questions=SUGGESTIONS[lang])


def ask(db: Session, question: str, language: str, context: dict, session_id: Optional[str],
        user: Optional[User]) -> AskResponse:
    """Traite une question : appelle l'assistant, mémorise l'échange, renvoie la réponse."""
    lang = normalize_lang(language)
    session_id = session_id or uuid.uuid4().hex[:16]
    owner_id = user.id if user else None

    text = get_assistant().answer(db, question, lang, context, owner_id)

    # Mémorisation des deux messages (question + réponse)
    msg_bot = ChatMessage(session_id=session_id, user_id=owner_id, role="bot", text=text, lang=lang)
    db.add_all([ChatMessage(session_id=session_id, user_id=owner_id, role="user", text=question, lang=lang), msg_bot])
    db.commit()
    db.refresh(msg_bot)

    return AskResponse(text=text, timestamp=msg_bot.created_at.strftime("%H:%M"), audio_url=None, session_id=session_id)


def get_history(db: Session, session_id: str, user: Optional[User]) -> HistoryResponse:
    """Renvoie les messages d'une discussion (format de INITIAL_CHAT_MESSAGES du front)."""
    owner_id = user.id if user else None
    rows = db.scalars(select(ChatMessage).where(
        ChatMessage.session_id == session_id,
        ChatMessage.user_id.is_(None) if owner_id is None else ChatMessage.user_id == owner_id
    ).order_by(ChatMessage.id)).all()
    messages: List[ChatMessageOut] = [
        ChatMessageOut(id=r.id, sender=r.role, text=r.text, timestamp=r.created_at.strftime("%H:%M"),
                       has_audio=False) for r in rows]
    return HistoryResponse(session_id=session_id, messages=messages)
