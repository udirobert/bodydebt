---
license: mit
task_categories:
  - other
tags:
  - body-debt
  - build-small-hackathon
  - agent-trace
  - sharing-is-caring
  - small-model
size_categories:
  - n<1K
---

# body-debt-traces

Agent traces from the [Body Debt](https://huggingface.co/spaces/build-small-hackathon/body-debt) HF Space, captured for the **Sharing is Caring** bonus quest of the [Build Small Hackathon](https://huggingface.co/build-small-hackathon).

Twelve canonical stressor profiles (heavy night, recovery day, mild hangover, etc.) and the full reasoning chain the app produces for each — parse, score, face, triage plan, counterfactual, coach. Each line is one self-contained JSON record.

## Schema

Each line of `body_debt_traces.jsonl` is a JSON object with:

| Field | Type | Description |
|---|---|---|
| `trace_id` | string | URL-safe slug, e.g. `bad_night_spirits` |
| `description` | string | Human-readable profile summary |
| `timestamp` | string (ISO 8601) | When the trace was captured |
| `wall_time_s` | float | Wall-clock time to run the full pipeline |
| `steps` | array of objects | Ordered reasoning-chain steps |
| `outputs` | object | Final live score, system scores, face stress, plan, counterfactual, first 120 chars of coach advice |

Each step in `steps` has:

| Field | Type | Description |
|---|---|---|
| `name` | string | One of `parse_stressors`, `compute_live_score`, `compute_system_scores`, `face_scan`, `triage_plan`, `counterfactual`, `llm_coach` |
| `status` | string | `done`, `active`, `error`, or `skipped` |
| `detail` | string | Short human-readable status detail |
| `inputs` | object | (only on `parse_stressors`) the raw stressor profile |
| `plan` | object | (only on `triage_plan`) `{priority, secondary, avoid}` |

## Reproduce

```bash
# Inside the hf-space/ directory of the Body Debt repo
python generate_trace_dataset.py    # regenerates body_debt_traces.jsonl
python publish_traces.py             # pushes to this dataset repo
```

The generator has no PyTorch or scikit-learn dependency. The LLM coach step in the captured traces uses the deterministic fallback (not the live SmolLM2-360M call) for reproducibility — the same prompt structure, just rendered without model inference.

## Why this exists

The Sharing is Caring bonus quest is for builders who publish their agent trace so other people can learn from it. This dataset is the visible reasoning chain of a 360M-param health coach for twelve realistic inputs. The point is: even with a 360M model, the reasoning chain is the most valuable part of the product, and it's worth publishing so others can study the pattern.

## License

MIT. See [Body Debt repository](https://github.com/udirobert/bodydebt).
