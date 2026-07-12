"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await signIn("email", { email, redirect: false, callbackUrl: "/" });
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "400px", height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Body Debt
        </Link>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Sign in
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Your recovery memory is tied to your account. Sign in to access
          your history across devices.
        </p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-6 text-center"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,85,247,0.2)",
            }}
          >
            <div className="text-3xl mb-3">📧</div>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Check your email
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              We sent a sign-in link to <strong>{email}</strong>.
              Click it to finish signing in.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleEmail} className="space-y-3">
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    border: "1px solid rgba(168,162,158,0.12)",
                    color: "var(--color-text-primary)",
                  }}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(234,88,12,0.9)",
                  color: "white",
                }}
              >
                {loading ? "Sending link…" : "Send magic link"}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-800" />
              <span className="text-[10px] uppercase tracking-widest text-stone-600">
                or
              </span>
              <div className="flex-1 h-px bg-stone-800" />
            </div>

            <button
              onClick={() => signIn("github", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                border: "1px solid rgba(168,162,158,0.12)",
                color: "var(--color-text-primary)",
              }}
            >
              <GitHubIcon className="h-4 w-4" />
              Continue with GitHub
            </button>
          </div>
        )}

        <p
          className="text-[10px] text-center mt-6"
          style={{ color: "var(--color-text-faint)" }}
        >
          No password needed. We use magic links.
        </p>
      </motion.div>
    </div>
  );
}
