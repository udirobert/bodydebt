import { describe, it, expect } from "vitest";
import {
  buildOutcomeSignal,
  parsePriorDebtScoreFromMemory,
} from "@/lib/supermemory/outcome-signals";
import { MEMORY_PRESCRIPTION, MEMORY_DEMO_FACTS } from "@/lib/memory-demo-data";

describe("parsePriorDebtScoreFromMemory", () => {
  it("extracts score from session log format", () => {
    const score = parsePriorDebtScoreFromMemory(
      "[2026-07-11] Body debt assessment score is 52.",
      "Score: 64/100\nVerdict: High debt",
    );
    expect(score).toBe(52);
  });
});

describe("buildOutcomeSignal", () => {
  const memoryCtx = {
    profile: MEMORY_DEMO_FACTS.join("\n"),
    memories: "Score: 52/100. Caffeine delay 90min prescribed yesterday.",
  };

  it("logs when memory shaped prescription and debt changed", () => {
    const signal = buildOutcomeSignal({
      currentScore: 64,
      priorScore: 52,
      prescription: MEMORY_PRESCRIPTION,
      memoryCtx,
      stressors: ["sleep", "alcohol"],
    });

    expect(signal.shouldLog).toBe(true);
    expect(signal.content).toContain("52 → 64");
    expect(signal.content).toContain("Coach repeated prior advice");
    expect(signal.metadata.type).toBe("outcome_signal");
    expect(signal.metadata.echoedPriorAdvice).toBe(true);
    expect(signal.metadata.debtDelta).toBe(12);
  });

  it("skips first session with no memory history", () => {
    const signal = buildOutcomeSignal({
      currentScore: 40,
      priorScore: null,
      prescription: MEMORY_PRESCRIPTION,
      memoryCtx: null,
      stressors: ["sleep"],
    });

    expect(signal.shouldLog).toBe(false);
  });
});
