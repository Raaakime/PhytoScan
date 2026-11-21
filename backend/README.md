# PhytoScan AI – Back-end (FastAPI)

API du projet PhytoScan : diagnostic de maladies de plantes par IA, carnet de santé des cultures,
assistant multilingue (Français / Wolof / Anglais) et authentification JWT.

## Démarrage rapide (Windows)

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

- Documentation interactive : http://localhost:8000/docs
- Au premier lancement : tables créées + 3 plantes et 4 maladies de démonstration (issues de `mockData.js`).
- Tests : `python -m pytest`

## Démarrage rapide (Linux / macOS)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Pour une base existante gérée par Alembic, appliquez les migrations avant de lancer l'API :
`alembic upgrade head`. La migration `0002` ajoute les champs d'exploitation et de profil agricole.
Si une base de développement a déjà été créée par `create_all` et ne contient pas la table
`alembic_version`, sauvegardez-la puis marquez le schéma initial avant d'appliquer la migration :
`alembic stamp 0001` puis `alembic upgrade head`. Une base neuve doit utiliser directement
`alembic upgrade head` ou laisser `AUTO_CREATE_TABLES=true` créer le schéma en développement.

## Brancher le front

Le front utilise par défaut `http://localhost:8000/phytoscan/v1`. Vous pouvez définir
`VITE_API_BASE_URL` dans `frontend/.env.local` pour changer cette adresse. Le mode Live est sélectionné
par défaut ; le mode simulation reste disponible depuis la modale PhytoScan.

En développement, gardez `AUTH_REQUIRED=false` dans le back : l'inscription, la connexion JWT et les
routes de plantes fonctionnent déjà avec les jetons transmis par le front. Les appels scan et assistant
envoient également ce jeton lorsqu'une session existe.

| Appel du front | Route back |
|---|---|
| `analyzePlantImage()` | `POST /phytoscan/v1/scan/diagnose` (multipart : `image`, `model`, `include_recommendations`) |
| `askOctopusAssistant()` | `POST /phytoscan/v1/assistant/ask` (JSON : `question`, `language`, `context`) |
| Bouton « Enregistrer dans le carnet » | `POST /phytoscan/v1/scan/{analysisId}/save` (JSON : `plantId`) |
| `INITIAL_PLANTS` | `GET /phytoscan/v1/plants`, `GET /plants/{id}` |
| `COMMON_DISEASES` | `GET /phytoscan/v1/diseases` |
| `onSaveDiagnosticToPlant()` | `POST /phytoscan/v1/plants/{id}/diagnostics` (JSON : `diseaseName`, `confidence`, `date`) |
| Ajout d'une culture (`handleAddPlant`) | `POST /phytoscan/v1/plants` (JSON : `name`, `species`, `variety`, `plot`) |
| Alertes du panneau de droite de l'assistant | `GET /phytoscan/v1/alerts` |
| `ASSISTANT_LANGUAGES`, `SAMPLE_QUESTIONS` | `GET /phytoscan/v1/assistant/languages`, `GET /assistant/suggestions?language=fr` |
| « Tester la connectivité » (modale IA V3 EfficientNetB0) | `GET /phytoscan/v1/health` |

Langue : ajouter `?lang=fr|wo|en` à chaque requête (sinon l'en-tête `Accept-Language`, puis le français).

## Assistant vocal (français, anglais, wolof)

```
 navigateur ──audio (WebM/MP4)──▶  POST /voice/chat ──▶  décodage + validation (PyAV, WAV 16 kHz)
   (micro)                                                      │
                                                               ▼
              fr / en : API compatible OpenAI (STT)      wo : microservice voice-service (STT)
                                                               │
                              assistant_service.ask (réponses guidées, historique du compte)
                                                               │
              fr / en : OpenAI TTS ou ElevenLabs         wo : microservice voice-service (TTS)
                                                               ▼
 navigateur ◀── JSON { transcript, text, audioBase64, audioError } ──
```

| Route | Rôle |
|---|---|
| `GET /voice/status` | Ce qui est disponible, **langue par langue** (`stt` = micro, `tts` = lecture). Le front masque le reste. |
| `POST /voice/chat` | Question parlée (`audio`, `language` = `fr`/`en`/`wo`, `session_id` facultatif) → transcription, réponse écrite, réponse parlée. |
| `POST /voice/speech` | Lit un texte à voix haute (bouton « Écouter »). Texte coupé à la dernière phrase entière au-delà de `VOICE_TTS_MAX_CHARS`. |

Garanties du module :

- **Authentification obligatoire** sur `/voice/chat` et `/voice/speech` (même avec `AUTH_REQUIRED=false`), car ces routes coûtent de l'argent ou du calcul.
- **Quotas par utilisateur** (`VOICE_RATE_LIMIT_PER_MINUTE`, `VOICE_DAILY_QUOTA`) → `429` + `Retry-After`. **Plafond de concurrence** (`VOICE_MAX_CONCURRENT`) → `503` + `Retry-After` plutôt que de bloquer l'API. Ces compteurs sont en mémoire et propres à chaque processus : avec N workers uvicorn, le plafond réel est multiplié par N (passer à Redis si besoin).
- **Audio contrôlé avant tout appel payant** : format reconnu d'après les premiers octets, taille, durée (mesurée en décodant : les WebM de Chrome/Firefox n'ont pas de durée dans l'en-tête), silence, niveau normalisé. Les moteurs reçoivent toujours du WAV 16 kHz mono.
- **La voix est un confort** : si la synthèse échoue, la réponse écrite est quand même renvoyée avec `audioError`.
- **Rien n'est conservé** : ni l'audio envoyé, ni l'audio généré (cache mémoire LRU borné). La transcription et la réponse écrite sont enregistrées dans l'historique du compte, comme le chat écrit.
- **Transcriptions adaptées à l'assistant** : « plante deux » devient « plante 2 » (français, anglais, wolof).
- **Lecture adaptée à l'oreille** : « 74/100 » → « 74 sur 100 », dates, pourcentages, noms latins retirés, nombres lus en wolof.
- Journaux `phytoscan.voice` : durées par étape et statuts des fournisseurs (jamais le contenu des échanges).

### Français et anglais

```env
VOICE_ENABLED=true
VOICE_OPENAI_API_KEY=sk-...
VOICE_STT_MODEL=gpt-4o-mini-transcribe
VOICE_TTS_MODEL=gpt-4o-mini-tts
VOICE_TTS_VOICE=nova
```

`VOICE_OPENAI_BASE_URL` accepte toute passerelle qui expose `/audio/transcriptions` et `/audio/speech`. Pour une voix ElevenLabs : `VOICE_TTS_PROVIDER=elevenlabs` + `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`. **Vérifiez les noms de modèles et les tarifs chez votre fournisseur avant la mise en production** : ils changent régulièrement. Les consignes de diction (`VOICE_TTS_INSTRUCTIONS_FR/EN`) ne sont comprises que par les modèles qui les gèrent (laisser vide pour `tts-1`).

À savoir : l'audio des utilisateurs est transmis au fournisseur choisi (hors de l'UE pour OpenAI/ElevenLabs). Informez les utilisateurs et vérifiez la conformité avec la réglementation sur les données personnelles applicable à votre déploiement.

### Wolof

Aucune API cloud grand public ne gère correctement le wolof. La reconnaissance et la synthèse tournent donc dans un **microservice dédié** (dossier [`voice-service/`](../voice-service/README.md)) avec des modèles ouverts. Le backend ne fait que l'appeler :

```env
VOICE_WOLOF_SERVICE_URL=http://voice-service:8080
VOICE_WOLOF_SERVICE_TOKEN=le-même-jeton-que-le-microservice
```

Sans `VOICE_WOLOF_SERVICE_URL`, le wolof reste utilisable par écrit uniquement ; le front le sait grâce à `/voice/status`. Le backend vérifie la disponibilité du microservice (`/ready`, mis en cache 15 s).

### Tests

`python -m pytest tests/test_voice_*.py` : aucun appel réseau (faux moteurs et `httpx.MockTransport`). Les tests couvrent l'audio (dont un WebM sans durée d'en-tête, comme Chrome), le texte, les quotas, les fournisseurs et l'API de bout en bout.

## Migrations (Alembic)

Le schéma est géré par Alembic (`alembic/versions/`). L'URL vient de `DATABASE_URL`, comme l'application.

```bat
alembic upgrade head                               :: crée / met à jour les tables
alembic revision --autogenerate -m "description"   :: après toute modification d'un modèle
alembic downgrade -1                               :: annule la dernière migration
alembic upgrade head --sql                         :: affiche le SQL sans l'exécuter
```

Un test (`tests/test_migrations.py`) échoue si un modèle est modifié sans migration correspondante.
Vérifié : SQLite (montée, descente, absence de dérive) ; le SQL PostgreSQL et MySQL est généré sans erreur,
mais n'a PAS été exécuté sur de vrais serveurs : à valider sur votre base de test avant la production.
Pour MySQL, ajouter `?charset=utf8mb4` à l'URL (accents et wolof).

## Checklist de production

- `ENVIRONMENT=prod` : le serveur refuse de démarrer avec la `SECRET_KEY` par défaut.
- `DATABASE_URL` PostgreSQL ou MySQL + pilote de `requirements-prod.txt`.
- `AUTO_CREATE_TABLES=false` et `SEED_DEMO_PLANTS=false` ; lancer `alembic upgrade head` avant le démarrage.
- `CORS_ORIGINS` = adresse réelle du front.
- `AUTH_REQUIRED=true` peut être activé une fois le flux d'inscription et de connexion vérifié ; les routes
  d'authentification `/auth/register` et `/auth/login` restent accessibles pour créer une session.
- Sauvegarder le dossier `uploads/` (images des scans) et la base.
- `Dockerfile` fourni (migrations puis serveur) : non testé dans l'environnement de développement.

## Changer de base de données

Modifier uniquement `DATABASE_URL` dans `.env` (voir `.env.example`) et installer le pilote
correspondant (`requirements-prod.txt`). Choisir UNE base de production : PostgreSQL (recommandé) ou MySQL.

## Remplacer le modèle IA de test

1. Déposer le modèle ONNX dans `app/ml/weights/model.onnx`.
2. Mettre dans `app/ml/labels.json` les codes de maladies dans l'ordre des sorties du modèle
   (chaque code doit exister dans la table `diseases`).
3. `.env` : `ML_MODEL_BACKEND=custom`, puis `pip install onnxruntime numpy`.
4. Adapter `app/ml/preprocessing.py` (taille, normalisation) à votre entraînement.

## Authentification

Complète côté back (inscription, connexion, refresh, `/auth/me`). Tant que `AUTH_REQUIRED=false`,
les routes restent utilisables sans connexion. Un utilisateur connecté ne voit que ses propres plantes ;
sans connexion, on voit les plantes de démonstration.

## Structure

```
app/
  core/      config, sécurité (JWT/bcrypt), i18n, exceptions
  db/        session, base, seed (données de démonstration)
  models/    tables SQLAlchemy
  schemas/   formats JSON (camelCase comme le front)
  services/  logique métier
  api/       dépendances + routes v1
  ml/        classifieurs (mock / custom), prétraitement, labels
  voice/     assistant vocal : audio, texte, fournisseurs, quotas, pipeline
  utils/     stockage des images
```

## Points d'attention

- Le classifieur « mock » n'est PAS une vraie IA (heuristique sur les couleurs) : il sert uniquement à tester le flux.
- Les textes wolof sont à faire valider par un locuteur ; sans traduction, l'API retombe sur le français.
- Les migrations Alembic seront ajoutées avant le déploiement (aujourd'hui : `create_all` au démarrage).
