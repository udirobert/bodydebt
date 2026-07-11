# Supermemory Demo Flow

This script walks through the before/after contrast that makes the
Supermemory integration visible to judges. The key narrative: **a
recovery coach without memory is a calculator. With memory, it's a
coach that knows you.**

## Setup

The live site at `https://bodydebt.thisyearnofear.com` has pre-seeded
demo data under the `demo-bodydebt-seed` container tag — two analysis
sessions showing a recurring sleep-debt pattern. Memories are processed
and ready for retrieval.

If demoing locally, run `bun dev` and ensure `.env.local` has:
```
SUPERMEMORY_API_KEY=...
SUPERMEMORY_BASE_URL=https://api.supermemory.ai
```

## Demo script (90 seconds)

### Act 1 — The problem (0-15s)

**Narration:** "Every recovery app gives you the same generic advice every time. Drink water. Get sleep. We built something different."

**On screen:** Show the opening screen. No memory badge — first-time user.

**Action:** Start an analysis. Select stressors: poor sleep (4 hours), alcohol (3 beers), work stress.

### Act 2 — The memory layer (15-45s)

**Narration:** "Body Debt uses Supermemory to give its AI coach persistent memory. When you run a second assessment, the coach recalls your history — past scores, recurring patterns, what worked last time."

**On screen:** Show the analysis loader. Point out the "Recalling your history" step with the purple Supermemory badge.

**Action:** The analysis stream runs. The agent trace panel shows the memory context injected into the triage and coach agent prompts.

**Key moment:** Expand the agent trace panel. Show the "Memory Context" section — the agent can see "Second day with sleep debt", "User prefers direct advice", "Caffeine delay prescribed yesterday".

### Act 3 — The personalized prescription (45-70s)

**Narration:** "Because the coach remembers, the prescription is different. It references your patterns. It knows caffeine delay worked yesterday. It knows alcohol is a recurring factor."

**On screen:** Show the prescription screen. Point out the "Why this prescription" callout — it explains the memory-backed reasoning.

**Action:** Navigate to the dashboard. Show the "Remembers you" badge and expand the "Your coach remembers" card. The card shows extracted facts with timestamps.

### Act 4 — User control (70-90s)

**Narration:** "And you're in control. You can forget individual memories or wipe everything. Your data, your rules."

**On screen:** Show the "Your coach remembers" card expanded. Hover over a fact — the "forget" button appears.

**Action:** Click "Forget all". The confirmation dialog appears: "Your coach will forget everything it knows about your patterns, past scores, and preferences."

**Closing:** "Body Debt — recovery coaching with memory. Built on Supermemory."

## Key differentiators to emphasize

1. **Memory shapes AI output, not just retrieval.** The memory is injected into the reasoning prompts of multiple AI agents. The prescription changes because of what the coach knows.
2. **All three primitives.** `add()` to store, `search()`/`profile()` to retrieve, `forget()` to delete. No competitor uses all three.
3. **User-controlled memory.** Per-fact forget + mass-forget with confirmation. The user owns their data.
4. **Six visible touchpoints.** Memory is visible at every stage — not hidden in a backend.

## Pre-seeded data

Two sessions were seeded to `demo-bodydebt-seed`:

| Session | Score | Key stressors | What it shows |
|---|---|---|---|
| 1 | 52 | Poor sleep (5h), work stress | Baseline session |
| 2 | 64 | Poor sleep (4h), alcohol (3 beers), work stress | Recurring pattern + new factor |

The Supermemory cloud API extracted these facts (among others):
- "Completed body debt assessment with score 52/64"
- "Stressors: poor sleep of 4/5 hours and work stress"
- "Delay caffeine 90 minutes" / "Avoid caffeine until 10am"
- "User prefers direct, no-nonsense advice"

## API verification

```bash
# Check memory is enabled on the live site
curl -s "https://bodydebt.thisyearnofear.com/api/memory/context?containerTag=demo-bodydebt-seed&q=body+debt" | jq .

# Store a new memory
curl -s -X POST "https://bodydebt.thisyearnofear.com/api/memory" \
  -H "Content-Type: application/json" \
  -d '{"containerTag":"demo-bodydebt-seed","content":"User viewed dashboard","event_type":"page_view"}'

# Forget all memories
curl -s -X DELETE "https://bodydebt.thisyearnofear.com/api/memory" \
  -H "Content-Type: application/json" \
  -d '{"containerTag":"demo-bodydebt-seed","all":true}'
```
