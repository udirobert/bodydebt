import type { RecoveryMode } from "@/lib/types";
import { SYSTEMS, scienceEntry } from "@/lib/science";

export interface SystemScience {
  system: string;
  icon: string;
  accent: string;
  fact: string;
  cite: string;
  expanded: string;
  stressors: { name: string; systems: string }[];
}

/**
 * Systems-science cards for the evidence deep-dive, derived from the canonical
 * `@/lib/science` module. Fan mode swaps the cardiovascular and brain cards for
 * their emotional-stress variants (NEJM World Cup, stress/sleep); other modes
 * get the base (alcohol/training-centric) science.
 */
export function getSystemsScience(mode: RecoveryMode): SystemScience[] {
  return SYSTEMS.map((def) => {
    const entry = scienceEntry(def.system, mode);
    return {
      system: def.label,
      icon: def.icon,
      accent: def.accent,
      fact: entry.fact,
      cite: entry.cite,
      expanded: entry.expanded,
      stressors: entry.stressors,
    };
  });
}

/** Base (personal/football) cards — for consumers that don't vary by mode. */
export const SYSTEMS_SCIENCE: SystemScience[] = getSystemsScience("personal");
