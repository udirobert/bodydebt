"use client";

import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";

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
          style={{ color: "rgba(168,85,247,0.8)" }}
        />
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Check your email
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          A sign-in link has been sent to your email address.
          Click the link to complete sign-in.
        </p>
        <p
          className="text-[10px] mt-6"
          style={{ color: "var(--color-text-faint)" }}
        >
          The link will expire in 24 hours.
        </p>
      </motion.div>
    </div>
  );
}
