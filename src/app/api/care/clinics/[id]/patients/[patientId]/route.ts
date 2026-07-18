import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCareClinician,
  getCareEscalationsForPatient,
  getCareAuditLogsForPatient,
  getCareInterventionsForPatient,
  getCareObservationsForPatient,
  getCarePatientById,
} from "@/lib/db/queries/care";

export const maxDuration = 30;

/** Clinician-only longitudinal record for a patient in their own clinic. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; patientId: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: clinicId, patientId } = await params;
  const [clinician, patient] = await Promise.all([
    getCareClinician(auth.user.id, clinicId),
    getCarePatientById(patientId),
  ]);
  if (!clinician || !patient || patient.clinicId !== clinicId) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const [observations, interventions, escalations, auditLogs] = await Promise.all([
    getCareObservationsForPatient(patient.id, 30),
    getCareInterventionsForPatient(patient.id, 30),
    getCareEscalationsForPatient(patient.id, 30),
    getCareAuditLogsForPatient(patient.id, 50),
  ]);
  return NextResponse.json({ ok: true, patient, observations, interventions, escalations, auditLogs });
}
