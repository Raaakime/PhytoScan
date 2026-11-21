"""Vérifie, avec VOTRE clé, que Gemini répond comme le code l'attend : LLM, synthèse vocale, reconnaissance.

    cd backend
    GEMINI_API_KEY=... python scripts/check_gemini.py [--out dossier]

(ou renseignez GEMINI_API_KEY dans backend/.env). Le script :
  1. pose une question au LLM ;
  2. synthétise une phrase française et l'écrit en .wav pour que VOUS l'écoutiez : la clarté d'une voix se juge à l'oreille ;
  3. renvoie ce .wav à la reconnaissance vocale (aller-retour) et compare.
Les erreurs HTTP du fournisseur (code + corps) sont affichées dans les journaux : c'est la première chose à lire si une
étape échoue, car la documentation de l'API évolue vite et les formes de requête de ce code ont été écrites d'après elle,
sans appel réel.
"""
import argparse
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402
from app.core.exceptions import AppError  # noqa: E402
from app.integrations.gemini import GeminiClient, output_text  # noqa: E402
from app.voice import audio as audio_tools  # noqa: E402
from app.voice import text_prep  # noqa: E402
from app.voice.providers.gemini import GeminiSpeechToText, GeminiTextToSpeech  # noqa: E402

PHRASE = "Plante 2 : état à surveiller, score de santé 74/100. Arrosez tôt le matin, directement au pied."


def step(title: str, action) -> bool:
    started = time.perf_counter()
    try:
        action()
        print(f"  OK   {title}  ({time.perf_counter() - started:.1f} s)")
        return True
    except AppError as exc:
        print(f"  ÉCHEC {title} : {exc.detail}  <- voir la ligne « ERROR » juste au-dessus (code HTTP et corps)")
    except Exception as exc:  # noqa: BLE001
        print(f"  ÉCHEC {title} : {type(exc).__name__}: {exc}")
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=".", help="dossier du .wav produit")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="      %(levelname)s %(name)s: %(message)s")

    s = get_settings()
    key = s.GEMINI_API_KEY.get_secret_value()
    if not key:
        print("GEMINI_API_KEY est vide : renseignez-la (variable d'environnement ou backend/.env).")
        return 2
    client = GeminiClient(base_url=s.GEMINI_BASE_URL, api_key=key, timeout=s.GEMINI_TIMEOUT_SECONDS)
    ok = True

    print(f"1. LLM ({s.GEMINI_LLM_MODEL}, thinking_level={s.GEMINI_LLM_THINKING_LEVEL})")

    def llm():
        reply = output_text(client.interact("LLM gemini", {
            "model": s.GEMINI_LLM_MODEL,
            "system_instruction": "Tu es un conseiller agricole. Réponds en une phrase, sans Markdown.",
            "input": "Quand arroser des tomates par forte chaleur ?",
            "generation_config": {"max_output_tokens": s.GEMINI_LLM_MAX_OUTPUT_TOKENS,
                                  "thinking_level": s.GEMINI_LLM_THINKING_LEVEL},
        }))
        if not reply:
            raise RuntimeError("réponse vide")
        print(f"      « {reply} »")

    ok &= step("question au LLM", llm)

    print(f"2. Synthèse vocale ({s.GEMINI_TTS_MODEL}, voix {s.GEMINI_TTS_VOICE})")
    tts = GeminiTextToSpeech(client, model=s.GEMINI_TTS_MODEL, voice=s.GEMINI_TTS_VOICE,
                             styles={"fr": s.GEMINI_TTS_STYLE_FR, "en": s.GEMINI_TTS_STYLE_EN})
    spoken = text_prep.prepare_for_speech(PHRASE, "fr")
    result = {}

    def synth():
        result["speech"] = tts.synthesize(spoken, "fr")
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        (out / "gemini_fr.wav").write_bytes(result["speech"].content)
        print(f"      texte lu : « {spoken} »\n      -> {(out / 'gemini_fr.wav').resolve()}  ÉCOUTEZ-LE : la voix est-elle claire ?")

    ok &= step("synthèse française", synth)

    print(f"3. Reconnaissance ({s.GEMINI_STT_MODEL})")

    def transcribe():
        if "speech" not in result:
            raise RuntimeError("pas d'audio (étape 2 en échec)")
        pcm = audio_tools.decode_pcm(result["speech"].content, max_seconds=60)
        stt = GeminiSpeechToText(client, model=s.GEMINI_STT_MODEL,
                                 vocabulary=[w.strip() for w in s.GEMINI_STT_VOCABULARY.split(",") if w.strip()])
        heard = stt.transcribe(audio_tools.to_wav(pcm, audio_tools.SAMPLE_RATE), "fr")
        print(f"      dit     : « {spoken} »\n      compris : « {heard} »")
        if not heard:
            raise RuntimeError("transcription vide")

    ok &= step("aller-retour voix -> texte", transcribe)
    print("\nTout est conforme." if ok else "\nAu moins une étape a échoué : corrigez-la avant d'activer Gemini en production.")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
