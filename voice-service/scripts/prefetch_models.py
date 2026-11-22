"""Télécharge les modèles et l'empreinte de voix dans le cache (à lancer UNE fois, avec internet).

    python scripts/prefetch_models.py

Ensuite le service peut tourner avec HF_HUB_OFFLINE=1 : aucun accès réseau, démarrage déterministe.
"""
import subprocess
import sys
from pathlib import Path

from huggingface_hub import snapshot_download

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402


def main() -> None:
    settings = get_settings()
    token = settings.HF_TOKEN.get_secret_value() or None
    wanted = []
    if settings.STT_ENABLED:
        wanted.append(settings.STT_MODEL)
    if settings.TTS_ENABLED:
        wanted += [settings.TTS_MODEL, settings.TTS_VOCODER]
    for repo in wanted:
        print(f"Téléchargement de {repo} ...")
        snapshot_download(repo, token=token)

    if settings.TTS_ENABLED and not Path(settings.TTS_SPEAKER_EMBEDDING).is_file():
        script = Path(__file__).with_name("fetch_speaker_embedding.py")
        subprocess.run([sys.executable, str(script), "--out", settings.TTS_SPEAKER_EMBEDDING], check=True)
    print("Modèles prêts.")


if __name__ == "__main__":
    main()
