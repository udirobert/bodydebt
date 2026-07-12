import type { Prescription } from "@/lib/types";

export type PrescriptionKey = keyof Prescription;
export type AttributionSource = "memory" | "new";

const STOP_WORDS = new Set([
  "your", "the", "and", "with", "this", "that", "from", "into", "have",
  "will", "been", "after", "before", "about", "more", "than", "them",
  "they", "their", "take", "drink", "avoid", "until", "still", "need",
]);

/**
 * Heuristic attribution — maps each prescription line to memory or new.
 * Used on the prescription screen to show judges memory shaped the output.
 */
export function attributePrescriptionLines(
  prescription: Prescription,
  memoryFacts: string[],
): Record<PrescriptionKey, AttributionSource> {
  const corpus = memoryFacts.join(" ").toLowerCase();
  const keys: PrescriptionKey[] = ["rightNow", "thisMorning", "today", "avoid"];

  const result = {} as Record<PrescriptionKey, AttributionSource>;

  for (const key of keys) {
    const line = prescription[key].toLowerCase();
    const words = line
      .split(/\W+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

    const matchCount = words.filter((w) => corpus.includes(w)).length;
    const ratio = words.length > 0 ? matchCount / words.length : 0;

    const hasPattern =
      (line.includes("caffeine") && corpus.includes("caffeine")) ||
      (line.includes("alcohol") && corpus.includes("alcohol")) ||
      (line.includes("sleep") && corpus.includes("sleep")) ||
      (line.includes("night") && (corpus.includes("sleep") || corpus.includes("night"))) ||
      (line.includes("yesterday") || line.includes("last night") || line.includes("shorter than")) ||
      (line.includes("walk") && (corpus.includes("walk") || corpus.includes("light"))) ||
      (line.includes("electrolyte") && corpus.includes("electrolyte")) ||
      (line.includes("liver") && corpus.includes("liver")) ||
      (line.includes("90") && corpus.includes("90"));

    result[key] = ratio >= 0.2 || hasPattern ? "memory" : "new";
  }

  return result;
}

export function collectMemoryFacts(profile: string, memories: string[]): string[] {
  return [
    ...profile.split("\n").map((l) => l.trim()).filter(Boolean),
    ...memories,
  ];
}
