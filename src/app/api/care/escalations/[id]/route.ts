import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAuth } from "@/lib/auth";
import {
  getCareEscalationWithPatientById,
  updateCareEscalationStatus,
  getCareClinician,
  createCareAuditLog,
} from "@/lib/db/queries/care";

export const maxDuration = 30;

/**
 * PATCH /api/care/escalations/[id]
 *
 * Clinicians can resolve or mark an escalation as reviewed.
 * The caller must be a registered clinician for the clinic and the
 * escalation's patient must belong to the same clinic.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = (await request.json()) as { status?: string; clinicId?: string; reason?: string };
  if (body.status !== "resolved" && body.status !== "clinic_reviewed") {
    return NextResponse.json({ error: "status must be resolved or clinic_reviewed" }, { status: 400 });
  }
  if (!body.clinicId) {
    return NextResponse.json({ error: "clinicId is required" }, { status: 400 });
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "a review note is required" }, { status: 400 });
  }
  if (body.reason.trim().length > 1000) {
    return NextResponse.json({ error: "review note must be 1000 characters or fewer" }, { status: 400 });
  }

  const [escalation, clinician] = await Promise.all([
    getCareEscalationWithPatientById(id),
    getCareClinician(auth.user.id, body.clinicId),
  ]);
  if (!escalation) {
    return NextResponse.json({ error: "escalation not found" }, { status: 404 });
  }
  if (!clinician || escalation.patient.clinicId !== body.clinicId) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const updated = await updateCareEscalationStatus(id, body.status);
  await createCareAuditLog({
    id: randomUUID(), clinicId: body.clinicId, actorUserId: auth.user.id,
    patientId: escalation.patientId, targetType: "escalation", targetId: id,
    actionType: body.status, reason: body.reason.trim(), createdAt: new Date(),
  });
  return NextResponse.json({ ok: true, escalation: updated });
}
