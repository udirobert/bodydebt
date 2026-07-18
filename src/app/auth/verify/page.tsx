"use client";

import { motion } from "framer-motion";
import { MailCheck, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function VerifyRequestPage() {
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
        <MailCheck
          className="h-12 w-12 mx-auto mb-4"
          style={{ color: "rgba(234,88,12,0.9)" }}
        />
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Check your inbox
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          We sent a secure, one-time sign-in link. Click it to continue — it expires in 24 hours.
        </p>

        <div
          className="mt-6 p-4 rounded-xl text-left text-sm"
          style={{ backgroundColor: "rgba(255,247,237,0.5)", color: "var(--color-text-secondary)" }}
        >
          <p className="mb-2 font-medium" style={{ color: "var(--color-text-primary)" }}>
            Didn&apos;t see it?
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Check your spam or promotions folder.</li>
            <li>Make sure your email address is correct.</li>
            <li>Request a new link from the sign-in page.</li>
          </ul>
        </div>

        <Link
          href="/auth/signin"
          className="inline-flex items-center justify-center gap-2 mt-8 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "rgba(234,88,12,0.9)",
            color: "white",
          }}
        >
          <RefreshCcw className="h-4 w-4" />
          Back to sign-in
        </Link>
      </motion.div>
    </div>
  );
}
