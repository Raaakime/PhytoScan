"""Enchaîne reconnaissance -> assistant écrit -> synthèse, avec quotas, plafond de concurrence et cache."""
import logging
import time
from dataclasses import dataclass
from typing import BinaryIO, Optional

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import AppError, BadRequestError, ServiceUnavailableError, UpstreamServiceError
from app.models import User
from app.schemas.assistant import AskResponse
from app.services import assistant_service
from app.voice import audio as audio_tools
from app.voice import text_prep
from app.voice.contracts import SpeechAudio
from app.voice.limits import ConcurrencyGate, SpeechCache, UsageLimiter
from app.voice.registry import SUPPORTED_LANGUAGES, VoiceRegistry

log = logging.getLogger("phytoscan.voice")

MAX_TRANSCRIPT_CHARS = 2000

_LANGUAGE_NAMES = {"fr": "français", "en": "anglais", "wo": "wolof"}


@dataclass(frozen=True)
class VoiceTurn:
    language: str
    transcript: str
    answer: AskResponse
    speech: Optional[SpeechAudio]
    speech_truncated: bool
    audio_error: Optional[str]


def parse_language(value: str) -> str:
    code = (value or "").strip().lower().replace("_", "-").split("-")[0]
    if code not in SUPPORTED_LANGUAGES:
        raise BadRequestError("Langue non prise en charge. Langues vocales : français (fr), anglais (en), wolof (wo).")
    return code


class VoicePipeline:
    def __init__(self, registry: VoiceRegistry, settings: Settings):
        self._registry = registry
        self._settings = settings
        self._limiter = UsageLimiter(settings.VOICE_RATE_LIMIT_PER_MINUTE, settings.VOICE_DAILY_QUOTA)
        self._gate = ConcurrencyGate(settings.VOICE_MAX_CONCURRENT)
        self._cache = SpeechCache(settings.VOICE_TTS_CACHE_ENTRIES)

    # ------------------------------------------------------------------ état
    def status(self) -> dict:
        languages = {}
        for code in SUPPORTED_LANGUAGES:
            voice = self._registry.get(code)
            languages[code] = {
                "stt": self._settings.VOICE_ENABLED and bool(voice.stt and voice.stt.is_ready()),
                "tts": self._settings.VOICE_ENABLED and bool(voice.tts and voice.tts.is_ready()),
            }
        return {
            "enabled": any(item["stt"] or item["tts"] for item in languages.values()),
            "requires_auth": True,
            "max_recording_seconds": self._settings.VOICE_MAX_AUDIO_SECONDS,
            "max_speech_chars": self._settings.VOICE_TTS_MAX_CHARS,
            "languages": languages,
        }

    # ------------------------------------------------------------------ question parlée
    def converse(self, db: Session, stream: BinaryIO, language: str, session_id: Optional[str],
                 user: User) -> VoiceTurn:
        language = parse_language(language)
        voice = self._registry.get(language)
        self._require(voice.stt, language, "la reconnaissance vocale")
        self._limiter.check(f"user:{user.id}")

        with self._gate:
            started = time.perf_counter()
            recording = audio_tools.load_recording(
                stream, max_mb=self._settings.VOICE_MAX_AUDIO_MB,
                min_seconds=self._settings.VOICE_MIN_AUDIO_SECONDS,
                max_seconds=self._settings.VOICE_MAX_AUDIO_SECONDS,
            )
            decoded = time.perf_counter()
            transcript = text_prep.normalize_transcript(voice.stt.transcribe(recording.to_wav(), language), language)
            transcribed = time.perf_counter()
            if not transcript:
                raise BadRequestError("Je n'ai pas compris votre question. Parlez plus près du micro et réessayez.")
            if len(transcript) > MAX_TRANSCRIPT_CHARS:
                raise BadRequestError("Votre question est trop longue. Essayez d'être plus concis.")

            answer = assistant_service.ask(db, transcript, language, {}, session_id, user)
            db.close()  # libère la connexion BD avant l'appel de synthèse, qui peut durer plusieurs secondes
            asked = time.perf_counter()

            speech, truncated, error = self._speak_safely(answer.text, language)
            done = time.perf_counter()

        log.info("voice.converse lang=%s audio=%.1fs chars_in=%d chars_out=%d decode=%dms stt=%dms ask=%dms "
                 "tts=%dms speech=%s", language, recording.seconds, len(transcript), len(answer.text),
                 (decoded - started) * 1000, (transcribed - decoded) * 1000, (asked - transcribed) * 1000,
                 (done - asked) * 1000, "ok" if speech else "none")
        return VoiceTurn(language, transcript, answer, speech, truncated, error)

    # ------------------------------------------------------------------ relecture d'un texte
    def speak(self, text: str, language: str, user: User) -> tuple[SpeechAudio, bool]:
        language = parse_language(language)
        self._require(self._registry.get(language).tts, language, "la lecture vocale")
        self._limiter.check(f"user:{user.id}")
        with self._gate:
            return self._synthesize(text, language)

    # ------------------------------------------------------------------ interne
    def _require(self, engine, language: str, label: str) -> None:
        if not self._settings.VOICE_ENABLED:
            raise ServiceUnavailableError("L'assistant vocal est désactivé sur ce serveur.")
        if engine is None or not engine.is_ready():
            raise ServiceUnavailableError(
                f"{label[0].upper()}{label[1:]} n'est pas disponible en {_LANGUAGE_NAMES[language]} pour le moment.")

    def _speak_safely(self, text: str, language: str) -> tuple[Optional[SpeechAudio], bool, Optional[str]]:
        """La voix est un confort : si elle échoue, la réponse écrite reste valable."""
        tts = self._registry.get(language).tts
        if tts is None or not tts.is_ready():
            return None, False, "La lecture vocale n'est pas disponible dans cette langue."
        try:
            speech, truncated = self._synthesize(text, language)
            return speech, truncated, None
        except AppError as exc:
            return None, False, exc.detail

    def _synthesize(self, text: str, language: str) -> tuple[SpeechAudio, bool]:
        prepared = text_prep.prepare_for_speech(text, language)
        prepared, truncated = text_prep.truncate_for_speech(prepared, self._settings.VOICE_TTS_MAX_CHARS)
        if not prepared.strip(" ."):
            raise BadRequestError("Le texte à lire est vide.")
        key = SpeechCache.key(language, prepared)
        cached = self._cache.get(key)
        if cached is not None:
            return cached, truncated
        speech = self._registry.get(language).tts.synthesize(prepared, language)
        if not speech.content:
            raise UpstreamServiceError("Le service de synthèse vocale a renvoyé un audio vide.")
        self._cache.put(key, speech)
        return speech, truncated

    def close(self) -> None:
        self._registry.close()
