"""Prétraitement des images avant le vrai modèle (redimensionnement + normalisation).

Adaptez SIZE, MEAN et STD à ceux utilisés lors de l'entraînement de votre modèle.
"""
from PIL import Image

SIZE = (224, 224)                 # taille d'entrée attendue par le modèle
MEAN = (0.485, 0.456, 0.406)      # moyenne ImageNet (valeurs usuelles)
STD = (0.229, 0.224, 0.225)       # écart-type ImageNet


def preprocess(image: Image.Image):
    """Renvoie un tableau numpy de forme (1, 3, H, W) en float32, prêt pour le modèle."""
    import numpy as np  # importé ici : numpy n'est requis que pour le vrai modèle

    img = image.convert("RGB").resize(SIZE)
    arr = np.asarray(img, dtype="float32") / 255.0          # valeurs entre 0 et 1
    arr = (arr - np.array(MEAN, dtype="float32")) / np.array(STD, dtype="float32")
    arr = arr.transpose(2, 0, 1)                             # (H, W, C) -> (C, H, W)
    return arr[None, ...]                                    # ajoute la dimension du lot
