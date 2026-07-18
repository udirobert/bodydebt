import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOpenEscalationsForClinic, getPendingInterventionsForClinic } from "@/lib/db/queries/care";

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

  const [openEscalations, pendingInterventions] = await Promise.all([
    getOpenEscalationsForClinic(clinicId),
    getPendingInterventionsForClinic(clinicId),
  ]);

  return NextResponse.json({ ok: true, openEscalations, pendingInterventions });
}
