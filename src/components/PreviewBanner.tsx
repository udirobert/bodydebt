"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";

/**
 * Shown while viewing the example session at /preview.
 * Makes it obvious this is not the user's data and offers a one-tap exit.
 */
export function PreviewBanner() {
  const router = useRouter();
  const previewMode = useBodyDebtStore((s) => s.previewMode);
  const exitPreview = useBodyDebtStore((s) => s.exitPreview);

  if (!previewMode) return null;

  const handleStartOwn = () => {
    exitPreview();
    router.push("/wake-time");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE_PROTOCOL }}
      className="sticky top-0 z-[60] px-4 py-2.5 flex items-center justify-between gap-3"
      style={{
        backgroundColor: "rgba(168,85,247,0.12)",
        borderBottom: "1px solid rgba(168,85,247,0.2)",
        backdropFilter: "blur(10px)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#a855f7" }}>
          Example session
        </p>
        <p className="text-[11px] truncate" style={{ color: "var(--color-text-secondary)" }}>
          Day 2 with memory — not your body
        </p>
      </div>
      <button
        type="button"
        onClick={handleStartOwn}
        className="flex-shrink-0 text-[10px] font-semibold px-3 py-2 rounded-xl"
        style={{
          backgroundColor: "var(--color-brand-primary)",
          color: "var(--color-text-primary)",
          minHeight: 36,
        }}
      >
        Start my check-in
      </button>
    </motion.div>
  );
}
