"""Mesure le taux d'erreur de mots (WER) de la reconnaissance sur VOS enregistrements.

    python scripts/evaluate_stt.py corpus/

`corpus/` contient des paires `nom.wav` (WAV 16 kHz mono 16 bits) + `nom.txt` (transcription exacte, UTF-8).
Un modèle annoncé à « 17 % de WER » l'a été sur un autre corpus que le vôtre : mesurez-le sur des questions réelles
d'agriculteurs, avec leurs accents, leur micro de téléphone et leur bruit de fond, avant de choisir un modèle
(`VOICE_SERVICE_STT_MODEL`). Comparez plusieurs modèles avec le même corpus.
"""
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.audio import read_wav  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.engines import build_engines  # noqa: E402
from app.metrics import word_error_rate  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    folder = Path(sys.argv[1])
    pairs = [(wav, wav.with_suffix(".txt")) for wav in sorted(folder.glob("*.wav")) if wav.with_suffix(".txt").exists()]
    if not pairs:
        print(f"Aucune paire .wav/.txt dans {folder}")
        return 2

    settings = get_settings()
    stt = build_engines(settings).stt
    if stt is None:
        print("STT désactivé.")
        return 2
    print(f"Modèle : {settings.STT_MODEL} | {len(pairs)} enregistrements\n")
    scores = []
    for wav, txt in pairs:
        reference = txt.read_text(encoding="utf-8").strip()
        heard = stt.transcribe(read_wav(wav.read_bytes(), settings.MAX_AUDIO_SECONDS))
        score = word_error_rate(reference, heard)
        scores.append(score)
        print(f"{wav.name:30s} WER {score:5.0%}\n   attendu : {reference}\n   compris : {heard}")
    print(f"\nWER moyen {statistics.mean(scores):.0%} | médian {statistics.median(scores):.0%} | pire {max(scores):.0%}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
