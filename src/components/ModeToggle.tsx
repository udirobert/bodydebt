"use client";

import { motion } from "framer-motion";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getContextConfig } from "@/lib/contexts";
import type { RecoveryMode } from "@/lib/types";

const MODES: RecoveryMode[] = ["personal", "football"];

export function ModeToggle() {
  const { mode, setMode } = useBodyDebtStore();

  return (
    <div className="relative inline-flex p-1 rounded-full bg-slate-900/80 border border-slate-800">
      {MODES.map((m) => {
        const isActive = mode === m;
        const ctx = getContextConfig(m);
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`relative px-4 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest transition-colors ${
              isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 rounded-full bg-emerald-600"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{ctx.vocabulary.personaLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
