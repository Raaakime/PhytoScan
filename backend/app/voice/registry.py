"""Choisit, d'après la configuration, le moteur de reconnaissance et de synthèse de chaque langue."""
import logging
from dataclasses import dataclass, field
from typing import Optional

from app.core.config import Settings
from app.voice.contracts import SpeechToText, TextToSpeech
from app.voice.providers.elevenlabs import ElevenLabsTextToSpeech
from app.voice.providers.openai_compatible import OpenAISpeechToText, OpenAITextToSpeech
from app.voice.providers.wolof_service import WolofSpeechToText, WolofTextToSpeech, WolofVoiceClient

log = logging.getLogger("phytoscan.voice")

SUPPORTED_LANGUAGES = ("fr", "en", "wo")


@dataclass(frozen=True)
class LanguageVoice:
    stt: Optional[SpeechToText] = None
    tts: Optional[TextToSpeech] = None


@dataclass
class VoiceRegistry:
    voices: dict[str, LanguageVoice]
    _closeables: list = field(default_factory=list)

    def get(self, language: str) -> LanguageVoice:
        return self.voices.get(language, LanguageVoice())

    def close(self) -> None:
        for item in self._closeables:
            item.close()


def build_registry(settings: Settings) -> VoiceRegistry:
    timeout = settings.VOICE_PROVIDER_TIMEOUT_SECONDS
    closeables: list = []

    # --- français / anglais -------------------------------------------------------------------------
    stt: Optional[SpeechToText] = None
    if settings.VOICE_STT_PROVIDER == "openai":
        stt = OpenAISpeechToText(
            base_url=settings.VOICE_OPENAI_BASE_URL, api_key=settings.VOICE_OPENAI_API_KEY.get_secret_value(),
            model=settings.VOICE_STT_MODEL, timeout=timeout,
            prompts={"fr": settings.VOICE_STT_PROMPT_FR, "en": settings.VOICE_STT_PROMPT_EN},
        )
        closeables.append(stt)

    tts: Optional[TextToSpeech] = None
    if settings.VOICE_TTS_PROVIDER == "openai":
        tts = OpenAITextToSpeech(
            base_url=settings.VOICE_OPENAI_BASE_URL, api_key=settings.VOICE_OPENAI_API_KEY.get_secret_value(),
            model=settings.VOICE_TTS_MODEL, voice=settings.VOICE_TTS_VOICE, timeout=timeout,
            instructions={"fr": settings.VOICE_TTS_INSTRUCTIONS_FR, "en": settings.VOICE_TTS_INSTRUCTIONS_EN},
        )
        closeables.append(tts)
    elif settings.VOICE_TTS_PROVIDER == "elevenlabs":
        tts = ElevenLabsTextToSpeech(
            api_key=settings.ELEVENLABS_API_KEY.get_secret_value(), voice_id=settings.ELEVENLABS_VOICE_ID,
            model=settings.ELEVENLABS_TTS_MODEL, timeout=timeout,
        )
        closeables.append(tts)

    voices = {"fr": LanguageVoice(stt, tts), "en": LanguageVoice(stt, tts)}

    # --- wolof : microservice d'inférence ------------------------------------------------------------
    if settings.VOICE_WOLOF_SERVICE_URL:
        client = WolofVoiceClient(
            base_url=settings.VOICE_WOLOF_SERVICE_URL, timeout=settings.VOICE_WOLOF_TIMEOUT_SECONDS,
            token=settings.VOICE_WOLOF_SERVICE_TOKEN.get_secret_value(),
        )
        closeables.append(client)
        voices["wo"] = LanguageVoice(WolofSpeechToText(client), WolofTextToSpeech(client))
    else:
        voices["wo"] = LanguageVoice()

    return VoiceRegistry(voices=voices, _closeables=closeables)
