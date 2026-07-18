"use client";

import { useEffect, useState } from "react";
import { useEazo } from "@/lib/sdk/eazo-react";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";

function updateInterventionStatus(id: string, status: "completed" | "skipped") {
  return fetch(`/api/care/interventions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

type Observation = {
  id: string;
  checkInAt: string;
  symptoms: string[];
  symptomSeverity: string;
  adherence: string;
  weightKg?: number | null;
  fastingGlucose?: number | null;
  notes?: string | null;
};

type Intervention = {
  id: string;
  action: string;
  status: string;
  dueAt: string;
};

type Escalation = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
};

type Summary = {
  observations: Observation[];
  pendingInterventions: Intervention[];
  openEscalations: Escalation[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function symptomLabel(s: string) {
  return s.replace(/_/g, " ");
}

export function CareSummaryPage() {
  const user = useEazo((s) => s.auth.user);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/care/patient/summary");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load summary");
        if (!cancelled) setSummary(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const id = setTimeout(load, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [user]);

  async function handleInterventionStatus(id: string, status: "completed" | "skipped") {
    setUpdating(id);
    try {
      const res = await updateInterventionStatus(id, status);
      if (!res.ok) throw new Error("Failed to update intervention");
      setSummary((prev) =>
        prev
          ? { ...prev, pendingInterventions: prev.pendingInterventions.filter((i) => i.id !== id) }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update intervention");
    } finally {
      setUpdating(null);
    }
  }

  if (!user) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto">
          <AuthLockedTeaser title="Your care summary" body="Sign in to view your check-ins and next steps." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            Your care summary
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Recent check-ins, open escalations, and what to do next.
          </p>
        </div>

        {loading && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Next step ({summary?.pendingInterventions.length ?? 0})
          </h2>
          {(summary?.pendingInterventions.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>No pending actions.</p>
          ) : (
            <div className="space-y-3">
              {summary?.pendingInterventions.map((i) => (
                <div
                  key={i.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
                >
                  <p className="text-sm">{i.action}</p>
                  <p className="text-[10px] mt-1 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    Due {formatDate(i.dueAt)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      disabled={updating === i.id}
                      onClick={() => handleInterventionStatus(i.id, "completed")}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border bg-transparent disabled:opacity-50"
                      style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      disabled={updating === i.id}
                      onClick={() => handleInterventionStatus(i.id, "skipped")}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border bg-transparent disabled:opacity-50"
                      style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Open escalations ({summary?.openEscalations.length ?? 0})
          </h2>
          {(summary?.openEscalations.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>No open escalations.</p>
          ) : (
            <div className="space-y-3">
              {summary?.openEscalations.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <p className="text-sm">{e.reason}</p>
                  <p className="text-[10px] mt-1 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    Opened {formatDate(e.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Recent check-ins
          </h2>
          {(summary?.observations.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>No check-ins yet.</p>
          ) : (
            <div className="space-y-3">
              {summary?.observations.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <p className="text-sm capitalize">
                    {o.symptoms.map(symptomLabel).join(", ")} · {o.symptomSeverity}
                  </p>
                  <p className="text-[10px] mt-1 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    {formatDate(o.checkInAt)} · {o.adherence.replace(/_/g, " ")}
                    {o.weightKg ? ` · ${o.weightKg}kg` : ""}
                    {o.fastingGlucose ? ` · ${o.fastingGlucose}mg/dL` : ""}
                  </p>
                  {o.notes && <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>{o.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
