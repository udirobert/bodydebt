# Body Debt

Body Debt is a health and recovery tracking application that quantifies the physiological and cognitive "debt" accumulated from lifestyle stressors, providing precise, AI-backed recovery prescriptions.

## Core Features

- **Stressor Intake**: Log lifestyle factors (alcohol, training, sleep, stress, illness) with a live, deterministically calculated debt meter.
- **Deterministic System Scoring**: Evaluates 5 biological systems (Cardiovascular, Brain/Cognition, Liver, Muscular/CNS, Gut) using physiological weights and circadian penalties.
- **Face Scan Analysis**: Optional device camera scan processed locally and analyzed via AI (`anthropic.claude-3-5-haiku`) to detect visible stress markers (puffiness, perfusion, inflammation). *No image data is retained.*
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

## Privacy & Data

- Face scans are processed client-side and sent only for immediate AI inference; no image data is stored.
- The app supports a guest-first flow, allowing users to generate scores without forced account creation. Authenticated users get persistent history via the local database.
