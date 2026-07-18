import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { careEscalations, carePatients, careInterventions } from "@/lib/db/schema/care";
import { db } from "@/lib/db/client";
import { eq, and, desc } from "drizzle-orm";

export const maxDuration = 30;

/**
 * GET /api/care/summary
 *
 * Clinician-facing summary of open escalations and pending interventions.
 * In the first wedge this is scoped to a single clinic; query param
 * `clinicId` is required.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get("clinicId");
  if (!clinicId) {
    return NextResponse.json({ error: "clinicId is required" }, { status: 400 });
  }

  const openEscalations = await db
    .select({
      id: careEscalations.id,
      patientId: careEscalations.patientId,
      observationId: careEscalations.observationId,
      reason: careEscalations.reason,
      status: careEscalations.status,
      createdAt: careEscalations.createdAt,
      medication: carePatients.medication,
    })
    .from(careEscalations)
    .innerJoin(carePatients, eq(carePatients.id, careEscalations.patientId))
    .where(and(eq(carePatients.clinicId, clinicId), eq(careEscalations.status, "open")))
    .orderBy(desc(careEscalations.createdAt));

  const pendingInterventions = await db
    .select({
      id: careInterventions.id,
      patientId: careInterventions.patientId,
      observationId: careInterventions.observationId,
      action: careInterventions.action,
      status: careInterventions.status,
      dueAt: careInterventions.dueAt,
    })
    .from(careInterventions)
    .innerJoin(carePatients, eq(carePatients.id, careInterventions.patientId))
    .where(and(eq(carePatients.clinicId, clinicId), eq(careInterventions.status, "pending")))
    .orderBy(desc(careInterventions.dueAt));

  return NextResponse.json({ ok: true, openEscalations, pendingInterventions });
}
