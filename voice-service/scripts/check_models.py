"""Vérifie qu'un déploiement fonctionne VRAIMENT et produit de quoi écouter la voix.

    python scripts/check_models.py --out samples/            # synthèse de phrases-tests + aller-retour reconnaissance
    python scripts/check_models.py --wav ma_question.wav     # transcrit un vrai enregistrement (WAV 16 kHz mono)

À lancer avant la mise en production, avec les variables VOICE_SERVICE_* du déploiement. Les fichiers .wav produits
sont à faire écouter à des locuteurs wolof : la clarté d'une voix synthétique ne se mesure pas par un test automatique.
Le « aller-retour » (la voix est-elle comprise par notre propre reconnaissance ?) n'est qu'un signal indirect.
"""
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.audio import SAMPLE_RATE, read_wav, write_wav  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.engines import build_engines  # noqa: E402
from app.metrics import word_error_rate  # noqa: E402

PHRASES = [
    "Nanga def, mangi fi rekk.",
    "Garab gi dafa wér.",
    "Suubal garab yi suba teel, ci suuf gi rekk.",
    "Xoolal xob yi : bu ñu sew, dafa laaj saytu.",
    "Wér-gu-yaramu garab gi mooy juroom-ñaar-fukk ak ñeent ci téeméer.",
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", help="dossier où écrire les .wav synthétisés")
    parser.add_argument("--wav", help="enregistrement réel à transcrire")
    args = parser.parse_args()

    settings = get_settings()
    started = time.perf_counter()
    engines = build_engines(settings)
    print(f"Chargement des modèles : {time.perf_counter() - started:.1f} s "
          f"(stt={engines.stt is not None}, tts={engines.tts is not None})")

    if args.wav:
        if engines.stt is None:
            print("STT désactivé.")
            return 1
        samples = read_wav(Path(args.wav).read_bytes(), settings.MAX_AUDIO_SECONDS)
        t0 = time.perf_counter()
        print(f"[STT] {time.perf_counter() - t0:.2f} s -> « {engines.stt.transcribe(samples)} »")
        return 0

    failures = 0
    out = Path(args.out) if args.out else None
    if out:
        out.mkdir(parents=True, exist_ok=True)
    if engines.tts is None:
        print("TTS désactivé.")
        return 1
    for index, phrase in enumerate(PHRASES, start=1):
        t0 = time.perf_counter()
        from app.audio import finalize_speech
        samples = finalize_speech(engines.tts.synthesize(phrase), engines.tts.sample_rate)
        elapsed = time.perf_counter() - t0
        seconds = samples.size / engines.tts.sample_rate
        line = f"[TTS {index}] {seconds:4.1f} s d'audio en {elapsed:4.1f} s (x{elapsed / max(seconds, 1e-6):.2f} temps réel)"
        if seconds < 0.3:
            line += "  ÉCHEC : audio quasi vide"
            failures += 1
        if out:
            (out / f"phrase_{index}.wav").write_bytes(write_wav(samples, engines.tts.sample_rate))
        if engines.stt is not None and engines.tts.sample_rate == SAMPLE_RATE and seconds >= 0.3:
            heard = engines.stt.transcribe(read_wav(write_wav(samples, SAMPLE_RATE), 120))
            line += f"\n          dit : « {phrase} »\n          compris : « {heard} »  (WER {word_error_rate(phrase, heard):.0%})"
        print(line)
    if out:
        print(f"\nFichiers écrits dans {out.resolve()} : faites-les écouter à des locuteurs wolof.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
