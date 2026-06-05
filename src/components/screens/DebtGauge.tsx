"use client";

import { motion } from "framer-motion";

function scoreColor(score: number): string {
  if (score >= 61) return "#DC2626";
  if (score >= 41) return "#EA580C";
  if (score >= 21) return "#F59E0B";
  return "#4ADE80";
}

function scoreLabel(score: number): string {
  if (score >= 81) return "Damage control";
  if (score >= 61) return "Working overtime";
  if (score >= 41) return "Elevated burden";
  if (score >= 21) return "Mild debt";
  return "Body is clear";
}

export function DebtGauge({ score, animated = true }: { score: number; animated?: boolean }) {
  const color = scoreColor(score);
  const label = scoreLabel(score);
  // Map score (0-100) to angle (0-180 degrees)
  const angle = (score / 100) * 180;
  const radians = (angle * Math.PI) / 180;

  // SVG arc params
  const cx = 100, cy = 100, r = 72;
  const startAngle = Math.PI; // left (180°)
  const endAngle = Math.PI + radians; // sweep right by angle

  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = angle > 90 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="130" viewBox="0 0 200 140" className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(168,162,158,0.08)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Active arc */}
        <motion.path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color}44)` }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((t) => {
          const ta = Math.PI + ((t / 100) * 180 * Math.PI) / 180;
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
