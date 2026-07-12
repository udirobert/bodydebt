"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-sm"
      >
        <AlertCircle
          className="h-12 w-12 mx-auto mb-4"
          style={{ color: "rgba(239,68,68,0.8)" }}
        />
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Something went wrong
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-text-secondary)" }}
        >
          The sign-in link may have expired or already been used.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold"
          style={{
            backgroundColor: "rgba(234,88,12,0.9)",
            color: "white",
          }}
        >
          Try again
        </Link>
      </motion.div>
    </div>
  );
}
