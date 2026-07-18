"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEazo } from "@/lib/sdk/eazo-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";

type Escalation = {
  id: string;
  patientId: string;
  observationId?: string;
  reason: string;
  status: string;
  createdAt: string;
  patient?: { medication?: string | null };
};

type Intervention = {
  id: string;
  patientId: string;
  observationId?: string;
  action: string;
  status: string;
  dueAt: string;
  patient?: { medication?: string | null };
};

function formatRelative(date: string) {
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ClinicSelector({ onSelect }: { onSelect: (clinicId: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSelect(value.trim());
      }}
      className="max-w-md mx-auto space-y-4"
    >
      <label className="block text-xs font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
        Clinic ID
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. demo-clinic"
        className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
        style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
      />
      <PrimaryButton type="submit">Open dashboard</PrimaryButton>
    </form>
  );
}

export function ClinicianPage() {
  const user = useEazo((s) => s.auth.user);
  const params = useSearchParams();
  const router = useRouter();
  const clinicId = params.get("clinicId");

  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId || !user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/care/summary?clinicId=${encodeURIComponent(clinicId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load summary");
        if (!cancelled) {
          setEscalations(json.openEscalations ?? []);
          setInterventions(json.pendingInterventions ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const id = setTimeout(load, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [clinicId, user]);

  if (!user) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto">
          <AuthLockedTeaser
            title="Clinic dashboard"
            body="Sign in to view patient escalations and pending interventions."
          />
        </div>
      </main>
    );
  }

  if (!clinicId) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
              Care Companion
            </p>
            <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
              Clinic dashboard
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Enter a clinic ID to see open escalations and pending interventions.
            </p>
          </div>
          <ClinicSelector onSelect={(id) => router.replace(`/care/clinician?clinicId=${encodeURIComponent(id)}`)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            Clinic dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Clinic: <span className="font-mono">{clinicId}</span>
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
            Needs review ({escalations.length})
          </h2>
          {escalations.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>No open escalations.</p>
          ) : (
            <div className="space-y-3">
              {escalations.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                  }}
                >
                  <p className="text-sm font-semibold">{e.reason}</p>
                  <p className="text-[10px] mt-1 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    Patient {e.patientId} {e.patient?.medication ? `· ${e.patient.medication}` : ""} · {formatRelative(e.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Pending actions ({interventions.length})
          </h2>
          {interventions.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>No pending interventions.</p>
          ) : (
            <div className="space-y-3">
              {interventions.map((i) => (
                <div
                  key={i.id}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <p className="text-sm">{i.action}</p>
                  <p className="text-[10px] mt-1 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    Patient {i.patientId} {i.patient?.medication ? `· ${i.patient.medication}` : ""} · due {formatRelative(i.dueAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
