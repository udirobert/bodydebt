"use client";

import { motion } from "framer-motion";
import { bandLabel, bandMeta } from "@/lib/debt-band";

export function DebtGauge({ score, animated = true }: { score: number; animated?: boolean }) {
  const { color } = bandMeta(score);
  const label = bandLabel(score);

  // SVG arc params — semicircle from left to right
  const cx = 100, cy = 100, r = 72;
  // Arc length for a semicircle = π * r
  const arcLength = Math.PI * r;
  // How much of the arc to fill (0 = none, 1 = full semicircle)
  const fillRatio = score / 100;
  const dashOffset = animated ? arcLength * (1 - fillRatio) : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="130" viewBox="0 0 200 140" className="overflow-visible">
        {/* Background arc — full semicircle */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(168,162,158,0.08)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Active arc — same path, revealed via stroke-dasharray */}
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={animated ? { strokeDashoffset: arcLength } : undefined}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ strokeDashoffset: dashOffset }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((t) => {
          const ta = Math.PI + (t / 100) * Math.PI;
          const tx1 = cx + (r - 4) * Math.cos(ta);
          const ty1 = cy + (r - 4) * Math.sin(ta);
          const tx2 = cx + (r + 2) * Math.cos(ta);
          const ty2 = cy + (r + 2) * Math.sin(ta);
          return (
            <line
              key={t}
              x1={tx1} y1={ty1} x2={tx2} y2={ty2}
              stroke={score >= t ? color : "rgba(168,162,158,0.12)"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {/* Score number */}
      <motion.div
        className="text-center -mt-4"
        initial={animated ? { opacity: 0, scale: 0.5 } : undefined}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
      >
        <span className="font-black leading-none" style={{ fontSize: "clamp(2.5rem, 8vw, 3.5rem)", color }}>
          {score}
        </span>
        <p className="text-[9px] uppercase tracking-[0.18em] font-semibold mt-1" style={{ color }}>
          {label}
        </p>
      </motion.div>
    </div>
  );
}
