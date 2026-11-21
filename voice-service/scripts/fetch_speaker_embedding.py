"""Prépare l'empreinte de voix (x-vector 512 valeurs) utilisée par SpeechT5.

SpeechT5 produit toujours la voix d'un locuteur de référence ; le modèle wolof a été entraîné avec l'empreinte n°7306
du jeu « Matthijs/cmu-arctic-xvectors » (c'est celle de sa fiche). Ce script la télécharge une fois et l'enregistre en
.npy, pour que le service n'ait ensuite besoin ni de `datasets` ni d'internet.

    python scripts/fetch_speaker_embedding.py --out /models/speaker.npy [--index 7306]

Pour changer de voix, passez un autre --index ou remplacez le fichier par l'empreinte d'un locuteur ayant consenti.
"""
import argparse
import io
import zipfile
from pathlib import Path

import numpy as np
from huggingface_hub import hf_hub_download


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--index", type=int, default=7306)
    args = parser.parse_args()

    archive = hf_hub_download("Matthijs/cmu-arctic-xvectors", "spkrec-xvect.zip", repo_type="dataset")
    with zipfile.ZipFile(archive) as zf:
        names = sorted(n for n in zf.namelist() if n.endswith(".npy") and "__MACOSX" not in n)
        if not 0 <= args.index < len(names):
            raise SystemExit(f"--index doit être entre 0 et {len(names) - 1}")
        chosen = names[args.index]
        vector = np.load(io.BytesIO(zf.read(chosen))).astype(np.float32).reshape(-1)
    if vector.shape != (512,):
        raise SystemExit(f"Empreinte inattendue : {vector.shape}")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    np.save(out, vector)
    print(f"{chosen} -> {out} ({vector.shape[0]} valeurs)")


if __name__ == "__main__":
    main()
