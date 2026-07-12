"use client";

import { MotionConfig } from "framer-motion";

/**
 * App-wide Framer Motion config. `reducedMotion="user"` skips transform
 * animations when the OS prefers reduced motion (opacity can still fade).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
