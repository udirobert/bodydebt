# Tether Developers Cup — Multi-Context Recovery Platform

## Competition

Tether Developers Cup, QVAC track. Theme: football + tournament moment.
All AI must run on-device through QVAC SDK, no cloud AI APIs.

## Strategy

Pivot from single-purpose "Body Debt" (personal health) to a **multi-context
recovery platform** where football ("Match Fit") is the headline demo mode and
personal health is the existing secondary mode. Additive, not replacing.

Pitch: *"Match Fit is the first context on a multi-context recovery platform
powered entirely by on-device AI. Scan a player, get a match-readiness score and
return-to-play protocol — no cloud, no API keys, works in a locker room with no
signal."*

## Architecture

```
                    +---------------------------------+
                    |   QVAC Multi-Agent Pipeline      |
                    |   (triage -> coach -> schedule)  |
                    +---------------+-----------------+
                                    |
                    +---------------v-----------------+
                    |   Recovery Context / Mode        |
                    |   - stressor catalog              |
                    |   - scoring weights               |
                    |   - agent prompt templates        |
                    |   - UI vocabulary                 |
                    +---------------+-----------------+
                                    |
           +------------------------+------------------------+
           v                        v                        v
     +----------+             +----------+             +----------+
     | Personal |             | Football |             | (future) |
     |  health  |             | Match Fit|             |  modes   |
     +----------+             +----------+             +----------+
```

## Implementation Plan

### Phase 1: RecoveryContext type + config registry

- Add `RecoveryMode = "personal" | "football"` to `src/lib/types.ts`
- Add football-specific `StressorType` entries: `match_minutes`, `card_stress`,
  `travel_timezone`, `concussion_check`
- Add `RecoveryContextConfig` interface: stressor catalog, scoring weight
  overrides, agent prompt fragments, vocabulary map, UI theme metadata
- Create `src/lib/contexts/personal.ts` and `src/lib/contexts/football.ts`
- Create `src/lib/contexts/index.ts` registry: `getContextConfig(mode)`

### Phase 2: Context-aware scoring

- Modify `computeSystemScores` to accept an optional `mode` param
- Football mode adds scoring logic for new stressor types:
  - `match_minutes`: muscular + cardiovascular load based on minutes played
  - `card_stress`: brain stress (psychological + cortisol)
  - `travel_timezone`: circadian disruption across all systems
  - `concussion_check`: flags brain system as critical
- Modify `computeScore` in `score/route.ts` to accept and pass `mode`
- Add football-specific `BASE_WEIGHTS` and `CONTEXT_MULTIPLIERS`

### Phase 3: Context-aware QVAC pipeline

- Modify `MultiAgentInput` to include `mode: RecoveryMode`
- Modify `scripts/qvac-worker.mjs` agent prompts to use context-specific
  vocabulary (football: "match-readiness", "return-to-play", "player";
  personal: existing health language)
- Pass `mode` through the stream route to the worker

### Phase 4: Store + API wiring

- Add `mode: RecoveryMode` to Zustand store, persisted, default `"football"`
- Add `setMode` action
- Add `squad: SquadPlayer[]` for football multi-entity mode
- Pass `mode` in `AnalyzeBodyRequest`

### Phase 5: Squad view (football mode)

- `SquadPlayer` type: id, name, position, stressors, faceAnalysis?, analysis?
- Squad management: add/remove players, scan each, see team readiness board
- Team readiness summary: who's fit to start, who's a sub, who's out

### Phase 6: UI theming + mode switching

- Mode toggle in the UI header
- Football theme: pitch/jersey aesthetic, "Match Fit" branding
- Personal theme: existing clinical look
- Context-aware vocabulary in all screens

## Round Milestones

- **Round of 16 (July 8):** Football mode functional — scan a player, get
  match-readiness score + return-to-play protocol, all on QVAC. Personal mode
  still works.
- **Quarter-Finals (July 10):** 3-min demo video. Leads with football, 20s beat
  showing mode switch to personal. Edge-vs-Cloud timing panel.
- **Semi-Finals (July 12-13):** Pitch deck. Multi-context platform story.
- **Final (July 15):** Live demo squad view + face scan + agent trace.

## Files to Create

| File | Purpose |
|---|---|
| `src/lib/contexts/index.ts` | Registry: `getContextConfig(mode)` |
| `src/lib/contexts/personal.ts` | Personal health context config |
| `src/lib/contexts/football.ts` | Football "Match Fit" context config |
| `src/lib/contexts/types.ts` | `RecoveryContextConfig` interface |
| `src/components/screens/SquadScreen.tsx` | Football squad management + readiness board |

## Files Modified

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `RecoveryMode`, football stressors, `SquadPlayer` |
| `src/lib/systemScoring.ts` | Context-aware scoring for new stressors |
| `src/app/api/analyze/score/route.ts` | Pass mode through, football weights, football verdict + prescription |
| `src/app/api/analyze/stream/route.ts` | Pass mode to QVAC pipeline |
| `src/lib/qvac/index.ts` | Pass mode in `MultiAgentInput` |
| `scripts/qvac-worker.mjs` | Context-aware agent prompts (match-readiness vs body debt vocabulary) |
| `src/stores/useBodyDebtStore.ts` | Add `mode`, `squad` state, persisted |
| `src/hooks/useStreamingAnalysis.ts` | Send mode in request body |
| `src/lib/i18n.ts` | Football vocabulary strings |
| UI screens | Mode toggle, football theming, squad view |

## Known Follow-ups

- **Intake UI**: Football-specific stressors (match_minutes, card_stress,
  travel_timezone, concussion_check) are scored server-side and visible in the
  football context's stressor catalog, but the existing intake screen still
  shows only the personal stressor list. For the demo video, we can either:
  1. Extend `src/lib/stressor-scoring.ts` STRESSORS array with football entries
  2. Build a context-aware intake screen that picks STRESSORS from the context config
  (3) add via JSON. For Round of 16 (July 8), option 1 is fastest.
- **Squad player analysis flow**: Players can be added to the squad but the
  actual per-player scan (stressor intake → face scan → QVAC pipeline → store
  on player) needs wiring. The data structures are ready; the UI flow is next.
- **Demo script**: Update `docs/qvac-edge-ai-demo.md` to lead with football
  ("Match Fit") before showing personal mode.
