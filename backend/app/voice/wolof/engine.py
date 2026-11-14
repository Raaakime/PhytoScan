"""Modèles ouverts hébergés sur ce serveur : reconnaissance (STT) et synthèse (TTS) du wolof.

Les modèles sont chargés au premier usage (le premier appel est donc long : téléchargement + chargement).
Un seul calcul à la fois (verrou) pour ne pas saturer la mémoire du serveur.
Modèles et appareil se règlent dans le .env (voir config.py : VOICE_WOLOF_*).

Synthèse : deux familles de modèles sont prises en charge (VOICE_WOLOF_TTS_BACKEND) :
  - "speecht5" (défaut) : SpeechT5 + vocodeur HiFi-GAN + empreinte de voix, ex. bilalfaye/speecht5_tts-wolof
  - "vits"              : modèles de type MMS-TTS / VITS
"""
import re
import textwrap
import threading
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np

from app.core.config import get_settings
from app.core.exceptions import ServiceUnavailableError
from app.voice.wolof.audio import SAMPLE_RATE

_lock = threading.Lock()
_stt: Optional[tuple] = None   # (processor, model, device)
_tts: Optional[dict] = None

# Empreinte de voix utilisée par SpeechT5 (celle de l'exemple officiel du modèle), mise en cache dans ce fichier
_SPEAKER_FILE = Path(__file__).parent / "speaker_embedding.npy"
_SPEAKER_DATASET, _SPEAKER_INDEX = "Matthijs/cmu-arctic-xvectors", 7306
_CHUNK_CHARS = 200     # SpeechT5 est fiable sur des phrases courtes : on découpe les longues réponses
_MAX_CHUNKS = 4


def _torch():
    try:
        import torch
    except ImportError as exc:
        raise ServiceUnavailableError(
            "PyTorch n'est pas installé : pip install -r requirements-voice-wolof.txt") from exc
    return torch


def _device() -> str:
    wanted = get_settings().VOICE_WOLOF_DEVICE
    if wanted == "auto":
        return "cuda" if _torch().cuda.is_available() else "cpu"
    return wanted


# ---------------------------------------------------------------- reconnaissance (STT)
def _load_stt() -> tuple:
    global _stt
    if _stt is None:
        from transformers import AutoProcessor, Wav2Vec2ForCTC
        s = get_settings()
        device = _device()
        if s.VOICE_WOLOF_STT_LANG:   # modèle multilingue MMS : on charge l'adaptateur de la langue
            processor = AutoProcessor.from_pretrained(s.VOICE_WOLOF_STT_MODEL, target_lang=s.VOICE_WOLOF_STT_LANG)
            model = Wav2Vec2ForCTC.from_pretrained(
                s.VOICE_WOLOF_STT_MODEL, target_lang=s.VOICE_WOLOF_STT_LANG, ignore_mismatched_sizes=True)
        else:                        # modèle déjà spécialisé en wolof
            processor = AutoProcessor.from_pretrained(s.VOICE_WOLOF_STT_MODEL)
            model = Wav2Vec2ForCTC.from_pretrained(s.VOICE_WOLOF_STT_MODEL)
        _stt = (processor, model.to(device).eval(), device)
    return _stt


def transcribe(pcm: np.ndarray) -> str:
    """Audio 16 kHz mono (float32) -> texte wolof."""
    torch = _torch()
    with _lock:
        processor, model, device = _load_stt()
        inputs = processor.feature_extractor(pcm, sampling_rate=SAMPLE_RATE, return_tensors="pt")
        with torch.no_grad():
            logits = model(inputs.input_values.to(device)).logits
        ids = torch.argmax(logits, dim=-1)
        # On passe par le tokenizer : fonctionne aussi si le dépôt contient un décodeur à modèle de langue
        return processor.tokenizer.batch_decode(ids)[0].strip()


# ---------------------------------------------------------------- synthèse (TTS)
def _speaker_embedding(torch):
    if _SPEAKER_FILE.is_file():
        vector = np.load(_SPEAKER_FILE)
    else:
        from datasets import load_dataset   # téléchargé une seule fois, puis mis en cache dans speaker_embedding.npy
        dataset = load_dataset(_SPEAKER_DATASET, split="validation")
        vector = np.asarray(dataset[_SPEAKER_INDEX]["xvector"], dtype=np.float32)
        try:
            np.save(_SPEAKER_FILE, vector)
        except OSError:
            pass
    return torch.tensor(vector, dtype=torch.float32).unsqueeze(0)


def _load_tts() -> dict:
    global _tts
    if _tts is None:
        s = get_settings()
        device = _device()
        if s.VOICE_WOLOF_TTS_BACKEND == "vits":
            from transformers import AutoTokenizer, VitsModel
            _tts = {"backend": "vits", "device": device,
                    "tokenizer": AutoTokenizer.from_pretrained(s.VOICE_WOLOF_TTS_MODEL),
                    "model": VitsModel.from_pretrained(s.VOICE_WOLOF_TTS_MODEL).to(device).eval()}
        elif s.VOICE_WOLOF_TTS_BACKEND == "speecht5":
            from transformers import SpeechT5ForTextToSpeech, SpeechT5HifiGan, SpeechT5Processor
            _tts = {"backend": "speecht5", "device": device,
                    "processor": SpeechT5Processor.from_pretrained(s.VOICE_WOLOF_TTS_MODEL),
                    "model": SpeechT5ForTextToSpeech.from_pretrained(s.VOICE_WOLOF_TTS_MODEL).to(device).eval(),
                    "vocoder": SpeechT5HifiGan.from_pretrained(s.VOICE_WOLOF_TTS_VOCODER).to(device).eval(),
                    "speaker": _speaker_embedding(_torch()).to(device)}
        else:
            raise ServiceUnavailableError(
                f"VOICE_WOLOF_TTS_BACKEND inconnu : {s.VOICE_WOLOF_TTS_BACKEND!r} (attendu : 'speecht5' ou 'vits').")
    return _tts


def _split_text(text: str, max_chars: int = _CHUNK_CHARS, max_chunks: int = _MAX_CHUNKS) -> List[str]:
    """Découpe une réponse en morceaux courts (aux fins de phrases), limités en nombre."""
    pieces: List[str] = []
    for sentence in re.split(r"(?<=[.!?…])\s+", text.strip()):
        sentence = sentence.strip()
        if not sentence:
            continue
        pieces.extend(textwrap.wrap(sentence, max_chars, break_long_words=False) if len(sentence) > max_chars else [sentence])
    chunks: List[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + 1 + len(piece) > max_chars:
            chunks.append(current)
            current = piece
        else:
            current = f"{current} {piece}".strip()
    if current:
        chunks.append(current)
    return chunks[:max_chunks]


def _synthesize_chunk(torch, tts: dict, chunk: str) -> Tuple[np.ndarray, int]:
    model, device = tts["model"], tts["device"]
    if tts["backend"] == "vits":
        inputs = tts["tokenizer"](text=chunk, return_tensors="pt").to(device)
        with torch.no_grad():
            wave = model(**inputs).waveform[0]
        return wave.cpu().numpy().astype(np.float32), int(model.config.sampling_rate)
    inputs = tts["processor"](text=chunk, return_tensors="pt", truncation=True,
                              max_length=model.config.max_text_positions)
    with torch.no_grad():
        speech = model.generate_speech(inputs["input_ids"].to(device), tts["speaker"], vocoder=tts["vocoder"])
    return speech.cpu().numpy().astype(np.float32), 16000   # le vocodeur HiFi-GAN produit du 16 kHz


def synthesize(text: str) -> Tuple[np.ndarray, int]:
    """Texte wolof -> (échantillons float32, fréquence d'échantillonnage)."""
    chunks = _split_text(text)
    if not chunks:
        raise ValueError("Texte vide : rien à synthétiser.")
    torch = _torch()
    with _lock:
        tts = _load_tts()
        torch.manual_seed(0)   # même voix d'un appel à l'autre
        waves: List[np.ndarray] = []
        rate = 16000
        for chunk in chunks:
            wave, rate = _synthesize_chunk(torch, tts, chunk)
            waves.append(wave)
            waves.append(np.zeros(int(rate * 0.25), dtype=np.float32))   # courte pause entre les phrases
    return np.concatenate(waves[:-1]), rate


def info() -> dict:
    s = get_settings()
    return {
        "enabled": s.VOICE_WOLOF_ENABLED,
        "sttModel": s.VOICE_WOLOF_STT_MODEL,
        "ttsModel": s.VOICE_WOLOF_TTS_MODEL,
        "ttsBackend": s.VOICE_WOLOF_TTS_BACKEND,
        "device": s.VOICE_WOLOF_DEVICE,
        "maxSeconds": s.VOICE_WOLOF_MAX_SECONDS,
        "sttLoaded": _stt is not None,
        "ttsLoaded": _tts is not None,
    }