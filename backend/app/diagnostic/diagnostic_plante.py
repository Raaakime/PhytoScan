# diagnostic/diagnostic_plante.py  — module autonome
import json, numpy as np
from pathlib import Path
from PIL import Image
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite

DIR = Path(__file__).parent
REGLES = json.loads((DIR / "regles_climat_phytoscan.json").read_text(encoding="utf-8"))
CLASSES = sorted(REGLES.keys())   # ⚠️ à vérifier, voir plus bas

_interp = tflite.Interpreter(model_path=str(DIR / "phytoscan_ai_v3_horsligne.tflite"))
_interp.allocate_tensors()
_in, _out = _interp.get_input_details()[0], _interp.get_output_details()[0]

def diagnostiquer(chemin_image, temperature=None, humidite=None, top=3):
    h, w = _in["shape"][1:3]
    img = Image.open(chemin_image).convert("RGB").resize((w, h))
    x = np.expand_dims(np.array(img, dtype=np.float32), 0)   # 0-255, pas de /255
    _interp.set_tensor(_in["index"], x)
    _interp.invoke()
    p = _interp.get_tensor(_out["index"])[0]
    resultats = []
    for i in np.argsort(p)[::-1][:top]:
        r = dict(REGLES[CLASSES[i]], classe=CLASSES[i], confiance=float(p[i]))
        if temperature is not None and humidite is not None:
            r["climat_coherent"] = (r["temp_min"] <= temperature <= r["temp_max"]
                                    and r["humidite_min"] <= humidite <= r["humidite_max"])
        resultats.append(r)
    return resultats