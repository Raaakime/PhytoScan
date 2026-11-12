"""Adaptateur local Text-to-Speech pour le modèle Pocket TTS Wolof."""
import io
import os
import threading
import wave
from functools import lru_cache

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError, UpstreamServiceError

_model_lock = threading.Lock()


@lru_cache(maxsize=1)
def _load_model():
    settings = get_settings()
    previous_token = os.environ.get("HF_TOKEN")
    if not previous_token:
        os.environ["HF_TOKEN"] = settings.HF_TOKEN

    try:
        from huggingface_hub.errors import HfHubHTTPError
        from pocket_tts import TTSModel
        import torch
    except ImportError as exc:
        if not previous_token:
            os.environ.pop("HF_TOKEN", None)
        raise ServiceUnavailableError(
            "La synthèse wolof nécessite l'installation de backend/requirements-voice-wolof.txt."
        ) from exc

    try:
        model = TTSModel.load_model(config=settings.WOLOF_TTS_MODEL_CONFIG)
        voice_state = model.get_state_for_audio_prompt(settings.WOLOF_TTS_VOICE_PROMPT)
    except (HfHubHTTPError, OSError, RuntimeError, ValueError) as exc:
        raise UpstreamServiceError(
            "Impossible de charger le modèle Wolof Pocket TTS. Vérifiez l'accès Hugging Face, "
            "l'acceptation des conditions du modèle, sa configuration et le fichier de voix."
        ) from exc
    finally:
        if not previous_token:
            os.environ.pop("HF_TOKEN", None)

    return model, voice_state, torch.int16


def synthesize(text: str) -> bytes:
    settings = get_settings()
    if (
        not settings.WOLOF_TTS_ENABLED
        or not settings.HF_TOKEN
        or not settings.WOLOF_TTS_VOICE_PROMPT
    ):
        raise ServiceUnavailableError(
            "La synthèse vocale wolof n'est pas configurée. Activez WOLOF_TTS_ENABLED, "
            "fournissez un jeton Hugging Face autorisé et un prompt vocal dont le locuteur "
            "a consenti à cet usage."
        )

    with _model_lock:
        model, voice_state, int16 = _load_model()
        try:
            audio = model.generate_audio(voice_state, text)
            samples = (audio.clamp(-1, 1) * 32767).to(dtype=int16)
            pcm = samples.cpu().numpy().tobytes()
        except (OSError, RuntimeError, ValueError) as exc:
            raise UpstreamServiceError("La synthèse du texte wolof a échoué.") from exc

        output = io.BytesIO()
        with wave.open(output, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(model.sample_rate)
            wav.writeframes(pcm)
        return output.getvalue()
