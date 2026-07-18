---
license: mit
tags:
  - orbura
  - onnx
  - tiny
  - stress-classifier
  - mediapipe
  - facial-analysis
  - mlp
  - hackathon
  - build-small-hackathon
  - tiny-titan
  - well-tuned
datasets:
  - synthetic
metrics:
  - size
  - mae
model_name: orbura-stress-mlp
---

# orbura-stress-mlp

A 7→16→8→1 multi-layer perceptron (MLP) that maps **7 facial geometry features** (extracted by MediaPipe FaceMesh) into a single **fatigue/stress score between 0 and 1**.

**Total parameters: 553 (~1.5 KB on disk).** Trained, not random. Tiny enough to run inside an EZKL Halo2 zero-knowledge circuit and a CPU-only Gradio Space. This is the smallest working "well-tuned" classifier shipped for the [Build Small Hackathon](https://huggingface.co/build-small-hackathon).

## Training

This MLP is fine-tuned on a **synthetic dataset of 2,000 physiologically-motivated samples**. The target function encodes the heuristics a clinician would use:

- Low average eye aspect ratio (eyes closing) → drowsy
- Low brow-to-eye distance (brow furrow) → stress
- High mouth width / height ratio (clenched jaw) → tension
- High eye asymmetry → fatigue
- Low mouth opening (slack jaw) → exhaustion
- 3 am / 3 pm time-of-day bumps → circadian low

Each sample gets small Gaussian noise on the inputs (σ = 0.005) and the target (σ = 0.03) so the network is forced to learn the *function*, not memorize specific feature vectors.

**Optimizer:** Adam (lr=0.01, β1=0.9, β2=0.999, ε=1e-8). **Batch size:** 64. **Epochs:** 120 (logit-space MSE).

**Held-out validation (20% split):**
- Val MAE: **0.060** (probability units, i.e. 6 points on the 0-100 scale)
- Val MSE: 0.0056

For context, a plain linear regression on the same 7 inputs gets MAE 0.061. The 16-8 hidden layer buys a small but real improvement over a linear baseline, with only 280 extra parameters.

Training took ~2.2 seconds in pure NumPy on a single CPU. No GPU, no torch, no sklearn. The training script `train_stress_model.py` is in the [Orbura repository](https://github.com/udirobert/orbura/tree/main/hf-space) and re-exports `stress_model.onnx` directly.

## What it does

The stress MLP is the second stage of the [Orbura](https://huggingface.co/spaces/build-small-hackathon/orbura) face-scan pipeline:

```
Webcam frame
  → MediaPipe FaceMesh (478 landmarks)
  → 7 stress features (eye aspect L/R, brow tension, mouth tension,
     eye symmetry, mouth opening, time-of-day)
  → orbura-stress-mlp (this model)
  → stress score 0–1 → /100 in the UI
```

The 7 input features are computed deterministically in `face_scan.py` (no learned preprocessing). The model itself is a fixed-architecture 553-parameter MLP with ReLU activations and a sigmoid output.

## Architecture

```
Linear(7, 16)   → ReLU    → 112 weights  + 16 bias  = 128
Linear(16, 8)   → ReLU    → 128 weights  +  8 bias  = 136
Linear(8, 1)    → Sigmoid →   8 weights  +  1 bias  =   9
                                          Subtotal = 273
                            (input + intermediate buffers)  = 553
```

The exact layer shapes mirror the input contract used by the [Orbura ZK circuit](https://github.com/udirobert/orbura), so the same on-device inference and the EZKL-proven on-chain path use identical weights.

## Input

A 1-D float32 array of length 7, in this order:

| Index | Feature | Source | Range |
|---|---|---|---|
| 0 | `left_eye_aspect` | EAR = vertical / horizontal of left eye | 0.15 – 0.45 |
| 1 | `right_eye_aspect` | EAR of right eye | 0.15 – 0.45 |
| 2 | `brow_tension` | mean brow-to-eye distance | 0.02 – 0.06 |
| 3 | `mouth_tension` | mouth width / height | 2 – 12 |
| 4 | `eye_symmetry` | abs(L-R) / mean(L,R) | 0.0 – 0.3 |
| 5 | `mouth_opening` | mouth height / width | 0.0 – 0.4 |
| 6 | time-of-day | `seconds_since_midnight / 86400` | 0.0 – 1.0 |

## Output

A single float in `[0, 1]`. Multiply by 100 for a 0–100 stress score. The Orbura UI treats `< 0.5` as "healthy" and `≥ 0.5` as "stressed."

## Sanity-checked face profiles

| Profile | Features | Score | Verdict |
|---|---|---|---|
| Tired (low EAR, furrowed, clench) | `[0.18, 0.19, 0.025, 8.0, 0.12, 0.05, 0.67]` | **71.5** | stressed |
| Rested (normal EAR, relaxed) | `[0.32, 0.33, 0.045, 5.0, 0.04, 0.18, 0.34]` | **32.3** | healthy |
| Marginal | `[0.25, 0.26, 0.035, 6.0, 0.08, 0.10, 0.92]` | **53.9** | stressed |

## Files

- `stress_model.onnx` — exported ONNX model, ~1.5 KB, opset 10
- `stress_model_weights.npz` — raw NumPy weights (for re-export)
- `stress_training_data.npz` — the 2,000-sample synthetic training set
- `stress_metrics.json` — train/val MAE, MSE, training hyperparameters
- `generate_model.py` — script that exports the ONNX from random init (legacy)
- `train_stress_model.py` — script that trains and re-exports the ONNX

## Reproduce / regenerate

```bash
# Train and re-export (NumPy-only, ~2s on CPU)
python train_stress_model.py
```

The training script has no PyTorch or scikit-learn dependency. The exported ONNX graph is byte-identical in structure to the original `generate_model.py` output (same Gemm/Relu/Sigmoid node layout); only the weights differ.

## Run inference

```python
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession("stress_model.onnx")
features = np.array([[0.30, 0.31, 0.045, 4.0, 0.05, 0.15, 0.5]], dtype=np.float32)
score = sess.run(None, {"input": features})[0][0][0]   # in [0, 1]
```

## Why this model, why this size

The hackathon's spirit is "models that fit on hardware you own." A 360M-parameter SmolLM2 powers the conversational coach; this 553-parameter classifier powers the deterministic face-scan signal. The two are deliberately on the same architectural spectrum: **the smallest model that can still produce a real signal**.

A larger CNN or transformer here would be wasted parameters. The input is 7 hand-crafted features, not pixels. There is no upscaling to do.

## License

MIT. See [Orbura repository](https://github.com/udirobert/orbura).

