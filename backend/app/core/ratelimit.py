"""Plafonds d'usage par utilisateur : fenêtre glissante d'une minute + quota journalier.

En mémoire et propres à UN processus uvicorn : avec plusieurs workers, chaque processus applique ses propres
plafonds (le quota réel est multiplié par le nombre de workers). Passer à Redis si besoin.
"""
import threading
import time
from collections import deque
from datetime import date
from typing import Callable

from app.core.exceptions import TooManyRequestsError


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
