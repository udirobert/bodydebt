# Agent Guide: Body Debt

Health/recovery tracking app on the Eazo platform. Quantifies physiological/cognitive "debt" from lifestyle stressors and provides AI-backed recovery prescriptions.

## Stack
- Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Bun
- `@eazo/sdk`: auth, device, ai, storage, memory, notifications
- shadcn/ui, lucide-react, framer-motion
- Drizzle ORM (PostgreSQL), Zustand

## Key Files

| Domain | Location |
|--------|----------|
| State | `src/stores/useBodyDebtStore.ts` |
| Scoring | `src/lib/systemScoring.ts` |
| AI Analysis | `src/app/api/analyze/` (stream, score, verdict, prescription routes) |
| Face Scan | `src/app/api/face-scan/route.ts` |
| HRV/Wearable | `src/app/api/terra/`, `src/app/api/garmin/`, `src/app/api/google-fit/` |
| QVAC Edge AI | `src/lib/qvac/index.ts`, `src/app/api/qvac/infer/route.ts` |
| ZK Proofs | `src/workers/ezkl-prover.worker.ts`, `src/lib/blockchain/`, `contracts/HealthCredentialVerifier.sol` |
| Orb Personality | `src/lib/orbPersonality.ts` (4 modes: honest, gentle, scientific, sarcastic) |

## Scoring System
- 5 biological systems: Cardiovascular, Brain/Cognition, Liver, Muscular/CNS, Gut
- Deterministic debt calculation from logged stressors (alcohol, training, sleep, stress, illness)
- Circadian penalties applied

## Integrations
- **Terra API**: WHOOP/Oura via OAuth; webhook + polling at `src/app/api/terra/*`
- **Garmin**: CSV upload parsing at `src/app/api/garmin/parse/route.ts`
- **Google Fit**: OAuth + data at `src/app/api/google-fit/*`
- **HRV Resolve**: Unified fallback chain at `src/app/api/hrv/resolve/route.ts`

## ZKML Pipeline (SKALE Hackathon)
1. **Edge AI**: `@mediapipe/face_mesh` → 7-dim feature vector → 7→16→8→1 MLP via `@qvac/ezkl`
2. **ZK Proof**: `ezkl-js` Web Worker generates proof + verifies locally; raw biometrics never leave device
3. **SKALE Verification**: Single atomic tx to `HealthCredentialVerifier` which calls `Halo2VerifierReusable.verifyProof` internally; credential event emitted only on valid proof

**Artifacts**: ONNX model (`scripts/generate-stress-model.py`), compiled circuit, 164MB pk.key
**Blockchain**: `src/lib/blockchain/skale-client.ts` (viem clients, ABIs, chain guard), `src/lib/providers/wagmi-config.ts`

## Coding Requirements

### Component Rules
- One component per file, `kebab-case.tsx` naming
- `page.tsx` = thin entry point (≤50 lines), imports from `src/components/<feature>/`
- Extract non-trivial UI into separate component files
- Group by feature, not type

### File Size Limits
| Type | Hard limit |
|------|------------|
| Page component | 50 lines |
| Feature component | 250 lines |
| API route | 100 lines |

### API Layer
- All fetch logic in `src/lib/api/` — never in components
- Typed functions, explicit return types
- Re-export via `src/lib/api/index.ts`

### Imports
- Use `@/` path aliases
- UI primitives from `@/components/ui/`

## Project Rules

- **AI calls only in `src/app/api/` route handlers** — never in client components
- **Call `memory.reportAction()` after every mutation** — chain `.catch(() => {})`
- **Never store face scan images**
- **Maintain local `users` table** — upsert on every `GET /api/user/profile`
- Run `bun run lint` and `bun run build` before shipping
