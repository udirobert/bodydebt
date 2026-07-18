"use client";

import Link from "next/link";
import { CareCheckInForm } from "./CareCheckInForm";

export function CarePage() {
  return (
    <main
      className="min-h-svh px-5 py-8"
      style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}
    >
      <div className="max-w-md mx-auto space-y-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            GLP-1 check-in
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Tell us how the first 12 weeks are going. If anything needs human review, your clinic will be notified.
          </p>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <CareCheckInForm />
        </div>

        <p className="text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <Link href="/care/summary" className="underline" style={{ color: "var(--color-brand-primary)" }}>
            View your care summary
          </Link>
        </p>
      </div>
    </main>
  );
}
