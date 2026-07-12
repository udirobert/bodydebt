# Body Debt

Body Debt is a recovery intelligence app focused on three active tracks:

- **Supermemory agent memory**: the AI recovery coach remembers your patterns, past scores, and what worked — and uses that context to personalize every prescription. Uses all three Supermemory primitives: `add()`, `search()`/`profile()`, and `forget()`.
- **SKALE programmable privacy**: prove the face-scan and scoring steps without exposing raw biometric data.
- **Tether Developers Cup**: ship a football Match Fit experience with on-device QVAC reasoning and WDK-backed squad payments.

The app logs lifestyle stressors, computes deterministic physiological debt across five systems, and streams recovery guidance through an on-device QVAC pipeline. The SKALE path adds zero-knowledge proof generation and on-chain verification for the face-scan flow. The Supermemory integration gives the QVAC multi-agent pipeline persistent memory — the triage and coach agents receive injected memory context that shapes their prescriptions.

## Supermemory integration

The coach doesn't just retrieve memories — it **reasons over them**. Memory context is injected into the triage and coach agent prompts in the QVAC pipeline, so the prescription you get on day 2 is different from day 1 because the agent knows what happened on day 1.

After each session, an **outcome signal** logs whether debt moved and which prior advice was echoed — closing the feedback loop so future recalls include results, not just prescriptions.

**Three primitives, all used:**

| Primitive | Where | What it does |
|---|---|---|
| `add()` | `POST /api/memory`, `logSession()`, `logOutcomeSignal()` | Logs actions, sessions, and cross-session outcome signals |
| `search()` / `profile()` | `GET /api/memory/context` | Retrieves profile facts + relevant memories for agent context and UI display |
| `forget()` | `DELETE /api/memory` | Single-memory soft-delete + agentic mass-forget with user confirmation |

**User-facing flows:**

| Route | Purpose |
|---|---|
| `/coach-memory` | Side-by-side day 1 vs day 2 prescription comparison |
| `/preview` | Full labeled example dashboard (isolated from user data) |
| Opening screen | Links to both for first-time and returning users |

**UI touchpoints** (gracefully hidden when Supermemory is disabled):

1. Dashboard "Remembers you" badge
2. "Your coach remembers" card with per-fact forget + local memory status
3. Agent trace panel showing injected memory context
4. Analysis loader driven by real `memory_recall` SSE events
5. Opening screen welcome-back with recalled facts
6. Prescription screen with `from memory` / `new today` attribution chips

**Architecture:** All Supermemory calls go through `src/lib/supermemory/` (server-only). Client code POSTs to `/api/memory` which calls the server module. Memory is fetched in parallel during analysis (`/api/analyze/stream`) and injected into agent prompts. The `containerTag` is the user's `anonymousId` (or `userId` when authenticated). Example sessions at `/preview` use a shared demo container without touching the user's ID.

## Current focus

- Persistent agent memory via Supermemory
- Privacy-preserving health verification on SKALE
- Football / match-readiness flows for the Tether Cup
- On-device AI for recovery coaching, scheduling, and explainability

## Documentation

- [docs/tether-cup-plan.md](docs/tether-cup-plan.md) — strategy and implementation notes for Tether.
- [docs/skale-privacy-demo.md](docs/skale-privacy-demo.md) — demo flow for the SKALE privacy story.
- [docs/supermemory-demo.md](docs/supermemory-demo.md) — demo flow for the Supermemory agent memory story.
- [docs/deployment.md](docs/deployment.md) — deployment, HTTPS, and runtime notes.
- [docs/zk-pipeline.md](docs/zk-pipeline.md) — ZK artifact workflow and on-chain verification.

## Repo shape

- [src/](src/) — main app, UI, QVAC pipeline, and SKALE client logic.
- [contracts/](contracts/) — Halo2/SKALE verifier contracts.
- [scripts/](scripts/) — active deployment and runtime helpers.
- [archive/legacy-gradio/](archive/legacy-gradio/) — historical root-level Gradio prototype scripts.
- [docs/legacy/](docs/legacy/) — archived notes for older hackathon tracks.
- [hf-space/archive/](hf-space/archive/) — historical Hugging Face experiment scripts.
- [scripts/legacy/](scripts/legacy/) — preserved historical deployment / audit scripts.

## Quick start

```bash
bun install
bun dev
```

## Legacy materials

Older hackathon notes and scripts are archived in [docs/legacy/](docs/legacy/) and [scripts/legacy/](scripts/legacy/). They remain available for reference, but the active launch plan now centers on SKALE and Tether.
