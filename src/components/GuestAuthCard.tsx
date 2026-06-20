"use client";

import { motion } from "framer-motion";
import { auth } from "@/lib/sdk/eazo-client";

/**
 * GuestAuthCard — shown to guest users on the dashboard, prescription
 * screen, and share card. Encourages sign-in to keep history across
 * devices. The copy and styling are identical at all three sites, so
 * they're centralized here to prevent drift.
 */
export function GuestAuthCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mt-6 rounded-2xl p-4 text-center"
      style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.25)" }}
    >
      <p className="text-xs font-semibold mb-1" style={{ color: "#F5F5F4" }}>
        Your data is saved on this device
      </p>
      <p className="text-[10px] mb-3" style={{ color: "#A8A29E" }}>
        Sign in to keep your history across devices and unlock AI-powered insights.
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => auth.login().catch(() => undefined)}
        className="text-xs font-semibold px-5 py-2.5 rounded-xl"
        style={{ backgroundColor: "#EA580C", color: "#F5F5F4" }}
      >
        Sign in to save
      </motion.button>
    </motion.div>
  );
}
