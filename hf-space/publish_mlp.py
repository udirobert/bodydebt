"""
Publish the stress MLP to its own Hugging Face Model repository.

This is what makes the model eligible for the Tiny Titan AND Well-Tuned
bonus badges. The model lives in hf-space/models/; this script uploads
the trained ONNX, the model card, the raw weights, the synthetic
training data, and the training metrics.

The ONNX in models/stress_model.onnx is produced by
`python train_stress_model.py` (2s on CPU) — not the random-init
fallback in `generate_model.py`. If you re-run `generate_model.py` you
will overwrite the trained ONNX with random weights.

Usage:
    export HF_TOKEN=hf_xxx...
    python publish_mlp.py
    # or
    huggingface-cli login && python publish_mlp.py
"""

from __future__ import annotations

import os
from pathlib import Path

MODEL_ID = os.environ.get("BODY_DEBT_MLP_REPO", "Papajams/body-debt-stress-mlp")
HERE = Path(__file__).parent
MODEL_DIR = HERE / "models"
ONNX_PATH = MODEL_DIR / "stress_model.onnx"
CARD_PATH = MODEL_DIR / "README.md"
WEIGHTS_PATH = MODEL_DIR / "stress_model_weights.npz"
DATA_PATH = MODEL_DIR / "stress_training_data.npz"
METRICS_PATH = MODEL_DIR / "stress_metrics.json"


def main() -> None:
    if not ONNX_PATH.exists():
        raise SystemExit(
            f"Missing {ONNX_PATH}. Run `python train_stress_model.py` first."
        )
    if not CARD_PATH.exists():
        raise SystemExit(f"Missing model card at {CARD_PATH}.")

    from huggingface_hub import HfApi, whoami

    api = HfApi()
    try:
        user = whoami()
        print(f"Authenticated as: {user.get('name', '?')}")
    except Exception as e:
        raise SystemExit(
            "Not authenticated. Run `huggingface-cli login` or set HF_TOKEN."
        ) from e

    print(f"Creating model repo at {MODEL_ID} (if it does not exist)...")
    api.create_repo(
        repo_id=MODEL_ID,
        repo_type="model",
        private=False,
        exist_ok=True,
    )

    patterns = ["stress_model.onnx", "README.md"]
    optional = [WEIGHTS_PATH, DATA_PATH, METRICS_PATH]
    for p in optional:
        if p.exists():
            patterns.append(p.name)
        else:
            print(f"  (skipping {p.name} — not present)")

    print(f"Uploading {', '.join(patterns)} to {MODEL_ID}...")
    api.upload_folder(
        folder_path=str(MODEL_DIR),
        repo_id=MODEL_ID,
        repo_type="model",
        allow_patterns=patterns,
    )

    print(f"Done. View the model at: https://huggingface.co/{MODEL_ID}")


if __name__ == "__main__":
    main()
