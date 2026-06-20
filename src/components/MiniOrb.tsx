"use client";

import { motion } from "framer-motion";
import { bandMeta } from "@/lib/debt-band";

interface MiniOrbProps {
  score: number; // 0–100, or 0 for "forming"
  size?: number;
  forming?: boolean; // true = materialising animation (during AI calc)
}

export function MiniOrb({ score, size = 36, forming = false }: MiniOrbProps) {
  // Collapse clear + mild into amber for nav-sized orbs — the brand
  // language uses amber/orange/red only; green is reserved for "cleared".
  const c = score >= 41 ? bandMeta(score) : bandMeta(Math.max(score, 21));

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring — breathes */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 ${size * 0.7}px ${size * 0.2}px ${c.glow}` }}
        animate={{ opacity: forming ? [0, 0.8, 0.3, 0.8] : [0.4, 0.7, 0.4] }}
        transition={{
          duration: forming ? 1.5 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Orb body */}
      <motion.div
        className="rounded-full"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          background: `radial-gradient(circle at 35% 35%, ${c.colorSecondary}, ${c.color} 60%, #050505 100%)`,
        }}
        animate={
          forming
            ? { scale: [0.3, 1.1, 0.9, 1], opacity: [0, 1, 0.7, 1] }
            : { scale: [1, 1.04, 1] }
        }
        transition={
          forming
            ? { duration: 1.2, ease: "easeOut" }
            : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* Shimmer */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 0.44,
          height: size * 0.44,
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 70%)",
        }}
        animate={{ opacity: forming ? [0, 0.6, 0.4] : [0.4, 0.7, 0.4] }}
        transition={{ duration: forming ? 1.5 : 4, repeat: Infinity }}
      />
    </div>
  );
}
