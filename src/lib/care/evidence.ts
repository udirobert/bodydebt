import evidenceData from "./glp1-evidence.json";
import type { CareEvidence } from "@/domain/care/types";

export interface Glp1EvidenceEntry {
  symptom: string;
  originalSideEffect: string;
  systemOrganClass: string;
  severity: "mild" | "moderate" | "severe";
  severityClassification: string;
  medication: string;
  dose: string;
  frequencyTreatmentPct: string;
  frequencyPlaceboPct: string;
  excessFrequencyPct: string;
  onsetTiming: string;
  duration: string;
  discontinuationRatePct: string;
  managementStrategy: string;
  clinicalSignificance: string;
  trialSource: string;
  notes: string;
}

export interface EvidenceBasedIntervention {
  action: string;
  evidence: CareEvidence;
}

const DEFAULT_MEDICATION = "Semaglutide";
const DEFAULT_DOSE = "2.4mg weekly";

const entries: Glp1EvidenceEntry[] = (evidenceData.entries as Glp1EvidenceEntry[]).map((e) => ({
  ...e,
  symptom: e.symptom as Glp1EvidenceEntry["symptom"],
  severity: e.severity as Glp1EvidenceEntry["severity"],
}));

function normalizeDose(dose?: string): string {
  if (!dose) return "";
  return dose.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreMatch(
  entry: Glp1EvidenceEntry,
  medication?: string,
  currentDose?: string,
): number {
  let score = 0;
  const normalizedDose = normalizeDose(currentDose);

  if (medication) {
    if (entry.medication.toLowerCase() === medication.toLowerCase()) score += 4;
    if (entry.medication.toLowerCase().includes(medication.toLowerCase())) score += 2;
  } else {
    if (entry.medication === DEFAULT_MEDICATION) score += 2;
  }

  if (normalizedDose) {
    if (normalizeDose(entry.dose) === normalizedDose) score += 3;
    if (normalizeDose(entry.dose).includes(normalizedDose)) score += 1;
  } else if (!medication && entry.medication === DEFAULT_MEDICATION && entry.dose === DEFAULT_DOSE) {
    // Prefer the most common default regimen when no context is supplied.
    score += 1;
  }

  return score;
}

/**
 * Find the best evidence-based management strategy for a symptom, severity,
 * and optional medication/dose.
 *
 * Falls back to the closest available severity classification when an exact
 * match is not found.
 */
export function getEvidenceBasedIntervention(
  symptom: string,
  severity: "mild" | "moderate" | "severe",
  medication?: string,
  currentDose?: string,
): EvidenceBasedIntervention | undefined {
  const normalizedSymptom = symptom.toLowerCase();
  const candidates = entries.filter(
    (e) => e.symptom.toLowerCase() === normalizedSymptom && e.severity === severity,
  );

  let best: Glp1EvidenceEntry | undefined;
  let bestScore = -Infinity;
  for (const entry of candidates) {
    const score = scoreMatch(entry, medication, currentDose);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best) {
    return {
      action: best.managementStrategy,
      evidence: {
        source: evidenceData.source,
        trialSource: best.trialSource,
        clinicalSignificance: best.clinicalSignificance,
      },
    };
  }

  // Fall back to the closest available severity classification.
  const severityOrder: ("mild" | "moderate" | "severe")[] =
    severity === "severe"
      ? ["moderate", "mild"]
      : severity === "moderate"
        ? ["mild", "severe"]
        : ["moderate", "severe"];
  for (const fallbackSeverity of severityOrder) {
    const fallback = getEvidenceBasedIntervention(symptom, fallbackSeverity, medication, currentDose);
    if (fallback) return fallback;
  }

  return undefined;
}

export function getAllEvidence(): readonly Glp1EvidenceEntry[] {
  return entries;
}
