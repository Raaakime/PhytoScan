"""Mesure de qualité de la reconnaissance : taux d'erreur de mots (WER)."""
import re
import unicodedata


def normalize(text: str) -> list[str]:
    """Minuscules, sans ponctuation, accents conservés (ils portent le sens en wolof : ñ, ë, é, à, ó...)."""
    text = unicodedata.normalize("NFC", text).casefold()
    return re.sub(r"[^\w\s'-]", " ", text).split()


def word_error_rate(reference: str, hypothesis: str) -> float:
    """(substitutions + suppressions + insertions) / nombre de mots de la référence."""
    ref, hyp = normalize(reference), normalize(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    previous = list(range(len(hyp) + 1))
    for i, ref_word in enumerate(ref, start=1):
        current = [i]
        for j, hyp_word in enumerate(hyp, start=1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ref_word != hyp_word)))
        previous = current
    return previous[-1] / len(ref)
