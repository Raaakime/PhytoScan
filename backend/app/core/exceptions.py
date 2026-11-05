"""Erreurs métier : les services les lèvent, main.py les transforme en réponses HTTP.

Cela évite de mélanger la logique métier (services) et le protocole HTTP (routes).
"""


class AppError(Exception):
    """Erreur de base avec un code HTTP et un message lisible."""
    status_code = 400

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppError):
    status_code = 404


class BadRequestError(AppError):
    status_code = 400


class UnauthorizedError(AppError):
    status_code = 401


class ConflictError(AppError):
    status_code = 409
