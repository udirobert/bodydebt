import type { Prescription } from "@/lib/types";
import type { MemoryContext } from "./index";
import {
  attributePrescriptionLines,
  collectMemoryFacts,
  type PrescriptionKey,
  type AttributionSource,
} from "./prescription-attribution";

export interface OutcomeSignalInput {
  currentScore: number;
  priorScore: number | null;
  prescription: Prescription;
  memoryCtx: MemoryContext | null;
  stressors: string[];
}

export interface OutcomeSignal {
  shouldLog: boolean;
  content: string;
  metadata: Record<string, string | number | boolean>;
}

const SCORE_PATTERNS = [
  /Score:\s*(\d{1,3})\/100/i,
  /score (?:is |was )?(\d{1,3})/i,
  /debt (?:score )?(?:is |was )?(\d{1,3})/i,
  /assessment.*?(\d{1,3})\/100/i,
  /(\d{1,3})\/100/,
];

/**
 * Extract the most recent prior debt score mentioned in Supermemory recall.
 * Used for guests and as a fallback when DB history is unavailable.
 */
export function parsePriorDebtScoreFromMemory(
  profile: string,
  memories: string,
): number | null {
  const chunks = [...profile.split("\n"), ...memories.split("\n")].filter(Boolean);
  for (const chunk of chunks) {
    for (const pattern of SCORE_PATTERNS) {
      const match = chunk.match(pattern);
      if (match) {
        const score = Number.parseInt(match[1], 10);
        if (score >= 0 && score <= 100) return score;
      }
    }
  }
  return null;
}

function formatLineLabel(key: PrescriptionKey): string {
  const labels: Record<PrescriptionKey, string> = {
    rightNow: "right now",
    thisMorning: "this morning",
    today: "today",
    avoid: "avoid",
  };
  return labels[key];
}

/**
 * Builds a structured outcome memory when prior context shaped this session.
 * Closes the loop: recall → behavior → measurable debt change → log outcome.
 */
export function buildOutcomeSignal(input: OutcomeSignalInput): OutcomeSignal {
  const { currentScore, priorScore, prescription, memoryCtx, stressors } = input;

  const memoryFacts = memoryCtx
    ? collectMemoryFacts(memoryCtx.profile, memoryCtx.memories.split("\n").filter(Boolean))
    : [];

  const hadMemoryHistory = memoryFacts.length > 0;
  if (!hadMemoryHistory) {
    return { shouldLog: false, content: "", metadata: {} };
  }

  const attribution = attributePrescriptionLines(prescription, memoryFacts);
  const echoedLines = (Object.entries(attribution) as [PrescriptionKey, AttributionSource][])
    .filter(([, source]) => source === "memory")
    .map(([key]) => formatLineLabel(key));

  const debtDelta = priorScore !== null ? currentScore - priorScore : null;
  const echoed = echoedLines.length > 0;

  // Need either a score comparison or memory-shaped prescription to log.
  if (!echoed && debtDelta === null) {
    return { shouldLog: false, content: "", metadata: {} };
  }

  const parts: string[] = [];

  if (priorScore !== null && debtDelta !== null) {
    const direction =
      debtDelta < 0 ? "improved" : debtDelta > 0 ? "worsened" : "held steady";
    parts.push(
      `Body debt ${direction} since last session (${priorScore} → ${currentScore}, ${debtDelta > 0 ? "+" : ""}${debtDelta}).`,
    );
  }

  if (echoed) {
    parts.push(
      `Coach repeated prior advice for: ${echoedLines.join(", ")}.`,
    );
  }

  if (debtDelta !== null && echoed) {
    if (debtDelta < 0) {
      parts.push("Memory-backed prescription coincided with lower debt.");
    } else if (debtDelta > 0) {
      parts.push("Debt rose despite repeated prior patterns — coach may adjust next time.");
    }
  }

  if (stressors.length > 0) {
    parts.push(`Today's stressors: ${stressors.join(", ")}.`);
  }

  return {
    shouldLog: true,
    content: `Recovery outcome signal. ${parts.join(" ")}`,
    metadata: {
      type: "outcome_signal",
      debtScore: currentScore,
      priorDebtScore: priorScore ?? -1,
      debtDelta: debtDelta ?? 0,
      memoryBackedLineCount: echoedLines.length,
      echoedPriorAdvice: echoed,
      stressorCount: stressors.length,
    },
  };
}
