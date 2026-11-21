"""Client HTTP de l'API Gemini « Interactions » (POST /v1beta/interactions), sans SDK.

Un seul client sert la reconnaissance vocale, la synthèse vocale et l'assistant texte : même clé, mêmes erreurs.

Forme d'une réponse (d'après la documentation de l'API, à valider par `scripts/check_gemini.py` avec votre clé) :
    {"status": "completed",
     "steps": [{"type": "model_output", "content": [{"type": "text", "text": "..."} | {"type": "audio", "data": "<base64>"}]}]}
Les étapes d'un autre type (ex. « thought », la réflexion du modèle) sont ignorées.
"""
import base64
import io
import wave
from typing import Optional

import httpx

from app.core.exceptions import UpstreamServiceError
from app.integrations.http import call_upstream, log

# Révision de schéma demandée explicitement : la documentation indique que `steps` est le format par défaut,
# l'en-tête garantit qu'une future révision ne change pas silencieusement la forme des réponses.
API_REVISION = "2026-05-20"

PCM_SAMPLE_RATE = 24_000


class GeminiClient:
    def __init__(self, *, base_url: str, api_key: str, timeout: float, client: httpx.Client | None = None):
        self._base = base_url.rstrip("/")
        self._key = api_key
        self._client = client or httpx.Client(timeout=timeout)

    @property
    def configured(self) -> bool:
        return bool(self._key)

    def interact(self, service: str, body: dict) -> dict:
        """Envoie une requête et renvoie l'« interaction » JSON. `service` sert aux journaux (jamais la clé)."""
        def request() -> dict:
            response = self._client.post(
                f"{self._base}/interactions",
                # La clé passe par un en-tête, jamais par l'URL : elle ne finit pas dans les journaux d'accès.
                headers={"x-goog-api-key": self._key, "Api-Revision": API_REVISION},
                json=body,
            )
            response.raise_for_status()
            try:
                return response.json()
            except ValueError as exc:
                raise UpstreamServiceError("Réponse illisible du service Gemini.") from exc

        interaction = call_upstream(service, request)
        status = interaction.get("status")
        if status in ("failed", "cancelled"):
            log.error("%s : interaction %s (%s)", service, status, _short_errors(interaction))
            raise UpstreamServiceError("Le service Gemini n'a pas pu traiter la demande.")
        return interaction

    def close(self) -> None:
        self._client.close()


def _short_errors(interaction: dict) -> str:
    errors = interaction.get("errors") or []
    return "; ".join(str(e.get("code", "?")) for e in errors if isinstance(e, dict))[:200] or "sans détail"


def output_parts(interaction: dict, kind: str) -> list[dict]:
    """Éléments de type `kind` ('text', 'audio') des étapes `model_output`, dans l'ordre."""
    parts = []
    for step in interaction.get("steps") or []:
        if not isinstance(step, dict) or step.get("type") != "model_output":
            continue
        for part in step.get("content") or []:
            if isinstance(part, dict) and part.get("type") == kind:
                parts.append(part)
    return parts


def output_text(interaction: dict) -> str:
    return " ".join(str(p.get("text", "")).strip() for p in output_parts(interaction, "text")).strip()


def output_audio(interaction: dict) -> Optional[tuple[bytes, str]]:
    """Dernier audio produit : (octets, type MIME) ; None si le modèle n'en a pas rendu."""
    parts = output_parts(interaction, "audio")
    if not parts or not parts[-1].get("data"):
        return None
    try:
        return base64.b64decode(parts[-1]["data"]), str(parts[-1].get("mime_type") or "audio/wav")
    except ValueError as exc:
        raise UpstreamServiceError("Audio illisible renvoyé par le service Gemini.") from exc


def as_wav(data: bytes, mime_type: str) -> bytes:
    """Garantit un WAV lisible par tous les navigateurs : un PCM brut (audio/l16) reçoit son en-tête."""
    if data[:4] == b"RIFF":
        return data
    out = io.BytesIO()
    with wave.open(out, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(PCM_SAMPLE_RATE)
        wav.writeframes(data)
    return out.getvalue()
