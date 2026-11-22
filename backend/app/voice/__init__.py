"""Assistant vocal : reconnaissance (STT) -> assistant écrit existant -> synthèse (TTS).

- `contracts`   : interfaces des moteurs (un fournisseur = une classe qui les respecte)
- `providers/`  : OpenAI-compatible, ElevenLabs, microservice wolof
- `registry`    : choisit les moteurs de chaque langue d'après la configuration
- `pipeline`    : enchaîne les étapes, applique quotas, concurrence, cache
- `audio`, `text_prep` : normalisation de l'audio et du texte
"""
