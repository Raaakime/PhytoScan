"""Préparation du texte autour de la voix.

- `prepare_for_speech` : rend une réponse écrite agréable à écouter (chiffres, symboles, mise en forme).
- `truncate_for_speech` : limite la lecture aux premières phrases entières.
- `normalize_transcript` : corrige ce que les moteurs de reconnaissance écrivent en toutes lettres
  (« plante deux » -> « plante 2 ») pour que l'assistant à mots-clés le comprenne.

ATTENTION : le glossaire et les nombres wolof ci-dessous sont des propositions techniques à faire valider par
un locuteur wolof avant production.
"""
import re
from typing import Tuple

# ----------------------------------------------------------------------------- français / anglais
_MONTHS = {
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre",
           "novembre", "décembre"],
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
           "November", "December"],
}
_SPOKEN = {
    "fr": {"out_of": "sur", "percent": "pour cent", "degrees": "degrés", "plant": "plante"},
    "en": {"out_of": "out of", "percent": "percent", "degrees": "degrees", "plant": "plant"},
}

# « (Solanum lycopersicum) » : genre capitalisé + espèce à terminaison latine. Une parenthèse française
# comme « (Tache foliaire) » est conservée.
_LATIN_BINOMIAL = re.compile(r"\(\s*[A-Z][a-z]{3,}\s+[a-z]{3,}(?:um|us|is|ii|ae|ys|ens|ans|ata|ica|a)\s*\)")
_PARENS_EMPTYISH = re.compile(r"\(\s*\)")
_MARKDOWN = re.compile(r"[*_#`~>|\\]+")
_BULLET = re.compile(r"(?m)^\s*[-•]\s+")
_DATE = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
_SCORE = re.compile(r"(\d+)\s*/\s*100\b")
_PERCENT = re.compile(r"(\d+(?:[.,]\d+)?)\s*%")
_CELSIUS = re.compile(r"(\d+(?:[.,]\d+)?)\s*°\s*C\b")
_PLANT_ID = re.compile(r"\bP-0*(\d+)\b")


def _spoken_date(match: re.Match, language: str) -> str:
    day, month, year = int(match.group(1)), int(match.group(2)), match.group(3)
    if not 1 <= month <= 12:
        return match.group(0)
    names = _MONTHS[language]
    if language == "fr":
        return f"{'1er' if day == 1 else day} {names[month - 1]} {year}"
    return f"{names[month - 1]} {day}, {year}"


def _clean_common(text: str) -> str:
    text = _BULLET.sub("", text)
    text = _MARKDOWN.sub(" ", text)
    return text


def _tidy(text: str) -> str:
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    if text and text[-1] not in ".!?…":
        text += "."
    return text


def prepare_for_speech(text: str, language: str) -> str:
    """Texte prêt pour la synthèse vocale dans `language` ('fr', 'en' ou 'wo')."""
    if language == "wo":
        return _prepare_wolof(text)
    words = _SPOKEN.get(language, _SPOKEN["fr"])
    lang = language if language in _MONTHS else "fr"
    text = _clean_common(text)
    text = _LATIN_BINOMIAL.sub("", text)
    text = _PARENS_EMPTYISH.sub("", text)
    text = _DATE.sub(lambda m: _spoken_date(m, lang), text)
    text = _SCORE.sub(lambda m: f"{m.group(1)} {words['out_of']} 100", text)
    text = _PERCENT.sub(lambda m: f"{m.group(1).replace('.', ',') if lang == 'fr' else m.group(1)} {words['percent']}", text)
    text = _CELSIUS.sub(lambda m: f"{m.group(1)} {words['degrees']}", text)
    text = _PLANT_ID.sub(lambda m: f"{words['plant']} {m.group(1)}", text)
    return _tidy(text)


def truncate_for_speech(text: str, max_chars: int) -> Tuple[str, bool]:
    """Coupe à la dernière phrase entière avant `max_chars`. Renvoie (texte, a_été_coupé)."""
    if len(text) <= max_chars:
        return text, False
    window = text[:max_chars]
    ends = [m.end() for m in re.finditer(r"[.!?…](?:\s|$)", window)]
    if ends and ends[-1] >= max_chars * 0.4:
        return window[: ends[-1]].strip(), True
    cut = window.rsplit(" ", 1)[0] if " " in window else window
    return cut.rstrip(",;: ") + ".", True


# ----------------------------------------------------------------------------- wolof
STATUS_TO_WOLOF = {
    "saine": "wér na lool",
    "plante saine": "garab gi wér na",
    "surveiller": "dafa laaj saytu",
    "à surveiller": "dafa laaj saytu",
    "malade": "dafa feebar",
    "maladie détectée": "am na feebar bu ñu gis",
}
SPECIES_TO_WOLOF = {
    "tomate": "tamaate", "poivron": "poobar", "piment": "kaani", "aubergine": "batañse",
    "pomme de terre": "pombiteer", "oignon": "soble", "salade": "salaat", "concombre": "konkoombar",
    "haricot": "ñebbe", "maïs": "mbaxal", "arachide": "gerte", "mil": "dugub",
}
STAGE_TO_WOLOF = {
    "semis": "tàmbali jëmbët", "germination": "sax gi", "croissance": "màgg gi",
    "croissance végétative": "màggug xob yi", "floraison": "tóor-tóor gi", "fructification": "meññeef gi",
    "maturation": "ñor gi", "récolte": "ngóob mi",
}
_WOLOF_UNITS = ["tus", "benn", "ñaar", "ñett", "ñeent", "juroom", "juroom-benn", "juroom-ñaar", "juroom-ñett",
                "juroom-ñeent"]
_WOLOF_TENS = {10: "fukk", 20: "ñaar-fukk", 30: "ñett-fukk", 40: "ñeent-fukk", 50: "juroom-fukk",
               60: "juroom-benn-fukk", 70: "juroom-ñaar-fukk", 80: "juroom-ñett-fukk", 90: "juroom-ñeent-fukk"}


def _glossary_pattern(*mappings: dict) -> Tuple[re.Pattern, dict]:
    merged = {key.lower(): value for mapping in mappings for key, value in mapping.items()}
    # Les termes les plus longs d'abord : « croissance végétative » doit l'emporter sur « croissance ».
    alternation = "|".join(re.escape(key) for key in sorted(merged, key=len, reverse=True))
    return re.compile(rf"(?<!\w)(?:{alternation})(?!\w)", re.IGNORECASE), merged


_GLOSSARY, _GLOSSARY_MAP = _glossary_pattern(STATUS_TO_WOLOF, SPECIES_TO_WOLOF, STAGE_TO_WOLOF)


def number_to_wolof(n: int) -> str:
    """Écrit un entier de 0 à 999 999 en wolof ; au-delà, chiffre par chiffre."""
    if n < 0:
        return "ñàkk " + number_to_wolof(-n)
    if n < 10:
        return _WOLOF_UNITS[n]
    if n < 100:
        tens, unit = (n // 10) * 10, n % 10
        return _WOLOF_TENS[tens] if unit == 0 else f"{_WOLOF_TENS[tens]} ak {_WOLOF_UNITS[unit]}"
    if n < 1000:
        hundreds, rest = divmod(n, 100)
        head = "téeméer" if hundreds == 1 else f"{_WOLOF_UNITS[hundreds]} téeméer"
        return head if rest == 0 else f"{head} ak {number_to_wolof(rest)}"
    if n < 1_000_000:
        thousands, rest = divmod(n, 1000)
        head = "junni" if thousands == 1 else f"{number_to_wolof(thousands)} junni"
        return head if rest == 0 else f"{head} ak {number_to_wolof(rest)}"
    return " ".join(_WOLOF_UNITS[int(d)] for d in str(n))


def _prepare_wolof(text: str) -> str:
    text = _clean_common(text)
    text = re.sub(r"\([^)]*\)", "", text)                         # noms latins, précisions entre parenthèses
    text = _DATE.sub("", text)                                    # une date dite chiffre par chiffre est inaudible
    text = _GLOSSARY.sub(lambda m: _GLOSSARY_MAP[m.group(0).lower()], text)
    text = re.sub(r"(?<!\w)parcelle(?!\w)", "parsel", text, flags=re.IGNORECASE)
    text = _SCORE.sub(lambda m: f"{m.group(1)} ci téeméer", text)
    text = _PERCENT.sub(lambda m: f"{m.group(1)} pursan", text)
    text = re.sub(r"(?<![\w-])\d+(?![\w-])", lambda m: number_to_wolof(int(m.group(0))), text)
    return _tidy(text)


# ----------------------------------------------------------------------------- transcriptions
_FR_NUMBERS = {"un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7,
               "huit": 8, "neuf": 9, "dix": 10}
_EN_NUMBERS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
               "nine": 9, "ten": 10}
_WO_NUMBERS = {"benn": 1, "ñaar": 2, "ñett": 3, "ñeent": 4, "juroom": 5, "juroom benn": 6, "juroom ñaar": 7,
               "juroom ñett": 8, "juroom ñeent": 9, "fukk": 10}
_NUMBER_WORDS = {"fr": _FR_NUMBERS, "en": _EN_NUMBERS, "wo": _WO_NUMBERS}
_ITEM_WORDS = r"(?:plantes?|plants?|garab|parcelles?|plots?)"


def _number_regex(words: dict) -> re.Pattern:
    alternatives = "|".join(
        re.escape(w).replace(r"\ ", r"[\s-]+") for w in sorted(words, key=len, reverse=True)
    )
    return re.compile(rf"(?<!\w)({_ITEM_WORDS})\s+({alternatives})(?!\w)", re.IGNORECASE)


_NUMBER_PATTERNS = {lang: (_number_regex(words), words) for lang, words in _NUMBER_WORDS.items()}


def normalize_transcript(text: str, language: str) -> str:
    """« Quelle est la santé de la plante deux ? » -> « ... de la plante 2 ? »."""
    text = text.strip()
    entry = _NUMBER_PATTERNS.get(language)
    if not entry:
        return text
    pattern, words = entry

    def to_digit(match: re.Match) -> str:
        key = re.sub(r"[\s-]+", " ", match.group(2).lower())
        return f"{match.group(1)} {words[key]}"

    return pattern.sub(to_digit, text)
