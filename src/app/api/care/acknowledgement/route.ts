import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCarePatientByUserId, revokeCareAcknowledgements } from "@/lib/db/queries/care";

/** Patient-requested withdrawal of the pilot acknowledgement. */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const patient = await getCarePatientByUserId(auth.user.id);
  if (!patient?.clinicId) return NextResponse.json({ error: "Care access has not been set up by your clinic" }, { status: 403 });
  await revokeCareAcknowledgements(patient.id);
  return NextResponse.json({ ok: true });
}
