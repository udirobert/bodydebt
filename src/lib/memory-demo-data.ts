import type { DebtAnalysis, Prescription, Stressor } from "@/lib/types";

/** Shared container tag with pre-seeded Supermemory data on the live site. */
export const DEMO_MEMORY_CONTAINER = "demo-bodydebt-seed";

export const DEMO_STRESSORS: Stressor[] = [
  { type: "sleep", sleepHours: "under_4" },
  { type: "alcohol", alcoholType: "beer", alcoholCount: "3-4" },
  { type: "stress", stressCarried: "yes" },
];

/** Generic prescription — what you get without memory (session 1 calculator). */
export const AMNESIA_PRESCRIPTION: Prescription = {
  rightNow: "Drink 500ml of water. Hydration supports basic recovery.",
  thisMorning: "Eat a balanced breakfast when you feel hungry.",
  today: "Light activity is fine — listen to your body.",
  avoid: "Intense training until you feel more recovered.",
};

/** Memory-backed prescription — session 2 with history (demo-bodydebt-seed). */
export const MEMORY_PRESCRIPTION: Prescription = {
  rightNow: "Drink 500ml water with electrolytes — alcohol dehydrated you overnight.",
  thisMorning:
    "Delay caffeine by 90 minutes. Your sleep was even shorter than yesterday — caffeine now would compound the cortisol spike.",
  today:
    "Take a 20-minute walk outside. Natural light is critical after two short nights.",
  avoid:
    "Intense training and alcohol. Your HRV is significantly suppressed and your liver is still processing last night.",
};

export const MEMORY_DEMO_ANALYSIS: DebtAnalysis = {
  debtScore: 64,
  verdict: "High debt — your body is running on fumes.",
  recoveryTime: "6 hours",
  prescription: MEMORY_PRESCRIPTION,
  stressorBreakdown: [
    { stressor: "Poor sleep (4h)", points: 18, insight: "Second night of short sleep", icon: "😴" },
    { stressor: "Alcohol (3 beers)", points: 14, insight: "Dehydrating, liver load", icon: "🍺" },
    { stressor: "Work stress", points: 12, insight: "Cortisol elevated", icon: "💼" },
  ],
  recoveryArc: {
    dangerEnds: new Date(Date.now() + 2 * 3600_000).toISOString(),
    partialEnds: new Date(Date.now() + 4 * 3600_000).toISOString(),
    clearedAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
  },
  confidenceLevel: "medium",
  agentTrace: {
    steps: [
      {
        agent: "triage",
        label: "Triage Agent",
        description: "Ranks systems and identifies priority.",
        status: "done",
        durationMs: 1200,
        source: "qvac-local",
        raw: "Priority: sleep. Secondary: metabolic (alcohol). Pattern: second day of sleep debt.",
      },
      {
        agent: "coach",
        label: "Recovery Coach Agent",
        description: "Generates personalized prescription.",
        status: "done",
        durationMs: 2800,
        source: "qvac-local",
        raw: "Caffeine delay repeated from day 1. Alcohol is new — prescribe electrolytes.",
      },
    ],
    source: "qvac-local",
    totalDurationMs: 4900,
    memoryContext:
      "Day 1 score: 52. Day 2 score: 64. Recurring: poor sleep (2 days). New: alcohol (3 beers). Effective yesterday: caffeine delay 90min.",
  },
};

export const MEMORY_DEMO_FACTS = [
  "Second day with sleep debt (4h last night, 5h the night before)",
  "Caffeine delay 90min was prescribed yesterday — repeat",
  "User prefers direct, no-nonsense advice",
  "Alcohol (3 beers) is a new factor today",
];
