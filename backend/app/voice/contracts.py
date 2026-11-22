"""Interfaces des moteurs vocaux. Ajouter un fournisseur = écrire une classe qui respecte ces protocoles."""
from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class SpeechAudio:
    content: bytes
    mime_type: str


@runtime_checkable
class SpeechToText(Protocol):
    name: str

    def is_ready(self) -> bool:
        """Vrai si le moteur est configuré et joignable (doit être rapide : appelé par /voice/status)."""

    def transcribe(self, wav: bytes, language: str) -> str:
        """`wav` : WAV mono 16 kHz 16 bits. Renvoie le texte reconnu (chaîne vide si rien n'a été compris)."""


@runtime_checkable
class TextToSpeech(Protocol):
    name: str

    def is_ready(self) -> bool: ...

    def synthesize(self, text: str, language: str) -> SpeechAudio:
        """`text` est déjà préparé pour la lecture (voir text_prep.prepare_for_speech)."""
