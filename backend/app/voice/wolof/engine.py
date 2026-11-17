import io
import os
import re
import wave

from dotenv import load_dotenv
import httpx
import numpy as np

load_dotenv()

HF_SPACE_URL = os.getenv("HF_WOLOF_SPACE_URL", "https://hf.space").rstrip("/")

# 1. Traduction des statuts (PlantOut.status / status_label)
STATUS_TO_WOLOF = {
    "saine": "wér na lool",
    "plante saine": "garab gi wér na",
    "surveiller": "dafa laaj saytu",
    "à surveiller": "dafa laaj saytu",
    "malade": "dafa feebar",
    "maladie détectée": "am na feebar bu ñu gis",
}

# 2. Traduction des espèces (PlantOut.species) sans les noms latins
SPECIES_TO_WOLOF = {
    "tomate": "tamaate",
    "poivron": "poobar",
    "piment": "kaani",
    "aubergine": "batañse",
    "pomme de terre": "pombiteer",
    "oignon": "soble",
    "salade": "salaat",
    "concombre": "konkoombar",
    "haricot": "ñebbe",
    "maïs": "mbaxal",
    "arachide": "gerte",
    "mil": "dugub",
}

# 3. Traduction des stades de croissance (PlantOut.growth_stage)
STAGE_TO_WOLOF = {
    "semis": "tàmbali jëmbët",
    "germination": "sax gi",
    "croissance": "màgg gi",
    "croissance végétative": "màggug xob yi",
    "floraison": "tóor-tóor gi",
    "fructification": "meññeef gi",
    "maturation": "ñor gi",
    "récolte": "ngóob mi",
}

# 4. Nombres en wolof (pour health_score, numéros de parcelle, etc.)
WOLOF_NUMS = {
    0: "tus",
    1: "benn",
    2: "ñaar",
    3: "ñett",
    4: "ñeent",
    5: "juroom",
    6: "juroom-benn",
    7: "juroom-ñaar",
    8: "juroom-ñett",
    9: "juroom-ñeent",
    10: "fukk",
    20: "ñaar-fukk",
    30: "ñett-fukk",
    40: "ñeent-fukk",
    50: "juroom-fukk",
    60: "juroom-benn-fukk",
    70: "juroom-ñaar-fukk",
    80: "juroom-ñett-fukk",
    90: "juroom-ñeent-fukk",
    100: "téeméer",
}


def number_to_wolof(n: int) -> str:
  if n in WOLOF_NUMS:
    return WOLOF_NUMS[n]
  if 10 < n < 100:
    tens = (n // 10) * 10
    unit = n % 10
    return f"{WOLOF_NUMS[tens]} ak {WOLOF_NUMS[unit]}"
  return " ".join(WOLOF_NUMS[int(d)] for d in str(n))


def clean_plant_text_for_wolof_tts(text: str) -> str:
  """Nettoie les données françaises (PlantOut) et les chiffres avant synthèse vocale wolof."""
  cleaned = re.sub(r"\([^)]*\)", "", text)

  for mapping in (STATUS_TO_WOLOF, SPECIES_TO_WOLOF, STAGE_TO_WOLOF):
    for fr_term, wo_term in mapping.items():
      cleaned = re.sub(
          rf"\b{re.escape(fr_term)}\b", wo_term, cleaned, flags=re.IGNORECASE
      )

  cleaned = re.sub(r"\bparcelle\b", "parsel", cleaned, flags=re.IGNORECASE)
  cleaned = re.sub(r"(\d+)\s*/\s*100", r"\1 ci téeméer", cleaned)
  cleaned = re.sub(r"(\d+)\s*%", r"\1 pursan", cleaned)
  cleaned = re.sub(
      r"\b\d+\b", lambda m: number_to_wolof(int(m.group(0))), cleaned
  )
  cleaned = re.sub(r"[*#_~`|/\\]", " ", cleaned)
  return re.sub(r"\s+", " ", cleaned).strip()


def info() -> dict:
  """Retourne l'état du service vocal wolof pour le front et le test."""
  return {
      "enabled": True,
      "backend": "huggingface_space_remote",
      "hf_space_url": HF_SPACE_URL,
  }


def transcribe(pcm: np.ndarray) -> str:
  """Envoie l'audio au serveur distant et récupère le texte wolof."""
  from app.voice.wolof.audio import SAMPLE_RATE, to_wav_bytes

  wav_bytes = to_wav_bytes(pcm, SAMPLE_RATE)

  with httpx.Client(timeout=60.0) as client:
    response = client.post(
        f"{HF_SPACE_URL}/transcribe",
        files={"file": ("audio.wav", wav_bytes, "audio/wav")},
    )
    response.raise_for_status()
    return response.json().get("text", "").strip()


def synthesize(text: str) -> tuple[np.ndarray, int]:
  """Nettoie le texte wolof puis récupère l'audio depuis le serveur distant."""
  clean_text = clean_plant_text_for_wolof_tts(text)

  with httpx.Client(timeout=60.0) as client:
    response = client.post(
        f"{HF_SPACE_URL}/synthesize", json={"text": clean_text}
    )
    response.raise_for_status()

    with wave.open(io.BytesIO(response.content), "rb") as wf:
      rate = wf.getframerate()
      frames = wf.readframes(wf.getnframes())
      pcm16 = np.frombuffer(frames, dtype=np.int16)
      samples = pcm16.astype(np.float32) / 32767.0
      return samples, rate
