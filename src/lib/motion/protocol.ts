"use client";

/**
 * Shared framer-motion variants for the diagnosis / protocol reveal grammar.
 *
 * Used by DiagnosisHero, ProtocolStep, and any other staggered reveal.
 * Honors `prefers-reduced-motion` — when reduced motion is requested, the
 * container and items resolve to fully visible, instant states with no
 * opacity transitions or transforms.
 */

import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

/** Out-expo-ish — feels deliberate, not bouncy. */
export const EASE_PROTOCOL = [0.22, 1, 0.36, 1] as const;

/** Drawer / sheet curve — snaps on open, settles cleanly. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

/** Shared durations (seconds for Framer; mirror as CSS vars in globals). */
export const DURATION_PAGE = 0.22;
export const DURATION_COLLAPSE = 0.22;
export const DURATION_DRAWER_OPEN = 0.25;
export const DURATION_DRAWER_CLOSE = 0.15;

const containerBase: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemBase: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_PROTOCOL },
  },
};

const containerReduced: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

const itemReduced: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

/**
 * Hook returning the container + item variants for staggered reveals.
 * Use with `motion.div` `variants={container}` and child `motion.*`
 * `variants={item}`.
 */
export function useProtocolReveal(): {
  container: Variants;
  item: Variants;
} {
  const reduced = useReducedMotion();
  if (reduced) {
    return { container: containerReduced, item: itemReduced };
  }
  return { container: containerBase, item: itemBase };
}

/** Standalone fade-up — useful for a single element reveal. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_PROTOCOL } },
};

/** Standalone fade — for text-only reveals. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3, ease: EASE_PROTOCOL } },
};

/** Pulse accent for the orb / score count-up. */
export const pulseAccent: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE_PROTOCOL } },
};
