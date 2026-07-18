"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";
import {
  AMNESIA_PRESCRIPTION,
  MEMORY_PRESCRIPTION,
  MEMORY_DEMO_FACTS,
} from "@/lib/memory-demo-data";
import {
  attributePrescriptionLines,
  collectMemoryFacts,
} from "@/lib/supermemory/prescription-attribution";
import { PrimaryButton } from "@/components/PrimaryButton";

const STRESSOR_LABEL = "Poor sleep (4h) · Alcohol (3 beers) · Work stress";

const BLOCKS = [
  { key: "rightNow" as const, label: "Right now", icon: "💧" },
  { key: "thisMorning" as const, label: "This morning", icon: "☕" },
  { key: "today" as const, label: "Today", icon: "🎯" },
  { key: "avoid" as const, label: "Avoid", icon: "🚫" },
];

/**
 * Product education — shows how persistent memory changes the coach's advice.
 * Linked from the opening screen for curious first-time users.
 */
export function CoachMemoryScreen() {
  const router = useRouter();
  const attribution = attributePrescriptionLines(
    MEMORY_PRESCRIPTION,
    collectMemoryFacts("", MEMORY_DEMO_FACTS),
  );

  return (
    <div
      className="min-h-svh flex flex-col px-5 pb-10"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div className="flex items-center justify-between mt-10 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[11px] font-medium"
          style={{ color: "var(--color-text-secondary)", minHeight: 44 }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: EASE_PROTOCOL }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-2"
          style={{ color: "#a855f7" }}
        >
          How your coach learns
        </p>
        <h1
          className="text-xl font-normal mb-3"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-primary)" }}
        >
          Same stressors. Different advice.
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Most apps reset every session. Body Debt remembers what worked — sleep patterns,
          prescriptions that helped, what to avoid — and shapes tomorrow&apos;s plan around it.
        </p>
        <p
          className="text-[10px] font-mono mb-8 px-3 py-2 rounded-xl"
          style={{
            color: "var(--color-text-faint)",
            backgroundColor: "rgba(168,162,158,0.06)",
            border: "1px solid rgba(168,162,158,0.08)",
          }}
        >
          Example inputs · {STRESSOR_LABEL}
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Day 1 — no memory */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, ease: EASE_PROTOCOL }}
          className="rounded-2xl p-4"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid rgba(168,162,158,0.1)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
              Day 1
            </span>
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(168,162,158,0.08)", color: "var(--color-text-faint)" }}>
              No history
            </span>
          </div>
          <div className="space-y-3">
            {BLOCKS.map(({ key, label, icon }) => (
              <div key={key}>
                <p className="text-[8px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--color-text-faint)" }}>
                  {icon} {label}
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {AMNESIA_PRESCRIPTION[key]}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Day 2 — with memory */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, ease: EASE_PROTOCOL }}
          className="rounded-2xl p-4"
          style={{
            backgroundColor: "rgba(168,85,247,0.04)",
            border: "1px solid rgba(168,85,247,0.18)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#a855f7" }}>
              Day 2
            </span>
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(168,85,247,0.12)", color: "#a855f7" }}>
              Coach remembers
            </span>
          </div>
          <div className="space-y-3">
            {BLOCKS.map(({ key, label, icon }) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    {icon} {label}
                  </p>
                  {attribution[key] === "memory" && (
                    <span className="text-[7px] font-mono uppercase tracking-wider px-1 py-0.5 rounded" style={{ backgroundColor: "rgba(168,85,247,0.15)", color: "#a855f7" }}>
                      from memory
                    </span>
                  )}
                </div>
                <p className="text-[12px] leading-relaxed font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {MEMORY_PRESCRIPTION[key]}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* What the coach recalled */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28, ease: EASE_PROTOCOL }}
        className="mt-6 rounded-2xl p-4"
        style={{ border: "1px solid rgba(168,85,247,0.12)", backgroundColor: "rgba(168,85,247,0.03)" }}
      >
        <p className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: "#a855f7" }}>
          What your coach recalled
        </p>
        <div className="space-y-2">
          {MEMORY_DEMO_FACTS.map((fact, i) => (
            <p key={i} className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              <span style={{ color: "#a855f7" }}>·</span> {fact}
            </p>
          ))}
        </div>
        <p className="text-[8px] font-mono mt-4" style={{ color: "var(--color-text-faint)" }}>
          Powered by Supermemory · stored locally · you control what the coach remembers
        </p>
      </motion.div>

      <div className="mt-8 flex flex-col gap-3">
        <PrimaryButton size="md" onClick={() => router.push("/wake-time")}>
          Start your first check-in
        </PrimaryButton>
        <Link
          href="/preview"
          className="text-center text-[11px] font-mono"
          style={{ color: "var(--color-text-faint)" }}
        >
          Explore a full example with memory →
        </Link>
      </div>
    </div>
  );
}
