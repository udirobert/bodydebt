import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCarePatientByUserId,
  getCareObservationsForPatient,
  getPendingInterventionsForPatient,
  getOpenEscalationsForPatient,
} from "@/lib/db/queries/care";
import { carePatients } from "@/lib/db/schema/care";
import { db } from "@/lib/db/client";
import { randomUUID } from "node:crypto";

export const maxDuration = 30;

/**
 * GET /api/care/patient/summary
 *
 * Patient-facing summary of recent check-ins, open escalations, and
 * pending interventions for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  let patient = await getCarePatientByUserId(auth.user.id);
  if (!patient) {
    const [created] = await db
      .insert(carePatients)
      .values({
        id: randomUUID(),
        userId: auth.user.id,
        enrolledAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    patient = created;
  }

  const [observations, pendingInterventions, openEscalations] = await Promise.all([
    getCareObservationsForPatient(patient.id, 10),
    getPendingInterventionsForPatient(patient.id),
    getOpenEscalationsForPatient(patient.id),
  ]);

  return NextResponse.json({
    ok: true,
    patient,
    observations,
    pendingInterventions,
    openEscalations,
  });
}
