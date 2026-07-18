/**
 * Orbura → Mira posture mapping.
 *
 * Orbura's domain states map to Mira postures like this:
 *
 *   Orbura state                    → Mira posture
 *   ─────────────────────────────────────────────────────
 *   Landing, no active session       → steady
 *   User logging stressors           → inquiry
 *   Score computed, prescription ready → offering
 *   Recovery in progress             → holding
 *   Checking recovery timeline       → watching
 *   Recovery cleared                 → completed
 *
 * Orbura does not use: gathering, resolving, adapting (those are
 * Ardum/Sukari-specific). If Orbura adds a setback flow later, it
 * should use the `resolving` posture from the shared extension set.
 *
 * This file is Orbura-specific. The shared contract lives in `./contract.ts`.
 */

import type { MiraPresence, MiraPosture } from "./contract";

// ─── Orbura domain states ────────────────────────────────────────────────────

export type OrburaPhase =
  | "landing"      // no active session
  | "intake"       // user logging stressors
  | "analyzing"    // score being computed
  | "prescription" // score + prescription ready
  | "recovering"   // recovery in progress
  | "monitoring"   // user checking recovery timeline
  | "cleared";     // recovery complete

// ─── Mapping ─────────────────────────────────────────────────────────────────

const PHASE_TO_POSTURE: Record<OrburaPhase, MiraPosture> = {
  landing:     "steady",
  intake:      "inquiry",
  analyzing:   "inquiry",
  prescription: "offering",
  recovering:  "holding",
  monitoring:  "watching",
  cleared:     "completed",
};

const PHASE_TO_PRESENCE: Record<OrburaPhase, Omit<MiraPresence, "posture">> = {
  landing: {
    label: "Steady",
    message: "Log a check-in to wake the orb.",
    activity: "idle",
  },
  intake: {
    label: "Listening",
    message: "Mira is capturing what you logged.",
    activity: "listening",
  },
  analyzing: {
    label: "Processing",
    message: "Mira is computing your debt score.",
    activity: "processing",
  },
  prescription: {
    label: "Offering",
    message: "Mira has a prescription for you.",
    activity: "speaking",
  },
  recovering: {
    label: "Holding",
    message: "Mira is holding your recovery timeline.",
    activity: "idle",
  },
  monitoring: {
    label: "Watching",
    message: "Mira is watching your recovery progress.",
    activity: "idle",
  },
  cleared: {
    label: "Complete",
    message: "Mira logged this. Your body is clear.",
    activity: "arriving",
  },
};

export function orburaPresence(phase: OrburaPhase): MiraPresence {
  const base = PHASE_TO_PRESENCE[phase];
  return { ...base, posture: PHASE_TO_POSTURE[phase] };
}
