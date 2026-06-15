/**
 * System color tokens.
 *
 * The five recovery systems each have a distinct accent so the user can
 * tell them apart at a glance. The brand palette (amber/orange/red/green)
 * is reserved for the global debt scale and "cleared" state. To avoid
 * collisions, system accents are picked from the rose/cyan/violet/teal
 * spectrum, with liver kept as a yellow-gold that's distinct enough from
 * the brand amber by hue.
 *
 * Rules for using system colors:
 *   - At most one system is "active" (full color) per view — the primary
 *     hit. Other systems render in "muted" or grayscale state.
 *   - System colors are used on meters, accent text, the system strip,
 *     and protocol step indicators. Never as panel backgrounds.
 *   - On `#0A0A0B` and `#141416` surfaces, all five pass WCAG AA at body
 *     text size; verify with a contrast checker if the surface changes.
 */

import type { RecoverySystem } from "@/lib/types";

export type SystemAccentMode = "active" | "muted" | "soft";

interface SystemAccent {
  /** Full accent — used only for the primary hit system or active state. */
  active: string;
  /** Mid-alpha — used for "selected but not primary" states. */
  muted: string;
  /** Low-alpha — used for backgrounds, fills, glows. */
  soft: string;
  /** CSS custom property for the full accent. */
  cssVar: string;
}

export const SYSTEM_ACCENTS: Record<RecoverySystem, SystemAccent> = {
  cardiovascular: {
    active: "#F43F5E",
    muted:  "rgba(244, 63, 94, 0.4)",
    soft:   "rgba(244, 63, 94, 0.18)",
    cssVar: "var(--system-cardiovascular)",
  },
  brain: {
    active: "#22D3EE",
    muted:  "rgba(34, 211, 238, 0.4)",
    soft:   "rgba(34, 211, 238, 0.18)",
    cssVar: "var(--system-brain)",
  },
  liver: {
    active: "#EAB308",
    muted:  "rgba(234, 179, 8, 0.4)",
    soft:   "rgba(234, 179, 8, 0.18)",
    cssVar: "var(--system-liver)",
  },
  muscular: {
    active: "#A78BFA",
    muted:  "rgba(167, 139, 250, 0.4)",
    soft:   "rgba(167, 139, 250, 0.18)",
    cssVar: "var(--system-muscular)",
  },
  gut: {
    active: "#2DD4BF",
    muted:  "rgba(45, 212, 191, 0.4)",
    soft:   "rgba(45, 212, 191, 0.18)",
    cssVar: "var(--system-gut)",
  },
};

export const SYSTEM_ORDER: readonly RecoverySystem[] = [
  "cardiovascular",
  "brain",
  "liver",
  "muscular",
  "gut",
] as const;

export function getSystemAccent(
  system: RecoverySystem,
  mode: SystemAccentMode = "active"
): string {
  return SYSTEM_ACCENTS[system][mode];
}

/** True if the given system is the highest-score one. */
export function pickPrimarySystem(
  scores: { system: RecoverySystem; score: number }[]
): RecoverySystem | null {
  if (!scores.length) return null;
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  return sorted[0].score > 0 ? sorted[0].system : null;
}
