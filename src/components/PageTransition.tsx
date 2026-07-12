"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { DURATION_PAGE, EASE_PROTOCOL } from "@/lib/motion/protocol";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DURATION_PAGE, ease: EASE_PROTOCOL }}
        style={{ minHeight: "100svh", backgroundColor: "var(--color-bg-base)" }}
        className="max-w-sm mx-auto w-full"
      >
        {/* Mobile-first container — centred on desktop, full-width on mobile */}
        <div className="mx-auto w-full" style={{ maxWidth: "430px" }}>
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
