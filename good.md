D’accord, je ne lance pas l’installation. Je vérifie où les dépendances sont déjà déclarées et je vais vous indiquer ce fichier ainsi que la commande à exécuter vous-même.

Ran terminal command:  git status --short && git diff -- backend/app/core/config.py backend/requirements.txt backend/README.md

Searched for regex `Démarrage rapide \(Linux / macOS\)|pip install -r requirements.txt|CORS_ORIGINS` (`**/backend/README.md`), 8 results

Read 

Les dépendances sont déjà listées dans `requirements.txt`, et les instructions Linux sont dans `README.md`. Je n’ai rien installé.

Pour les installer vous-même :

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Puis démarrez l’API avec `uvicorn app.main:app --reload --port 8000`.