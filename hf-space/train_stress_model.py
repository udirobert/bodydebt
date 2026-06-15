"""
Train the stress classifier (7->16->8->1 MLP) on a synthetic
physiologically-motivated dataset, then re-export the ONNX.

The synthetic target is a hand-built function of the 7 input features that
encodes the same heuristics a clinician would use:

  - Low average eye aspect ratio  -> drowsy
  - Low brow distance             -> furrow / stress
  - High mouth tension            -> clenched jaw
  - High eye asymmetry            -> fatigue / neurological
  - Low mouth opening             -> slack jaw
  - Late-evening / 3am time-of-day -> circadian low

We add small Gaussian noise to inputs and target so the network has
something to learn (not just a lookup table) and so the exported ONNX
has interesting, well-distributed weights.

Run from the hf-space/ directory:
    python train_stress_model.py

Outputs:
    models/stress_model.onnx           (re-exported, trained)
    models/stress_model_weights.npz    (raw numpy weights)
    models/stress_training_data.npz    (synthetic dataset)
    models/stress_metrics.json         (train/val MAE, MSE)
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
MODEL_DIR = HERE / "models"
ONNX_PATH = MODEL_DIR / "stress_model.onnx"
WEIGHTS_PATH = MODEL_DIR / "stress_model_weights.npz"
DATA_PATH = MODEL_DIR / "stress_training_data.npz"
METRICS_PATH = MODEL_DIR / "stress_metrics.json"

RNG_SEED = 42
N_SAMPLES = 2000
VAL_FRACTION = 0.2
EPOCHS = 120
BATCH = 64
LR = 0.01  # Adam learning rate


# ─── Synthetic target function ────────────────────────────────────────────────
# All ranges match the published model card.

def sample_features(rng: np.random.Generator, n: int) -> np.ndarray:
    """Sample (n, 7) feature matrix in the documented physiological ranges."""
    left_ear = rng.uniform(0.15, 0.45, n)
    right_ear = rng.uniform(0.15, 0.45, n)
    brow = rng.uniform(0.02, 0.06, n)
    mouth_t = rng.uniform(2.0, 12.0, n)
    eye_sym = np.abs(left_ear - right_ear) / ((left_ear + right_ear) / 2 + 0.001)
    mouth_w = rng.uniform(0.30, 0.60, n)  # mouth width in normalized image coords
    mouth_h = rng.uniform(0.0, 0.20, n)    # mouth height (opening)
    mouth_o = mouth_h / (mouth_w + 0.001)
    tod = rng.uniform(0.0, 1.0, n)
    return np.stack(
        [left_ear, right_ear, brow, mouth_t, eye_sym, mouth_o, tod], axis=1
    ).astype(np.float32)


def target_score(x: np.ndarray) -> np.ndarray:
    """Physiologically-motivated target in [0, 1].

    Components are scaled so the sum roughly lives in [0, 1.5] before the
    final sigmoid, which produces a well-distributed target across
    "healthy" and "stressed" populations.
    """
    left_ear, right_ear, brow, mouth_t, eye_sym, mouth_o, tod = x.T

    # Drowsiness: low EAR (eyes closing)
    avg_ear = (left_ear + right_ear) / 2
    drowsy = np.clip((0.32 - avg_ear) / 0.10, 0, 1) * 0.30

    # Brow furrow: low brow-to-eye distance
    furrow = np.clip((0.035 - brow) / 0.015, 0, 1) * 0.22

    # Clenched jaw: high mouth_tension
    clench = np.clip((mouth_t - 6.0) / 4.0, 0, 1) * 0.12

    # Eye asymmetry
    asym = np.clip((eye_sym - 0.10) / 0.10, 0, 1) * 0.12

    # Slack jaw: low mouth_opening
    slack = np.clip((0.10 - mouth_o) / 0.10, 0, 1) * 0.10

    # Circadian dip: 3am (tod=0.125) and 3pm (tod=0.625) bumps
    tod_h = tod * 24
    tod_bump = 0.08 * (
        np.exp(-((tod_h - 3.0) ** 2) / 4.0)
        + 0.6 * np.exp(-((tod_h - 15.0) ** 2) / 6.0)
    )

    raw = drowsy + furrow + clench + asym + slack + tod_bump
    # Squash into [0, 1] with a soft logistic, but allow extremes
    return 1.0 / (1.0 + np.exp(-(raw * 4.0 - 1.4)))


# ─── NumPy MLP with the same shape as the ZK circuit ─────────────────────────
# Linear(7,16) -> ReLU -> Linear(16,8) -> ReLU -> Linear(8,1) -> Sigmoid

def init_params(rng: np.random.Generator):
    def he(shape):
        fan_in = shape[1]
        return rng.normal(0, np.sqrt(2.0 / fan_in), shape).astype(np.float32)

    # Init b3 to the logit of the target mean (~0.5) so the network starts
    # at a sensible constant prediction rather than 0.5 with dead ReLUs.
    return {
        "W1": he((16, 7)) * 0.5,
        "b1": np.zeros(16, dtype=np.float32),
        "W2": he((8, 16)) * 0.5,
        "b2": np.zeros(8, dtype=np.float32),
        "W3": he((1, 8)) * 0.5,
        "b3": np.array([0.0], dtype=np.float32),
    }


def forward(p, x):
    z1 = x @ p["W1"].T + p["b1"]
    a1 = np.maximum(0, z1)
    z2 = a1 @ p["W2"].T + p["b2"]
    a2 = np.maximum(0, z2)
    z3 = a2 @ p["W3"].T + p["b3"]
    return z3, (x, z1, a1, z2, a2, z3)  # return logits; sigmoid applied at export time


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -50, 50)))


def bce_loss(y, t, eps=1e-7):
    y = np.clip(y, eps, 1 - eps)
    return float(-(t * np.log(y) + (1 - t) * np.log(1 - y)).mean())


def mse_loss(y, t):
    return float(((y - t) ** 2).mean())


def backward(p, cache, z3, t):
    """Backward through MSE on the raw logit output (no sigmoid in graph).

    We use MSE on the pre-sigmoid logit (with target also in logit space).
    The ONNX graph applies sigmoid at the end, so the probability output
    is bounded in [0, 1]. Training in logit space avoids the saturation
    problem of sigmoid + small gradients.
    """
    x, z1, a1, z2, a2, _ = cache
    n = z3.shape[0]
    if t.ndim == 1:
        t = t.reshape(-1, 1)
    # Convert target probability to logit, clamp to avoid inf
    t_p = np.clip(t, 1e-5, 1 - 1e-5)
    t_logit = np.log(t_p / (1.0 - t_p))
    # MSE on logits: dL/dz3 = 2(z3 - t_logit) / n
    dL_dz3 = 2.0 * (z3 - t_logit) / n
    dW3 = dL_dz3.T @ a2
    db3 = dL_dz3.sum(axis=0)
    dL_da2 = dL_dz3 @ p["W3"]
    dL_dz2 = dL_da2 * (z2 > 0)
    dW2 = dL_dz2.T @ a1
    db2 = dL_dz2.sum(axis=0)
    dL_da1 = dL_dz2 @ p["W2"]
    dL_dz1 = dL_da1 * (z1 > 0)
    dW1 = dL_dz1.T @ x
    db1 = dL_dz1.sum(axis=0)
    return {"W1": dW1, "b1": db1, "W2": dW2, "b2": db2, "W3": dW3, "b3": db3}


def train(X, T, *, epochs=EPOCHS, batch=BATCH, lr=LR, seed=RNG_SEED):
    rng = np.random.default_rng(seed)
    p = init_params(rng)
    n = X.shape[0]
    # Adam state
    m = {k: np.zeros_like(v) for k, v in p.items()}
    v = {k: np.zeros_like(v) for k, v in p.items()}
    b1, b2, eps = 0.9, 0.999, 1e-8
    history = []
    for epoch in range(epochs):
        idx = rng.permutation(n)
        Xs, Ts = X[idx], T[idx]
        for i in range(0, n, batch):
            xb, tb = Xs[i:i + batch], Ts[i:i + batch]
            z3, cache = forward(p, xb)
            grads = backward(p, cache, z3, tb)
            for k in p:
                m[k] = b1 * m[k] + (1 - b1) * grads[k]
                v[k] = b2 * v[k] + (1 - b2) * (grads[k] ** 2)
                m_hat = m[k] / (1 - b1 ** (epoch + 1))
                v_hat = v[k] / (1 - b2 ** (epoch + 1))
                p[k] = p[k] - lr * m_hat / (np.sqrt(v_hat) + eps)
        if epoch % max(1, epochs // 20) == 0 or epoch == epochs - 1:
            z3_full, _ = forward(p, X)
            y_full = sigmoid(z3_full)
            T_col = T.reshape(-1, 1) if T.ndim == 1 else T
            loss = mse_loss(y_full, T_col)
            mae = float(np.mean(np.abs(y_full - T_col)))
            history.append({"epoch": epoch, "loss": loss, "mae": mae})
            print(f"  epoch {epoch:4d}  loss={loss:.5f}  mae={mae:.4f}")
    return p, history


# ─── ONNX export with the trained weights ─────────────────────────────────────

def export_onnx(p):
    import onnx
    from onnx import helper, TensorProto, numpy_helper

    initializers = []
    nodes = []

    def add_linear(name, in_f, out_f, W, b):
        W_init = numpy_helper.from_array(W.astype(np.float32), name=f"{name}_W")
        b_init = numpy_helper.from_array(b.astype(np.float32), name=f"{name}_b")
        matmul = helper.make_node(
            "Gemm", [f"{name}_in", f"{name}_W", f"{name}_b"],
            [f"{name}_out"], transB=1,
        )
        return matmul, [W_init, b_init]

    nodes.append(helper.make_node("Identity", ["input"], ["l1_in"]))
    n, inits = add_linear("l1", 7, 16, p["W1"], p["b1"])
    nodes.append(n)
    initializers.extend(inits)
    nodes.append(helper.make_node("Relu", ["l1_out"], ["r1_out"]))

    nodes.append(helper.make_node("Identity", ["r1_out"], ["l2_in"]))
    n, inits = add_linear("l2", 16, 8, p["W2"], p["b2"])
    nodes.append(n)
    initializers.extend(inits)
    nodes.append(helper.make_node("Relu", ["l2_out"], ["r2_out"]))

    nodes.append(helper.make_node("Identity", ["r2_out"], ["l3_in"]))
    n, inits = add_linear("l3", 8, 1, p["W3"], p["b3"])
    nodes.append(n)
    initializers.extend(inits)
    nodes.append(helper.make_node("Sigmoid", ["l3_out"], ["output"]))

    graph = helper.make_graph(
        nodes,
        "stress_mlp",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, ["batch", 7])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, ["batch", 1])],
        initializer=initializers,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 10)])
    model.ir_version = 7
    onnx.save(model, str(ONNX_PATH))


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(RNG_SEED)
    X = sample_features(rng, N_SAMPLES)
    # Add small input noise so the network cannot memorize
    X = X + rng.normal(0, 0.005, X.shape).astype(np.float32)
    T = target_score(X).astype(np.float32)
    # Add small target noise
    T = np.clip(T + rng.normal(0, 0.03, T.shape).astype(np.float32), 0, 1)

    # Train/val split
    n_val = int(N_SAMPLES * VAL_FRACTION)
    perm = rng.permutation(N_SAMPLES)
    val_idx, tr_idx = perm[:n_val], perm[n_val:]
    X_tr, T_tr = X[tr_idx], T[tr_idx]
    X_val, T_val = X[val_idx], T[val_idx]

    print(f"Training stress MLP on {N_SAMPLES} synthetic samples...")
    t0 = time.time()
    p, history = train(X_tr, T_tr)
    dt = time.time() - t0

    z3_val, _ = forward(p, X_val)
    y_val_p = sigmoid(z3_val)
    T_val_col = T_val.reshape(-1, 1) if T_val.ndim == 1 else T_val
    val_mae = float(np.mean(np.abs(y_val_p - T_val_col)))
    val_mse = float(np.mean((y_val_p - T_val_col) ** 2))
    print(f"\nTrained in {dt:.1f}s.  Val MAE={val_mae:.4f}  Val MSE={val_mse:.4f}")

    # Save weights, data, metrics
    np.savez(WEIGHTS_PATH, **p)
    np.savez(DATA_PATH, X=X, T=T, val_idx=val_idx, tr_idx=tr_idx)
    metrics = {
        "n_samples": int(N_SAMPLES),
        "n_train": int(len(tr_idx)),
        "n_val": int(len(val_idx)),
        "epochs": int(EPOCHS),
        "batch": int(BATCH),
        "lr": float(LR),
        "val_mae": val_mae,
        "val_mse": val_mse,
        "train_history_tail": history[-5:],
        "seed": int(RNG_SEED),
        "train_seconds": round(dt, 2),
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))

    # Re-export ONNX
    print(f"Exporting trained ONNX to {ONNX_PATH}...")
    export_onnx(p)
    print(f"ONNX size: {ONNX_PATH.stat().st_size} bytes")

    # Round-trip check via onnxruntime
    try:
        import onnxruntime as ort
        sess = ort.InferenceSession(str(ONNX_PATH))
        test = X_val[:5]
        y_onnx = sess.run(None, {sess.get_inputs()[0].name: test})[0]
        z3_np, _ = forward(p, test)
        y_np = sigmoid(z3_np)
        max_diff = float(np.max(np.abs(y_onnx - y_np)))
        print(f"ONNX vs numpy max diff: {max_diff:.2e}")
    except Exception as e:
        print(f"Round-trip check skipped: {e}")


if __name__ == "__main__":
    main()
