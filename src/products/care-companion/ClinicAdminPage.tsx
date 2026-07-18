"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEazo } from "@/lib/sdk/eazo-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";

const MEDICATIONS = ["Semaglutide", "Tirzepatide", "Liraglutide", "Oral Semaglutide", "Orforglipron"] as const;
const DOSE_OPTIONS: Record<string, string[]> = {
  Semaglutide: ["2.4mg weekly"],
  Tirzepatide: ["15mg weekly"],
  Liraglutide: ["3mg daily"],
  "Oral Semaglutide": ["50mg daily"],
  Orforglipron: ["45mg daily"],
};

type Patient = {
  id: string;
  userId: string;
  clinicId: string | null;
  medication: string | null;
  currentDose: string | null;
  enrolledAt: string;
};

type Clinic = {
  id: string;
  name: string;
  createdAt: string;
  patients: Patient[];
};

export function ClinicAdminPage() {
  const user = useEazo((s) => s.auth.user);
  const router = useRouter();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newClinicName, setNewClinicName] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [email, setEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const [medication, setMedication] = useState("Semaglutide");
  const [currentDose, setCurrentDose] = useState("2.4mg weekly");
  const [enrolling, setEnrolling] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadClinics();
  }, [user]);

  async function loadClinics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/care/clinics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load clinics");
      setClinics(json.clinics ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clinics");
    } finally {
      setLoading(false);
    }
  }

  async function createClinic(e: React.FormEvent) {
    e.preventDefault();
    if (!newClinicName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/care/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClinicName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create clinic");
      setNewClinicName("");
      await loadClinics();
      setSelectedClinicId(json.clinic.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create clinic");
    } finally {
      setCreating(false);
    }
  }

  async function enrollPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClinicId || !email.trim()) return;
    setEnrolling(true);
    setError(null);
    try {
      const res = await fetch(`/api/care/clinics/${encodeURIComponent(selectedClinicId)}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: patientName.trim() || undefined,
          medication,
          currentDose,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to enroll patient");
      setEmail("");
      setPatientName("");
      await loadClinics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll patient");
    } finally {
      setEnrolling(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto">
          <AuthLockedTeaser
            title="Clinic admin"
            body="Sign in to create clinics and enroll patients."
          />
        </div>
      </main>
    );
  }

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            Clinic admin
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Create a clinic and enroll patients so their check-ins appear on your dashboard.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <form onSubmit={createClinic} className="space-y-4">
          <h2 className="text-sm font-semibold">Create clinic</h2>
          <input
            type="text"
            value={newClinicName}
            onChange={(e) => setNewClinicName(e.target.value)}
            placeholder="Clinic name"
            className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          />
          <PrimaryButton type="submit" disabled={creating || !newClinicName.trim()}>
            {creating ? "Creating…" : "Create clinic"}
          </PrimaryButton>
        </form>

        {clinics.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Enroll patient</h2>
            <form onSubmit={enrollPatient} className="space-y-4">
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
              >
                <option value="">Select a clinic</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.patients.length} patients)
                  </option>
                ))}
              </select>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Patient email"
                className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
              />

              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient name (optional)"
                className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={medication}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMedication(next);
                    setCurrentDose(DOSE_OPTIONS[next]?.[0] ?? "");
                  }}
                  className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                >
                  {MEDICATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={currentDose}
                  onChange={(e) => setCurrentDose(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                >
                  {(DOSE_OPTIONS[medication] ?? []).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <PrimaryButton type="submit" disabled={enrolling || !selectedClinicId || !email.trim()}>
                {enrolling ? "Enrolling…" : "Enroll patient"}
              </PrimaryButton>
            </form>
          </div>
        )}

        {selectedClinic && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{selectedClinic.name}</h2>
              <button
                type="button"
                onClick={() => router.push(`/care/clinician?clinicId=${encodeURIComponent(selectedClinic.id)}`)}
                className="text-xs underline"
                style={{ color: "var(--color-brand-primary)" }}
              >
                Open dashboard
              </button>
            </div>

            {selectedClinic.patients.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                No patients enrolled yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedClinic.patients.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-2xl p-4 text-sm"
                    style={{
                      backgroundColor: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <p className="font-mono text-xs" style={{ color: "var(--color-text-faint)" }}>
                      {p.id}
                    </p>
                    <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      {p.medication} {p.currentDose ? `· ${p.currentDose}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {loading && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
      </div>
    </main>
  );
}
