"""
Generate the agent-trace dataset for the Body Debt HF Space.

For each canonical stressor profile, this script runs the full Body Debt
analysis pipeline (parse -> score -> face -> plan -> coach) and writes one
JSONL record per profile capturing the visible reasoning chain. The
output is meant to be uploaded as a public HF dataset so judges and
other builders can inspect what the small-model "agent" actually does.

Why this exists: the "Sharing is Caring" bonus quest for the
Build Small Hackathon rewards published agent traces.

Usage:
    python generate_trace_dataset.py
    # writes body_debt_traces.jsonl in the script's directory
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime
from pathlib import Path

import numpy as np

from scoring import (
    Stressor,
    compute_live_score,
    compute_system_scores,
    compute_counterfactual,
)
from face_scan import features_to_array, StressFeatures
from stress_model import predict_stress_score
from health_coach import _fallback_advice, _fallback_plan

HERE = Path(__file__).parent
OUT_PATH = HERE / "body_debt_traces.jsonl"

RNG = np.random.default_rng(7)


# ─── Profile definitions ──────────────────────────────────────────────────────
# Each profile is a (slug, description, stressor_kwargs) tuple. The slug
# becomes the trace_id so the dataset is greppable.

PROFILES = [
    (
        "bad_night_spirits",
        "Heavy drinking + bad sleep + destroyed legs workout",
        dict(
            alcohol=True, alcohol_type="spirits", alcohol_count="5+",
            training=True, training_area="legs", training_intensity="destroyed",
            sleep=True, sleep_hours="under_4",
            stress=False, ill=False, care=False,
        ),
    ),
    (
        "red_wine_dinner",
        "Two glasses of red wine, otherwise a normal day",
        dict(
            alcohol=True, alcohol_type="red_wine", alcohol_count="1-2",
            training=False, sleep=False, stress=False, ill=False, care=False,
        ),
    ),
    (
        "hiit_cardio",
        "Hard HIIT session, slept fine",
        dict(
            alcohol=False,
            training=True, training_area="hiit", training_intensity="hard",
            sleep=True, sleep_hours="6-7",
            stress=False, ill=False, care=False,
        ),
    ),
    (
        "sick_day",
        "Mild flu, no training, slept poorly",
        dict(
            alcohol=False, training=False,
            sleep=True, sleep_hours="4-6",
            stress=False,
            ill=True, ill_severity="mild", care=True,
        ),
    ),
    (
        "stress_week",
        "Major work stress, otherwise taking care of self",
        dict(
            alcohol=False, training=False, sleep=True, sleep_hours="6-7",
            stress=True, stress_carried="carried_all_day",
            ill=False, care=True,
        ),
    ),
    (
        "recovery_day",
        "Logged a self-care day with mobility and good sleep",
        dict(
            alcohol=False,
            training=True, training_area="mobility", training_intensity="easy",
            sleep=True, sleep_hours="6-7",
            stress=False, ill=False, care=True,
        ),
    ),
    (
        "champagne_brunch",
        "Three glasses of champagne at brunch, otherwise calm",
        dict(
            alcohol=True, alcohol_type="champagne", alcohol_count="3-4",
            training=False, sleep=True, sleep_hours="6-7",
            stress=False, ill=False, care=False,
        ),
    ),
    (
        "lost_count",
        "Lost count of drinks, slept terribly, work stress",
        dict(
            alcohol=True, alcohol_type="cocktails", alcohol_count="lost_count",
            training=False, sleep=True, sleep_hours="under_4",
            stress=True, stress_carried="carried_all_day",
            ill=False, care=False,
        ),
    ),
    (
        "clean_day",
        "No stressors logged",
        dict(
            alcohol=False, training=False, sleep=False,
            stress=False, ill=False, care=False,
        ),
    ),
    (
        "floored",
        "Severely ill, body aches, not training, slept badly",
        dict(
            alcohol=False, training=False,
            sleep=True, sleep_hours="4-6",
            stress=True, stress_carried="mostly_gone",
            ill=True, ill_severity="floored", care=True,
        ),
    ),
    (
        "easy_upper",
        "Light upper body workout, slept well, otherwise normal",
        dict(
            alcohol=False,
            training=True, training_area="upper", training_intensity="easy",
            sleep=True, sleep_hours="6-7",
            stress=False, ill=False, care=False,
        ),
    ),
    (
        "mild_hangover",
        "Beer night (3-4), slept 4-6 hours, light day planned",
        dict(
            alcohol=True, alcohol_type="beer", alcohol_count="3-4",
            training=False, sleep=True, sleep_hours="4-6",
            stress=False, ill=False, care=False,
        ),
    ),
]


# ─── Helpers ──────────────────────────────────────────────────────────────────


def build_stressors(profile: dict) -> list[Stressor]:
    s = profile
    out: list[Stressor] = []
    if s.get("alcohol"):
        out.append(Stressor(
            type="alcohol",
            alcohol_type=s.get("alcohol_type", "beer"),
            alcohol_count=s.get("alcohol_count", "3-4"),
        ))
    if s.get("training"):
        out.append(Stressor(
            type="training",
            training_area=s.get("training_area", "full_body"),
            training_intensity=s.get("training_intensity", "hard"),
        ))
    if s.get("sleep"):
        out.append(Stressor(
            type="sleep",
            sleep_hours=s.get("sleep_hours", "4-6"),
        ))
    if s.get("stress"):
        out.append(Stressor(
            type="stress",
            stress_carried=s.get("stress_carried", "carried_all_day"),
        ))
    if s.get("ill"):
        out.append(Stressor(
            type="ill",
            ill_severity=s.get("ill_severity", "moderate"),
        ))
    if s.get("care"):
        out.append(Stressor(type="care"))
    return out


def synthetic_face(stressors: list[Stressor]) -> tuple[list, np.ndarray, float]:
    """Build a physiologically-plausible 7-feature face vector from the stressors.

    We don't have a real webcam, so we synthesize features that match
    the stress level implied by the deterministic score. The model then
    runs on these features, which is the same code path as a real scan.
    """
    if not stressors:
        face = StressFeatures(
            left_eye_aspect=0.33, right_eye_aspect=0.32,
            brow_tension=0.045, mouth_tension=5.5,
            eye_symmetry=0.05, mouth_opening=0.15,
            timestamp=time.time(),
        )
    else:
        # Map stressor types to face geometry deltas
        left_ear = 0.32
        right_ear = 0.31
        brow = 0.045
        mouth_t = 5.0
        eye_sym = 0.05
        mouth_o = 0.15
        for s in stressors:
            if s.type == "sleep" and s.sleep_hours in ("under_4", "4-6"):
                left_ear -= 0.07
                right_ear -= 0.06
                mouth_o -= 0.06
            if s.type == "alcohol" and s.alcohol_count in ("5+", "lost_count"):
                brow -= 0.012
                eye_sym += 0.05
                mouth_t += 2.0
            if s.type == "stress" and s.stress_carried == "carried_all_day":
                brow -= 0.010
                mouth_t += 1.0
            if s.type == "training" and s.training_intensity == "destroyed":
                mouth_t += 1.5
                mouth_o -= 0.04
            if s.type == "ill":
                left_ear -= 0.04
                right_ear -= 0.04
        face = StressFeatures(
            left_eye_aspect=float(np.clip(left_ear, 0.16, 0.45)),
            right_eye_aspect=float(np.clip(right_ear, 0.16, 0.45)),
            brow_tension=float(np.clip(brow, 0.022, 0.06)),
            mouth_tension=float(np.clip(mouth_t, 2.0, 12.0)),
            eye_symmetry=float(np.clip(eye_sym, 0.0, 0.3)),
            mouth_opening=float(np.clip(mouth_o, 0.0, 0.4)),
            timestamp=time.time(),
        )
    arr = features_to_array(face)
    return [face], arr, predict_stress_score(arr)[0]


# ─── Trace generation ─────────────────────────────────────────────────────────


def run_one(slug: str, description: str, profile: dict) -> dict:
    t0 = time.time()
    stressors = build_stressors(profile)
    steps: list[dict] = []

    # Step 1: parse
    steps.append({"name": "parse_stressors", "status": "done",
                  "detail": f"{len(stressors)} stressors selected",
                  "inputs": profile})

    # Step 2: score
    live_score = compute_live_score(stressors)
    system_scores = compute_system_scores(
        stressors,
        now=datetime.now(),
        bed_time="1:00 AM" if any(s.type == "sleep" and s.sleep_hours == "under_4"
                                  for s in stressors) else None,
        wake_time="7:00 AM" if any(s.type == "sleep" for s in stressors) else None,
    )
    steps.append({"name": "compute_live_score", "status": "done",
                  "detail": f"score={live_score}/100"})
    steps.append({"name": "compute_system_scores", "status": "done",
                  "detail": ", ".join(f"{s.system}={s.score}" for s in system_scores)})

    # Step 3: face scan (synthetic)
    face_objs, face_arr, face_stress = synthetic_face(stressors)
    steps.append({"name": "face_scan", "status": "done",
                  "detail": f"features=7, stress={face_stress:.1f}/100"})

    # Step 4: triage plan
    sys_dicts = [
        {"system": s.system, "label": s.label, "score": s.score,
         "cleared_at": s.cleared_at, "recovery_hrs": s.recovery_hrs}
        for s in system_scores
    ]
    plan = _fallback_plan(sys_dicts)
    steps.append({"name": "triage_plan", "status": "done",
                  "detail": "PRIORITY · SECONDARY · AVOID (deterministic fallback)",
                  "plan": plan})

    # Step 5: counterfactual
    cf = compute_counterfactual(
        stressors, system_scores,
        "1:00 AM" if any(s.type == "sleep" and s.sleep_hours == "under_4" for s in stressors) else None,
        "7:00 AM" if any(s.type == "sleep" for s in stressors) else None,
    )
    steps.append({"name": "counterfactual", "status": "done" if cf else "skipped",
                  "detail": (f"{cf['lever_label']} -> {cf['system_label']} "
                             f"{cf['from_score']}->{cf['to_score']}") if cf else "no lever"})

    # Step 6: LLM coach
    stressor_summary = ", ".join(s.type for s in stressors) or "none"
    advice = _fallback_advice(live_score, sys_dicts, stressor_summary)
    steps.append({"name": "llm_coach", "status": "done",
                  "detail": "deterministic fallback (LLM stream not exercised in dataset gen)"})

    # Compact outputs
    record = {
        "trace_id": slug,
        "description": description,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "wall_time_s": round(time.time() - t0, 3),
        "steps": steps,
        "outputs": {
            "live_score": live_score,
            "system_scores": [
                {
                    "system": s.system,
                    "label": s.label,
                    "score": s.score,
                    "recovery_hrs": s.recovery_hrs,
                    "cleared_at": s.cleared_at,
                }
                for s in system_scores
            ],
            "face_stress": round(float(face_stress), 1),
            "plan": plan,
            "counterfactual": cf,
            "coach_advice_first_120": advice[:120],
        },
    }
    return record


def main() -> None:
    records = []
    for slug, desc, profile in PROFILES:
        rec = run_one(slug, desc, profile)
        records.append(rec)
        print(f"  {slug:24s}  score={rec['outputs']['live_score']:3d}  "
              f"face={rec['outputs']['face_stress']:5.1f}  "
              f"steps={len(rec['steps'])}  {rec['wall_time_s']}s")

    with OUT_PATH.open("w") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")
    print(f"\nWrote {len(records)} traces to {OUT_PATH} "
          f"({OUT_PATH.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
