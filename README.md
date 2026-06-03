# Body Debt

Body Debt is a health and recovery tracking application that quantifies the physiological and cognitive "debt" accumulated from lifestyle stressors, providing precise, AI-backed recovery prescriptions.

## Core Features

- **Stressor Intake**: Log lifestyle factors (alcohol, training, sleep, stress, illness) with a live, deterministically calculated debt meter.
- **Deterministic System Scoring**: Evaluates 5 biological systems (Cardiovascular, Brain/Cognition, Liver, Muscular/CNS, Gut) using physiological weights and circadian penalties.
- **Face Scan Analysis**: Optional device camera scan processed entirely on-device via MediaPipe FaceMesh. Facial geometry is reduced to a lightweight feature vector, passed through an EZKL zero-knowledge circuit to produce a cryptographic proof, and verified on the SKALE Europa testnet. *Raw biometric data never leaves the device.*
- **HRV & Wearable Integration**: Connect Terra API (WHOOP/Oura), upload Garmin CSVs, or use a manual subjective proxy to increase score confidence tiers.
- **AI-Powered Analysis**: Streams a comprehensive `DebtAnalysis` including a 0–100 score, verdict, specific recovery time, and tiered prescriptions (Right Now, This Morning, Today, Avoid).
- **Dashboard**: Animated "Debt Orb" visualization, 5-system breakdown with scientific citations, confidence tier signals, and clean streak tracking.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Runtime/Package Manager**: Bun
- **Styling**: Tailwind CSS v4, shadcn/ui, framer-motion, lucide-react
- **State**: Zustand (guest-first flow with `localStorage` persistence)
- **Database**: Drizzle ORM + PostgreSQL
- **Platform**: `@eazo/sdk` (Auth, AI gateway, Memory, Notifications)
- **Edge AI**: MediaPipe FaceMesh (browser), QVAC SDK (local Node.js LLM inference)
- **Zero-Knowledge Proofs**: EZKL (`@ezkljs/engine`) running in a Web Worker
- **Blockchain**: SKALE Europa Testnet via wagmi/viem

## Getting Started

1. Install dependencies with Bun:
   ```bash
   bun install
   ```
   *(If `sharp` installation stalls, run: `SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install`)*

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Fill in your Eazo credentials and database URL in `.env`:
   - `EAZO_APP_ID`: Your Eazo app ID.
   - `EAZO_PRIVATE_KEY`: Your Eazo developer private key (hex, 64 chars).
   - `DATABASE_URL`: PostgreSQL connection string.
   - `NEXT_PUBLIC_VERIFIER_ADDRESS`: Deployed HealthCredentialVerifier contract address on SKALE testnet (optional — uses zero address if unset).
   - `DEPLOYER_PRIVATE_KEY`: Wallet private key for contract deployment (only needed for `scripts/deploy-contract.ts`).

4. Run database migrations (if applicable):
   ```bash
   bun run db:push
   ```

5. Start the development server:
   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Useful Commands

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun run lint     # Run ESLint
bun run db:studio # Open Drizzle Studio
```

## ZK Privacy Pipeline (Hackathon)

The face scan flow implements a full zero-knowledge machine learning pipeline for the [QVAC Edge AI](https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i) and [SKALE Programmable Privacy](https://dorahacks.io/hackathon/programmable-privacy) hackathons:

```
MediaPipe FaceMesh → extractStressFeatures (5 floats)
  → EZKL Web Worker → ZK proof (WASM)
    → SKALE contract write (wagmi) → HealthCredentialVerified event
      → QVAC local AI health coach (/api/qvac/infer)
```

### Setup

1. **Generate the ONNX model** (requires Python + onnx):
   ```bash
   python scripts/generate-stress-model.py
   ```

2. **Compile the EZKL circuit** (requires [EZKL CLI](https://docs.ezkl.xyz/)):
   ```bash
   bash scripts/compile-ezkl-circuit.sh
   ```
   This produces `public/ezkl/{compiled.ezkl,pk.key,srs.key}`. If these files are missing at runtime, the worker falls back to a realistic mock proof automatically.

3. **Deploy the verifier contract** (requires sFUEL from the [SKALE faucet](https://docs.skale.network/develop/faucet)):
   ```bash
   bunx hardhat run scripts/deploy-contract.ts --network skaleEuropaTestnet
   ```
   Then set `NEXT_PUBLIC_VERIFIER_ADDRESS` to the deployed address.

## Privacy & Data

- Face scans run entirely on-device: MediaPipe extracts landmarks, EZKL generates a ZK proof, and only the proof (not raw biometrics) is submitted to the SKALE blockchain for verification.
- The QVAC health coach runs a local LLM — no inference requests leave the device.
- The app supports a guest-first flow, allowing users to generate scores without forced account creation. Authenticated users get persistent history via the local database.
