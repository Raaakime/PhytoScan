"""À lancer UNE FOIS avant d'activer la voix wolof (depuis la racine du back) :

    python -m app.voice.wolof.check                      # test aller-retour synthèse -> reconnaissance
    python -m app.voice.wolof.check --wav mon_audio.wav  # teste la reconnaissance sur un vrai enregistrement

Il télécharge les modèles (plusieurs Go la première fois), vérifie qu'ils se chargent, mesure les temps
et écrit wolof_test.wav pour que vous écoutiez la voix.
"""
import argparse
import time
from pathlib import Path

from app.voice.wolof import audio, engine

PHRASE = "nanga def, mangi fi rekk"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", help="fichier audio wolof à transcrire (wav, webm, m4a...)")
    parser.add_argument("--text", default=PHRASE, help="phrase wolof à synthétiser")
    args = parser.parse_args()
    print("Réglages :", engine.info())

    wav_bytes = None
    if not args.wav:
        t0 = time.perf_counter()
        try:
            wave, rate = engine.synthesize(args.text)
            wav_bytes = audio.to_wav_bytes(wave, rate)
            Path("wolof_test.wav").write_bytes(wav_bytes)
            print(f"[TTS] OK en {time.perf_counter() - t0:.1f}s -> wolof_test.wav ({len(wave) / rate:.1f}s d'audio). Écoutez-le !")
        except Exception as exc:  # noqa: BLE001
            print(f"[TTS] ÉCHEC : {exc!r}\n      Vérifiez VOICE_WOLOF_TTS_MODEL (le modèle existe-t-il pour le wolof ?)")
    else:
        wav_bytes = Path(args.wav).read_bytes()

    if wav_bytes:
        t0 = time.perf_counter()
        try:
            text = engine.transcribe(audio.decode_to_pcm16k(wav_bytes, 60))
            print(f"[STT] OK en {time.perf_counter() - t0:.1f}s -> « {text} »")
        except Exception as exc:  # noqa: BLE001
            print(f"[STT] ÉCHEC : {exc!r}\n      Vérifiez VOICE_WOLOF_STT_MODEL / VOICE_WOLOF_STT_LANG et ffmpeg.")


if __name__ == "__main__":
    main()
