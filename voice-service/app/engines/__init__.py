"""Construction des moteurs d'après la configuration."""
from dataclasses import dataclass
from typing import Optional

from app.config import Settings
from app.engines.base import STTEngine, TTSEngine


@dataclass
class Engines:
    stt: Optional[STTEngine] = None
    tts: Optional[TTSEngine] = None


def build_engines(settings: Settings) -> Engines:
    if settings.ENGINE == "fake":
        from app.engines.fake import FakeSTT, FakeTTS

        return Engines(stt=FakeSTT() if settings.STT_ENABLED else None,
                       tts=FakeTTS() if settings.TTS_ENABLED else None)

    from app.engines.hf import SpeechT5TTS, WhisperSTT, resolve_device

    device = resolve_device(settings.DEVICE)
    return Engines(
        stt=WhisperSTT(settings, device) if settings.STT_ENABLED else None,
        tts=SpeechT5TTS(settings, device) if settings.TTS_ENABLED else None,
    )
