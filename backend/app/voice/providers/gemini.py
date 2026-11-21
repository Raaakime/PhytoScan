"""Reconnaissance et synthèse vocales avec Gemini (une seule clé pour la voix et l'assistant)."""
import base64

from app.core.exceptions import UpstreamServiceError
from app.integrations.gemini import GeminiClient, as_wav, output_audio, output_text
from app.integrations.http import log
from app.voice.contracts import SpeechAudio

_LANGUAGE_CODES = {"fr": "fr-FR", "en": "en-US"}


class GeminiSpeechToText:
    name = "gemini"

    def __init__(self, client: GeminiClient, *, model: str, vocabulary: list[str]):
        self._client = client
        self._model = model
        self._vocabulary = vocabulary

    def is_ready(self) -> bool:
        return self._client.configured

    def transcribe(self, wav: bytes, language: str) -> str:
        config: dict = {"language_codes": [_LANGUAGE_CODES[language]] if language in _LANGUAGE_CODES else [],
                        "mode": "verbatim"}
        if self._vocabulary:
            config["custom_vocabulary"] = self._vocabulary   # oriente la reconnaissance vers le vocabulaire agricole
        interaction = self._client.interact("STT gemini", {
            "model": self._model,
            "input": [{"type": "audio", "data": base64.b64encode(wav).decode("ascii"), "mime_type": "audio/wav"}],
            "generation_config": {"transcription_config": config},
        })
        return output_text(interaction)


class GeminiTextToSpeech:
    name = "gemini"

    def __init__(self, client: GeminiClient, *, model: str, voice: str, styles: dict[str, str]):
        self._client = client
        self._model = model
        self._voice = voice
        self._styles = styles

    def is_ready(self) -> bool:
        return self._client.configured

    def synthesize(self, text: str, language: str) -> SpeechAudio:
        part: dict = {"type": "text", "text": text}   # le texte est lu tel quel : la diction se règle dans `style`
        if style := self._styles.get(language):
            part["annotations"] = [{"type": "speech_metadata", "style": style}]
        interaction = self._client.interact("TTS gemini", {
            "model": self._model,
            "input": [{"type": "user_input", "content": [part]}],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": self._voice}]},
        })
        audio = output_audio(interaction)
        if audio is None:
            log.error("TTS gemini : aucune piste audio dans la réponse (statut %s)", interaction.get("status"))
            raise UpstreamServiceError("Le service de synthèse vocale n'a renvoyé aucun audio.")
        data, mime_type = audio
        return SpeechAudio(content=as_wav(data, mime_type), mime_type="audio/wav")
