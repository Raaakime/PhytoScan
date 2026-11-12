# PhytoScan AI – Back-end (FastAPI)

API du projet PhytoScan : diagnostic de maladies de plantes par IA, carnet de santé des cultures,
assistant écrit multilingue (Français / Wolof / Anglais), voix en français/anglais et authentification JWT.

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
par défaut ; le mode simulation reste disponible depuis la modale Octopus.

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
| « Tester la connectivité » (modale Octopus) | `GET /phytoscan/v1/health` |

Langue : ajouter `?lang=fr|wo|en` à chaque requête (sinon l'en-tête `Accept-Language`, puis le français).

## Assistant vocal Push-to-Talk

Le parcours vocal utilise l'API FastAPI, sans envoyer de clé fournisseur au navigateur :

1. `GET /phytoscan/v1/voice/status` indique si les fournisseurs sont configurés.
2. `POST /phytoscan/v1/voice/chat` reçoit `audio` (multipart), `language` (`fr` ou `en`) et un `session_id` facultatif.
3. Le serveur valide le conteneur, le type MIME, la taille et la durée, transmet l'audio à OpenAI STT, réutilise `assistant_service.ask`, puis demande l'audio de réponse à ElevenLabs.
4. La réponse contient `transcript`, `text`, `sessionId` et `audioBase64` (MP3). L'audio n'est pas conservé sur disque.

Installer les dépendances, puis ajouter au fichier `.env` :

```env
VOICE_ENABLED=true
VOICE_STT_PROVIDER=openai
VOICE_TTS_PROVIDER=elevenlabs
OPENAI_API_KEY=...
OPENAI_STT_MODEL=gpt-transcribe
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_TTS_MODEL=eleven_v4_turbo
VOICE_MAX_AUDIO_MB=8
VOICE_MAX_AUDIO_SECONDS=60
VOICE_PROVIDER_TIMEOUT_SECONDS=45
```

Le service Push-to-Talk reste désactivé si `VOICE_ENABLED=false` ou si une clé/voix requise manque ; l'assistant textuel continue de fonctionner. L'endpoint Push-to-Talk exige une session authentifiée, même si `AUTH_REQUIRED=false`, afin de limiter l'utilisation anonyme des API facturées. Les enregistrements sont transmis à OpenAI et ElevenLabs et ne sont pas persistés localement ; la transcription et la réponse textuelle restent dans l'historique chat du compte. La reconnaissance de la parole reste limitée au français et à l'anglais. La réponse vocale utilise le moteur à règles existant, pas un LLM, et ne tient donc pas compte d'un historique conversationnel au-delà de l'identifiant de session enregistré.

### Synthèse vocale wolof (prototype)

Les réponses écrites en wolof peuvent être lues à la demande avec le modèle communautaire [Wolof Pocket TTS](https://huggingface.co/abdazizsall/wolof-pocket-tts). Cette synthèse locale ne transcrit pas la parole : le Push-to-Talk en wolof reste désactivé. Le dépôt Hugging Face est soumis à acceptation préalable de ses conditions ; sa licence affichée est CC-BY-SA-4.0. Vérifier les obligations d'attribution et de partage à l'identique avec votre conseil avant toute redistribution ou usage commercial. La voix de référence doit être un enregistrement local d'un locuteur ayant donné son consentement éclairé.

1. Accepter les conditions d'accès du modèle sur Hugging Face et installer le paquet optionnel depuis `backend` :

```powershell
pip install -r requirements-voice-wolof.txt
```

2. Créer un jeton Hugging Face autorisé et enregistrer un court prompt de voix (WAV, 3 à 10 secondes) avec le consentement du locuteur. Le jeton est un secret : ne pas le committer.
3. Configurer le `.env` du backend puis redémarrer l'API :

```env
WOLOF_TTS_ENABLED=true
HF_TOKEN=your_huggingface_token
WOLOF_TTS_MODEL_CONFIG=hf://abdazizsall/wolof-pocket-tts/config.yaml
WOLOF_TTS_VOICE_PROMPT=C:\chemin\absolu\vers\voix-consentie.wav
```

Le premier clic sur « Lire la réponse » télécharge les poids du modèle depuis Hugging Face et les garde en mémoire ; prévoir plusieurs centaines de Mo et assez de RAM. L'API authentifiée `POST /assistant/speech` renvoie un WAV non mis en cache. Les tests simulent le modèle ; la qualité wolof, la prononciation des nombres et les recommandations doivent être vérifiées avec des locuteurs wolophones avant de présenter cette fonction comme production-ready. Ne pas activer sans acceptation des conditions, vérification de licence, prompt vocal autorisé et validation humaine.

Le compte peut choisir le wolof comme langue préférée ; ce choix préremplit la langue de l'assistant et les libellés de statut des plantes. Les traductions wolof de l'interface, de l'assistant et des fiches de maladies sont des ébauches techniques, non certifiées : un locuteur wolof et un agronome doivent les relire avant la production, surtout les recommandations phytosanitaires. Le seeding ajoute les traductions manquantes et complète les champs wolof vides des bases déjà initialisées sans écraser les champs non vides. Après les migrations, mettre à jour une base existante avec `python -m app.db.seed --no-demo`.

Aux tarifs affichés lors de l'intégration, 10 secondes de transcription coûtent environ 0,00075 $ avec OpenAI `gpt-transcribe`, et 1 000 caractères de réponse environ 0,04 $ avec ElevenLabs v4 Turbo (hors taxes, quota/plan fournisseur et coût d'hébergement). Le coût fournisseur estimatif est donc d'environ 0,041 $ pour une réponse de 1 000 caractères. Vérifier les tarifs avant mise en production : [OpenAI STT](https://developers.openai.com/api/docs/models/gpt-transcribe), [ElevenLabs API](https://elevenlabs.io/pricing/api).

Le frontend nécessite l'accès au microphone via HTTPS (ou `localhost`) et une prise en charge navigateur de `MediaRecorder`. Exécuter `python -m pytest` pour les tests backend ; les fournisseurs sont simulés pendant les tests.

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
  utils/     stockage des images
```

## Points d'attention

- Le classifieur « mock » n'est PAS une vraie IA (heuristique sur les couleurs) : il sert uniquement à tester le flux.
- Les traductions wolof du dépôt sont des ébauches à valider par un locuteur et un agronome avant production.
- Les migrations Alembic seront ajoutées avant le déploiement (aujourd'hui : `create_all` au démarrage).
