import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCareEscalationWithPatientById, updateCareEscalationStatus } from "@/lib/db/queries/care";

export const maxDuration = 30;

/**
 * PATCH /api/care/escalations/[id]
 *
 * Clinicians can resolve or mark an escalation as reviewed.
 * In the first wedge this is gated by a clinicId in the body; proper
 * clinician RBAC will replace this once care_clinicians is introduced.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = (await request.json()) as { status?: string; clinicId?: string };
  if (body.status !== "resolved" && body.status !== "clinic_reviewed") {
    return NextResponse.json({ error: "status must be resolved or clinic_reviewed" }, { status: 400 });
  }
  if (!body.clinicId) {
    return NextResponse.json({ error: "clinicId is required" }, { status: 400 });
  }

  const escalation = await getCareEscalationWithPatientById(id);
  if (!escalation) {
    return NextResponse.json({ error: "escalation not found" }, { status: 404 });
  }
  if (escalation.patient.clinicId !== body.clinicId) {
    return NextResponse.json({ error: "escalation does not belong to this clinic" }, { status: 403 });
  }

  const updated = await updateCareEscalationStatus(id, body.status);
  return NextResponse.json({ ok: true, escalation: updated });
}
