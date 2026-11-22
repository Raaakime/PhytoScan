"""Gestion commune des erreurs HTTP vers les fournisseurs (journalisation + messages sûrs pour l'utilisateur)."""
import logging
from typing import Callable, TypeVar

import httpx

from app.core.exceptions import AppError, GatewayTimeoutError, ServiceUnavailableError, UpstreamServiceError

log = logging.getLogger("phytoscan.voice")
T = TypeVar("T")

_RETRYABLE = (httpx.ConnectError, httpx.ConnectTimeout, httpx.RemoteProtocolError)


def call_upstream(service: str, action: Callable[[], T], *, attempts: int = 1) -> T:
    """Exécute `action` et traduit toute erreur réseau/HTTP en AppError.

    Seules les erreurs de CONNEXION sont rejouées (la requête n'a alors pas pu être traitée) : relancer après
    un timeout de lecture risquerait de payer deux fois la même synthèse.
    """
    for attempt in range(1, attempts + 1):
        is_last = attempt == attempts
        try:
            return action()
        except AppError:
            raise
        except httpx.ConnectTimeout as exc:
            if not is_last:
                continue
            log.warning("%s : connexion trop lente", service)
            raise GatewayTimeoutError("Le service vocal n'a pas répondu à temps. Réessayez.") from exc
        except httpx.TimeoutException as exc:
            log.warning("%s : délai dépassé (%s)", service, type(exc).__name__)
            raise GatewayTimeoutError("Le service vocal n'a pas répondu à temps. Réessayez.") from exc
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            body = exc.response.text[:300].replace("\n", " ")
            log.error("%s : HTTP %s %s", service, status, body)
            if status in (429, 503):
                retry = exc.response.headers.get("Retry-After", "5")
                raise ServiceUnavailableError(
                    "Le service vocal est très sollicité. Réessayez dans un instant.",
                    headers={"Retry-After": retry if retry.isdigit() else "5"},
                ) from exc
            if status in (401, 403):
                log.critical("%s : identifiants refusés (vérifiez la clé ou le jeton configuré)", service)
            raise UpstreamServiceError("Le service vocal a échoué. Réessayez plus tard.") from exc
        except _RETRYABLE as exc:
            if not is_last:
                continue
            log.error("%s : connexion impossible (%s)", service, type(exc).__name__)
            raise ServiceUnavailableError("Le service vocal est momentanément injoignable.") from exc
        except httpx.HTTPError as exc:
            log.error("%s : erreur réseau (%s)", service, type(exc).__name__)
            raise UpstreamServiceError("Le service vocal a échoué. Réessayez plus tard.") from exc
    raise UpstreamServiceError("Le service vocal a échoué.")  # pragma: no cover
