"""Garde-fous de charge de la voix : concurrence plafonnée et cache des synthèses.
Les quotas par utilisateur sont dans app/core/ratelimit.py (partagés avec l'assistant LLM)."""
import hashlib
import threading
from collections import OrderedDict
from typing import Optional

from app.core.exceptions import ServiceUnavailableError
from app.core.ratelimit import UsageLimiter  # noqa: F401  (réexporté)
from app.voice.contracts import SpeechAudio


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
