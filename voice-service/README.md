# voice-service — voix wolof de PhytoScan

Petit service HTTP interne qui fait **reconnaissance vocale (STT)** et **synthèse vocale (TTS)** en wolof avec des
modèles ouverts. Le backend PhytoScan l'appelle ; les navigateurs ne le contactent **jamais** directement.

```
navigateur ──▶ backend PhytoScan (auth, quotas, WAV 16 kHz) ──▶ voice-service ──▶ modèles Hugging Face (CPU/GPU)
```

| Route | Entrée | Sortie |
|---|---|---|
| `POST /v1/transcribe` | WAV mono 16 kHz 16 bits (champ `file`) | `{"text", "durationSeconds", "elapsedMs"}` |
| `POST /v1/synthesize` | `{"text": "..."}` (≤ 700 caractères) | `audio/wav` mono 16 kHz |
| `GET /health` | — | liveness |
| `GET /ready` | — | `{"stt": bool, "tts": bool}` (modèles chargés) |

Les deux premières exigent `Authorization: Bearer <VOICE_SERVICE_API_TOKEN>`. Le service refuse de démarrer sans jeton.
Il n'expose pas de documentation OpenAPI. Quand il est saturé (`VOICE_SERVICE_MAX_CONCURRENT`), il répond tout de suite
`503` + `Retry-After` au lieu de mettre les requêtes en file.

## Modèles par défaut

| Rôle | Modèle | Licence | Taille |
|---|---|---|---|
| STT | [`M9and2M/whisper-small-wolof`](https://huggingface.co/M9and2M/whisper-small-wolof) | MIT | 242 M paramètres |
| TTS | [`bilalfaye/speecht5_tts-wolof`](https://huggingface.co/bilalfaye/speecht5_tts-wolof) + vocodeur `microsoft/speecht5_hifigan` | MIT | 144 M + 14 M |

Ils se changent par variables d'environnement (`VOICE_SERVICE_STT_MODEL`, `VOICE_SERVICE_TTS_MODEL`...). Pour ajouter un
autre type de modèle, écrire une classe dans `app/engines/` qui respecte `app/engines/base.py` et l'ajouter à
`build_engines`.

> **Attention aux licences.** L'ancien réglage par défaut du dépôt (`facebook/mms-1b-all`, `facebook/mms-tts-wol`)
> est sous licence **CC-BY-NC (usage non commercial)**. Les modèles ci-dessus sont sous MIT. Vérifiez la licence de
> tout modèle avant de le déployer dans un produit commercial.

## Ce qu'il faut savoir sur la qualité

**La clarté de la voix et la précision de la reconnaissance en wolof dépendent entièrement de ces modèles
communautaires ; ce dépôt ne peut pas la garantir.** Mesurez avant de promettre quoi que ce soit aux utilisateurs :

1. **Voix (TTS)** : `python scripts/check_models.py --out samples/` écrit des `.wav` à faire écouter à plusieurs
   locuteurs wolof (clarté, accent, rythme, mots français mal prononcés). La voix produite est celle d'une
   locutrice de référence américaine (empreinte n°7306 de CMU Arctic) : prévoyez un accent. Pour changer de voix,
   remplacez `speaker.npy` (voir `scripts/fetch_speaker_embedding.py`) par l'empreinte d'un locuteur **ayant consenti**.
2. **Reconnaissance (STT)** : `python scripts/evaluate_stt.py corpus/` calcule le taux d'erreur de mots sur VOS
   enregistrements (questions d'agriculteurs, micro de téléphone, bruit). Les chiffres annoncés sur les fiches des
   modèles viennent d'autres corpus. Comparez plusieurs modèles (`AIHubSN/Kiriku-Wolof-ASR`, plus gros, Apache-2.0,
   accès à accepter sur Hugging Face ; `bilalfaye/wav2vec2-large-mms-1b-wolof`, MIT...).
3. **Textes lus** : les réponses wolof de l'assistant et le glossaire de lecture (`backend/app/voice/text_prep.py`)
   sont des propositions à faire valider par un locuteur wolof et un agronome.

## Déploiement

Prérequis : un hôte avec ~4 Go de RAM libres (CPU suffisant ; un GPU réduit nettement la latence), Docker.

```bash
cd voice-service
export VOICE_SERVICE_API_TOKEN=$(openssl rand -hex 32)       # à reporter dans le backend
docker compose run --rm voice-service python scripts/prefetch_models.py   # ~2 Go, une seule fois
docker compose up -d
curl http://127.0.0.1:8080/ready                              # {"stt":true,"tts":true}
```

Côté backend PhytoScan :

```env
VOICE_ENABLED=true
VOICE_WOLOF_SERVICE_URL=http://voice-service:8080      # ou l'adresse privée de l'hôte
VOICE_WOLOF_SERVICE_TOKEN=<le même jeton>
```

- **Ne publiez jamais ce service sur Internet** : seul le backend doit pouvoir l'atteindre (réseau Docker privé, VPC
  ou pare-feu). Le jeton est une seconde barrière, pas la première.
- `docker-compose.yml` publie le port sur `127.0.0.1` seulement ; adaptez-le à votre réseau.
- Après le préchargement, `HF_HUB_OFFLINE=1` (déjà dans le compose) garantit un démarrage sans réseau.
- **Un seul worker** uvicorn : les modèles sont en mémoire. Pour plus de débit, ajoutez des réplicas derrière un
  répartiteur de charge interne, pas des workers.
- Le premier chargement des modèles prend de quelques secondes à une minute ; `HEALTHCHECK` attend `/ready`.
- Sur GPU : `docker build --build-arg TORCH_INDEX=https://download.pytorch.org/whl/cu126 .` puis `VOICE_SERVICE_DEVICE=cuda`
  (nécessite le runtime NVIDIA de Docker).

## Variables d'environnement

Toutes préfixées `VOICE_SERVICE_` (voir `.env.example`) : `API_TOKEN` (obligatoire), `DEVICE`, `MAX_CONCURRENT`,
`STT_ENABLED`, `TTS_ENABLED`, `STT_MODEL`, `STT_LANGUAGE`, `TTS_MODEL`, `TTS_VOCODER`, `TTS_SPEAKER_EMBEDDING`,
`MAX_AUDIO_SECONDS`, `MAX_TEXT_CHARS`, `HF_TOKEN` (modèle « gated »), `ENGINE` (`hf` ou `fake`).

On peut déployer STT et TTS séparément (`STT_ENABLED=false` ou `TTS_ENABLED=false`) ; `/ready` indique ce qui est actif
et le backend s'adapte langue par langue.

## Développement et tests

```bash
pip install -r requirements-dev.txt
python -m pytest tests -q          # moteurs factices : aucun modèle téléchargé
VOICE_SERVICE_ENGINE=fake VOICE_SERVICE_API_TOKEN=dev uvicorn app.main:app --port 8080
```

Pour essayer les vrais modèles : installer `requirements-models.txt` (et `torch` depuis l'index CPU de PyTorch), puis
`python scripts/prefetch_models.py` et `python scripts/check_models.py --out samples/`.

## Limites connues

- SpeechT5 produit une seule voix, dont le rythme est un peu mécanique ; les nombres et sigles doivent être écrits
  en toutes lettres (le backend s'en charge dans `text_prep.py`).
- Whisper-small découpe l'audio par fenêtres de 30 s : les questions parlées sont limitées à 30 s.
- Le wolof parlé varie beaucoup (accents, mélange avec le français) : attendez-vous à des erreurs sur les noms de
  cultures et de maladies ; l'assistant du backend est conçu pour répondre « je n'ai pas compris » plutôt que de deviner.
