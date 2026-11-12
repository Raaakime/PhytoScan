"""Assistant vocal : interface commune + implémentation de TEST à base de règles.

Pour brancher un vrai LLM plus tard : créer une classe LLMAssistant(BaseAssistant) et l'ajouter
dans get_assistant() (variable ASSISTANT_BACKEND). Les routes ne changent pas.

Note : la reconnaissance vocale et la synthèse vocale sont faites par le NAVIGATEUR (Web Speech API)
dans VoiceAssistantScreen. Le back ne traite donc que du texte ; `audioUrl` reste null pour l'instant.

ATTENTION : les phrases wolof ci-dessous sont des propositions à faire valider par un locuteur.
"""
import re
import unicodedata
import uuid
from abc import ABC, abstractmethod
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
        "plant": "{name} ({species}) : état « {status} », score de santé {score}/100.{alert}",
        "plant_missing": "Je ne trouve pas la plante {n} dans votre exploitation.",
        "disease": "Pour traiter « {name} » : {remedies}.",
        "care": "Soins prévus : {items}.",
        "sick": "Plantes demandant de l'attention : {items}.",
        "none_sick": "Bonne nouvelle : toutes vos plantes sont saines.",
        "watering": "Par forte chaleur, arrosez tôt le matin ou après le coucher du soleil directement au pied sans mouiller le feuillage, en maintenant un bon paillage.",
        "default": "J'ai bien analysé votre demande : « {q} ». Je peux vous renseigner sur l'état de vos plantes, les maladies et leurs traitements, ou l'arrosage.",
    },
    "en": {
        "plant": "{name} ({species}): status “{status}”, health score {score}/100.{alert}",
        "plant_missing": "I can't find plant {n} on your farm.",
        "disease": "To treat “{name}”: {remedies}.",
        "care": "Planned care: {items}.",
        "sick": "Plants needing attention: {items}.",
        "none_sick": "Good news: all your plants are healthy.",
        "watering": "During hot spells, irrigate early in the morning or late evening directly at the root zone, keeping organic mulch.",
        "default": "I reviewed your query: “{q}”. I can tell you about your plants' health, diseases and treatments, or watering.",
    },
    "wo": {
        "plant": "{name} ({species}) : mbir mi mooy « {status} », {score}/100.{alert}",
        "plant_missing": "Gisuma garab {n} ci sa tool.",
        "disease": "Ngir faj « {name} » : {remedies}.",
        "care": "Soins : {items}.",   # À TRADUIRE
        "sick": "Garab yi ñu war a saytu : {items}.",
        "none_sick": "Garab yépp wér nañu.",
        "watering": "Bu tàngoor baree, suubal garab yi suba teel wala ci ngoon gu tëdd, ci suuf gi rekk te bu tooyal xob yi.",
        "default": "Degg naa sa laaj ci « {q} ».",
    },
}

# Questions suggérées affichées en badges (reprend SAMPLE_QUESTIONS de mockData.js)
SUGGESTIONS = {
    "fr": ["Quelle est la santé de la plante 2 ?", "Comment traiter la tache foliaire (Cercospora) ?",
           "Quelles plantes sont actuellement malades ?", "Conseils d'arrosage pour mes tomates par forte chaleur"],
    "wo": ["Naka la wàllu garab 2 gi deme ?", "Nan lañuy fajee tàcc yu ñuul ci xobi tomate ?",
           "Ban garab ñoo feebar leegi ?", "Ñaata yoon laay suub xob yi bu tàngoor baree ?"],
    "en": ["What is the health status of plant 2?", "How do I treat Cercospora leaf spot?",
           "Which crops need urgent attention today?", "Watering tips for tomatoes during hot weather"],
}

# Mots-clés français, anglais et wolof. Les accents sont ignorés à la recherche.
DISEASE_KEYWORDS = [
    ("powdery_mildew", ("oïdium", "oidium", "powdery", "xob yu weex")),
    ("mildew", ("mildiou", "mildew", "blight")),
    ("cercospora", ("cercospora", "tache", "tàcc", "tacc", "spot")),
]
SICK_KEYWORDS = ("malade", "feebar", "metti", "sick", "urgent", "attention", "diseased")
WATER_KEYWORDS = ("arros", "suub", "suubal", "water", "irrig")
CARE_KEYWORDS = ("soin", "care", "entretien", "recommandation", "saytu")
TREAT_KEYWORDS = ("remède", "remede", "protocole", "traiter", "traitement", "treat", "remed", "protocol", "faj")


def _normalize_query(value: str) -> str:
    """Normalise les variantes d'accents et de casse sans modifier le texte conservé en historique."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


# ---------------------------------------------------------------- interface
class BaseAssistant(ABC):
    @abstractmethod
    def answer(self, db: Session, question: str, lang: str, context: dict, owner_id: Optional[int]) -> str:
        """Renvoie le texte de la réponse dans la langue demandée."""


def _owner_clause(owner_id: Optional[int]):
    return Plant.owner_id.is_(None) if owner_id is None else Plant.owner_id == owner_id


class RuleBasedAssistant(BaseAssistant):
    """Assistant de test : détecte les intentions par mots-clés et compose la réponse avec les données de la base."""

    @staticmethod
    def _find_plant(db: Session, q: str, owner_id: Optional[int]):
        """Retrouve la plante visée : par numéro (« plante 2 ») ou par nom exact (« Plante 3 », « Tomate Cœur de Bœuf »).
        Renvoie (plante, numéro_demandé_introuvable)."""
        plants = db.scalars(select(Plant).where(_owner_clause(owner_id)).order_by(Plant.id)).all()
        if m := re.search(r"(?:plante|garab|plant)\s*(\d+)", q):
            n = int(m.group(1))
            found = next((p for p in plants if p.id == f"P-{n:03d}"), None)
            return found, (None if found else n)
        # Par nom : on essaie les noms les plus longs d'abord (évite de confondre deux noms proches)
        for p in sorted(plants, key=lambda p: -len(p.name)):
            if _normalize_query(p.name) in q:
                return p, None
        return None, None

    def answer(self, db: Session, question: str, lang: str, context: dict, owner_id: Optional[int]) -> str:
        tx = TEXTS[lang]
        q = _normalize_query(question)
        parts: List[str] = []

        # 1) Plante ciblée -> son état
        plant, missing_n = self._find_plant(db, q, owner_id)
        if missing_n is not None:
            return tx["plant_missing"].format(n=missing_n)
        if plant is not None:
            alert = f" {plant.alert}" if plant.alert else ""
            parts.append(tx["plant"].format(name=plant.name, species=plant.species,
                                            status=PLANT_STATUS_LABELS[plant.status][lang],
                                            score=plant.health_score, alert=alert))

        # 2) Maladie citée -> traitements (table des maladies, multilingue).
        #    Si on demande un remède sans nommer la maladie, on la déduit de l'alerte de la plante.
        text_for_disease = q
        if plant is not None and plant.alert and any(w in q for w in TREAT_KEYWORDS):
            text_for_disease += " " + plant.alert.lower()
        disease_code = next((c for c, words in DISEASE_KEYWORDS if any(w in text_for_disease for w in words)), None)
        if disease_code:
            t = disease_service.get_disease_by_code(db, disease_code).get_translation(lang)
            parts.append(tx["disease"].format(name=t.name, remedies="; ".join(t.remedies)))

        # 3) Soins de la plante ciblée
        if plant is not None and any(w in q for w in CARE_KEYWORDS) and plant.care:
            items = "; ".join(f"{c.task} ({c.frequency})" if c.frequency else c.task for c in plant.care)
            parts.append(tx["care"].format(items=items))

        if parts:
            return " ".join(parts)

        # 4) Quelles plantes sont malades / à surveiller ?
        if any(w in q for w in SICK_KEYWORDS):
            plants = db.scalars(select(Plant).where(Plant.status != "saine", _owner_clause(owner_id))
                                .order_by(Plant.id)).all()
            if not plants:
                return tx["none_sick"]
            return tx["sick"].format(items=", ".join(
                f"{p.name} ({PLANT_STATUS_LABELS[p.status][lang]})" for p in plants))

        # 5) Conseils d'arrosage
        if any(w in q for w in WATER_KEYWORDS):
            return tx["watering"]

        return tx["default"].format(q=question)


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
