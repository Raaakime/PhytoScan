"""Garde-fous de coût et de charge : quotas par utilisateur, concurrence plafonnée, cache des synthèses.

Tout est en mémoire et propre à UN processus uvicorn. Avec plusieurs workers, chaque processus applique ses
propres plafonds (le quota réel est donc multiplié par le nombre de workers) : voir backend/README.md pour
passer à Redis si nécessaire.
"""
import hashlib
import threading
import time
from collections import OrderedDict, deque
from datetime import date
from typing import Callable, Optional

from app.core.exceptions import ServiceUnavailableError, TooManyRequestsError
from app.voice.contracts import SpeechAudio


class UsageLimiter:
    """Fenêtre glissante d'une minute + quota journalier, par clé (identifiant utilisateur)."""

    MAX_TRACKED_KEYS = 10_000

    def __init__(self, per_minute: int, per_day: int, *, clock: Callable[[], float] = time.monotonic,
                 today: Callable[[], date] = date.today):
        self._per_minute = per_minute
        self._per_day = per_day
        self._clock = clock
        self._today = today
        self._lock = threading.Lock()
        self._recent: dict[str, deque[float]] = {}
        self._daily: dict[str, tuple[date, int]] = {}

    def check(self, key: str) -> None:
        """Compte une requête ; lève 429 (avec Retry-After) si un plafond est dépassé."""
        now, today = self._clock(), self._today()
        with self._lock:
            if len(self._recent) > self.MAX_TRACKED_KEYS:
                self._recent.clear()
                self._daily.clear()

            if self._per_day:
                day, count = self._daily.get(key, (today, 0))
                if day != today:
                    count = 0
                if count >= self._per_day:
                    raise TooManyRequestsError(
                        "Vous avez atteint la limite quotidienne de requêtes vocales. Utilisez la saisie écrite "
                        "ou revenez demain.", retry_after=3600)
                self._daily[key] = (today, count + 1)

            if self._per_minute:
                window = self._recent.setdefault(key, deque())
                while window and now - window[0] >= 60:
                    window.popleft()
                if len(window) >= self._per_minute:
                    retry = int(60 - (now - window[0])) + 1
                    if self._per_day:  # la requête refusée ne consomme pas le quota du jour
                        self._daily[key] = (today, self._daily[key][1] - 1)
                    raise TooManyRequestsError(
                        "Trop de requêtes vocales en peu de temps. Patientez quelques secondes.", retry_after=retry)
                window.append(now)


class ConcurrencyGate:
    """Refuse immédiatement (503 + Retry-After) quand toutes les places sont prises, au lieu de bloquer un
    thread du pool partagé par toute l'API."""

    def __init__(self, max_concurrent: int):
        self._semaphore = threading.BoundedSemaphore(max(1, max_concurrent))

    def __enter__(self) -> "ConcurrencyGate":
        if not self._semaphore.acquire(blocking=False):
            raise ServiceUnavailableError(
                "L'assistant vocal est très sollicité en ce moment. Réessayez dans quelques secondes.",
                headers={"Retry-After": "5"})
        return self

    def __exit__(self, *exc) -> None:
        self._semaphore.release()


class SpeechCache:
    """Cache LRU des synthèses (même texte + même langue = même audio) : la relecture d'une réponse est gratuite."""

    def __init__(self, max_entries: int, max_bytes: int = 32 * 1024 * 1024):
        self._max_entries = max_entries
        self._max_bytes = max_bytes
        self._bytes = 0
        self._items: OrderedDict[str, SpeechAudio] = OrderedDict()
        self._lock = threading.Lock()

    @staticmethod
    def key(language: str, text: str) -> str:
        return hashlib.sha256(f"{language}\x00{text}".encode()).hexdigest()

    def get(self, key: str) -> Optional[SpeechAudio]:
        with self._lock:
            item = self._items.get(key)
            if item is not None:
                self._items.move_to_end(key)
            return item

    def put(self, key: str, audio: SpeechAudio) -> None:
        if self._max_entries <= 0 or len(audio.content) > self._max_bytes:
            return
        with self._lock:
            if key in self._items:
                self._bytes -= len(self._items.pop(key).content)
            self._items[key] = audio
            self._bytes += len(audio.content)
            while len(self._items) > self._max_entries or self._bytes > self._max_bytes:
                _, evicted = self._items.popitem(last=False)
                self._bytes -= len(evicted.content)
