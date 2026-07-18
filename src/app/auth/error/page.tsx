"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, MailWarning, ShieldAlert, RefreshCcw } from "lucide-react";
import Link from "next/link";

const errorMessages: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
  Verification: {
    title: "Sign-in link expired",
    body: "This link has already been used or is past its 24-hour limit. Request a fresh one to continue.",
    icon: <MailWarning className="h-12 w-12 mx-auto mb-4" style={{ color: "rgba(234,88,12,0.9)" }} />,
  },
  AccessDenied: {
    title: "Access denied",
    body: "That account isn't authorized for this app. Try another email or reach out to the team.",
    icon: <ShieldAlert className="h-12 w-12 mx-auto mb-4" style={{ color: "rgba(239,68,68,0.8)" }} />,
  },
  Configuration: {
    title: "Sign-in is misconfigured",
    body: "There's a problem with the authentication setup. Please contact support so we can fix it.",
    icon: <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: "rgba(239,68,68,0.8)" }} />,
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Default";
  const { title, body, icon } = errorMessages[error] ?? {
    title: "Something went wrong",
    body: "We couldn't sign you in. Please try again or contact support if the problem persists.",
    icon: <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: "rgba(239,68,68,0.8)" }} />,
  };

  return (
    <>
      {icon}
      <h1
        className="text-xl font-bold mb-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h1>
      <p
        className="text-sm mb-6"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {body}
      </p>
      <Link
        href="/auth/signin"
        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold"
        style={{
          backgroundColor: "rgba(234,88,12,0.9)",
          color: "white",
        }}
      >
        <RefreshCcw className="h-4 w-4" />
        Request a new link
      </Link>
    </>
  );
}

function ErrorFallback() {
  return (
    <>
      <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: "rgba(239,68,68,0.8)" }} />
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
        We couldn&apos;t sign you in. Please try again or contact support if the problem persists.
      </p>
      <Link
        href="/auth/signin"
        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold"
        style={{
          backgroundColor: "rgba(234,88,12,0.9)",
          color: "white",
        }}
      >
        <RefreshCcw className="h-4 w-4" />
        Request a new link
      </Link>
    </>
  );
}

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
        <Suspense fallback={<ErrorFallback />}>
          <ErrorContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
