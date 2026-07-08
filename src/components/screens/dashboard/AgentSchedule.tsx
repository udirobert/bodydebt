"use client";

import { motion } from "framer-motion";
import { SYSTEM_META } from "@/lib/science";

// Icons single-sourced from the canonical science module (@/lib/science).
// Schedule blocks reference systems by lowercase key or capitalized name, so
// we key on both.
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SYSTEM_EMOJIS: Record<string, string> = Object.fromEntries(
  Object.entries(SYSTEM_META).flatMap(([s, m]) => [
    [s, m.icon],
    [cap(s), m.icon],
  ]),
);

interface ScheduleBlock {
  time: string;
  action: string;
  system: string;
}

interface AgentScheduleProps {
  schedule: ScheduleBlock[];
}

export function AgentSchedule({ schedule }: AgentScheduleProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(168,162,158,0.08)",
      }}
    >
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--color-states-warning)" }}>
          Recovery Schedule
        </span>
        <span className="text-[8px] font-mono" style={{ color: "var(--color-text-faint)" }}>
          Schedule Agent · QVAC
        </span>
      </div>
      <div className="px-4 pb-3">
        {schedule.map((block, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 py-2.5"
            style={{
              borderBottom:
                i < schedule.length - 1 ? "1px solid rgba(168,162,158,0.06)" : "none",
            }}
          >
            <span
              className="text-xs font-mono flex-shrink-0 mt-0.5"
              style={{ color: "var(--color-brand-primary)", minWidth: 70 }}
            >
              {block.time}
            </span>
            <span
              className="text-sm flex-1"
              style={{ color: "var(--color-text-primary)", lineHeight: 1.4 }}
            >
              {block.action}
            </span>
            <span className="text-sm flex-shrink-0">
              {SYSTEM_EMOJIS[block.system] ?? "•"}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
