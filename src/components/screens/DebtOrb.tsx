"use client";

import { motion } from "framer-motion";

interface DebtOrbProps {
  score: number; // 0-100
}

function getOrbColor(score: number): {
  primary: string;
  secondary: string;
  glow: string;
} {
  if (score >= 61)
    return { primary: "#DC2626", secondary: "#EA580C", glow: "rgba(220,38,38,0.25)" };
  if (score >= 41)
    return { primary: "#EA580C", secondary: "#F59E0B", glow: "rgba(234,88,12,0.22)" };
  return { primary: "#F59E0B", secondary: "#F59E0B", glow: "rgba(245,158,11,0.18)" };
}

// Turbulence — how chaotic the border-radius morphing is based on debt level
function getTurbulenceFrames(score: number): string[] {
  if (score >= 75) {
    return [
      "58% 42% 52% 48% / 48% 54% 46% 52%",
      "44% 56% 62% 38% / 56% 44% 58% 42%",
      "52% 48% 44% 56% / 42% 60% 40% 58%",
      "60% 40% 52% 48% / 54% 46% 56% 44%",
      "48% 52% 58% 42% / 50% 52% 44% 56%",
      "58% 42% 52% 48% / 48% 54% 46% 52%",
    ];
  }
  if (score >= 50) {
    return [
      "56% 44% 52% 48% / 50% 54% 46% 50%",
      "48% 52% 56% 44% / 54% 46% 52% 48%",
      "52% 48% 46% 54% / 48% 56% 50% 50%",
      "56% 44% 52% 48% / 50% 54% 46% 50%",
    ];
  }
  // Low debt — gentle, almost circular
  return [
    "52% 48% 52% 48% / 50% 50% 50% 50%",
    "50% 50% 50% 50% / 52% 48% 52% 48%",
    "52% 48% 52% 48% / 50% 50% 50% 50%",
  ];
}

export function DebtOrb({ score }: DebtOrbProps) {
  const colors = getOrbColor(score);
  const orbSize = 220 + Math.round((score / 100) * 32); // 220–252px
  const turbulenceFrames = getTurbulenceFrames(score);
  const turbulenceDuration = score >= 75 ? 5 : score >= 50 ? 7 : 10;

  // Pulse speed & depth tied to score — higher debt = faster, deeper pulses
  const pulseDuration = score >= 75 ? 2.5 : score >= 50 ? 3.5 : 5;
  const pulseDepth = score >= 75 ? 1.08 : score >= 50 ? 1.05 : 1.03;
  const glowIntensity = Math.min(0.18 + (score / 100) * 0.35, 0.53);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: orbSize, height: orbSize }}
    >
      {/* Ambient glow (outer) — intensity tracks score */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 ${50 + score}px ${15 + score * 0.3}px ${colors.glow}`,
          borderRadius: "50%",
        }}
        animate={{ opacity: [glowIntensity * 0.5, glowIntensity, glowIntensity * 0.5] }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Outer ring — breathes at score-dependent rate */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: `1px solid ${colors.primary}22` }}
        animate={{ scale: [1, 1 + (pulseDepth - 1) * 1.6, 1], opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Mid ring — offset phase, chaotic at high debt */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: "8%",
          border: `1px solid ${colors.primary}15`,
        }}
        animate={{
          scale: [1, 1 + (pulseDepth - 1) * 1.3, 1],
          opacity: [0.12, 0.45, 0.12],
          rotate: score >= 75 ? [0, 5, -5, 0] : [0, 2, -2, 0],
        }}
        transition={{
          scale: { duration: pulseDuration, repeat: Infinity, ease: "easeInOut", delay: pulseDuration * 0.25 },
          opacity: { duration: pulseDuration, repeat: Infinity, ease: "easeInOut", delay: pulseDuration * 0.25 },
          rotate: { duration: pulseDuration * 2, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* High-debt heartbeat spike layer */}
      {score >= 61 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${colors.primary}40`,
          }}
          animate={{
            scale: [1, 1.25, 1.45, 1],
            opacity: [0, 0.4, 0, 0],
          }}
          transition={{
            duration: pulseDuration * 1.2,
            repeat: Infinity,
            ease: "easeOut",
            times: [0, 0.15, 0.3, 1],
          }}
        />
      )}

      {/* Main orb body — morphs based on turbulence level */}
      <motion.div
        className="absolute"
        style={{
          width: "72%",
          height: "72%",
          background: `radial-gradient(circle at 35% 35%, ${colors.secondary}, ${colors.primary} 55%, #050505 100%)`,
          boxShadow: `0 0 ${30 + score * 0.5}px ${8 + score * 0.1}px ${colors.glow}`,
        }}
        animate={{
          borderRadius: turbulenceFrames,
          scale: [1, pulseDepth, 1],
        }}
        transition={{
          borderRadius: {
            duration: turbulenceDuration,
            repeat: Infinity,
            ease: "easeInOut",
          },
          scale: {
            duration: pulseDuration,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      />

      {/* Inner light shimmer */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "50%",
          height: "50%",
          background:
            "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.1), transparent 70%)",
          mixBlendMode: "screen",
        }}
        animate={{ opacity: [0.3, 0.8, 0.3], rotate: [0, 360] }}
        transition={{
          opacity: { duration: pulseDuration * 0.8, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: score >= 75 ? 8 : 14, repeat: Infinity, ease: "linear" },
        }}
      />

      {/* Telemetry labels */}
      <div
        className="absolute top-2 font-mono tracking-widest text-center w-full"
        style={{ fontSize: "6px", color: "rgba(168,162,158,0.25)" }}
      >
        AUTONOMIC PATHWAYS
      </div>
      <motion.div
        className="absolute bottom-2 font-mono tracking-widest text-center w-full"
        style={{ fontSize: "6px", color: "rgba(168,162,158,0.25)" }}
        animate={{ opacity: score >= 61 ? [0.3, 0.7, 0.3] : 0.25 }}
        transition={{ duration: pulseDuration * 0.7, repeat: Infinity, ease: "easeInOut" }}
      >
        {score >= 61 ? "STRESS LOAD CRITICAL" : score >= 41 ? "STRESS LOAD ELEVATED" : "STRESS LOAD NOMINAL"}
      </motion.div>
    </div>
  );
}
