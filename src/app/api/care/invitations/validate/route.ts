import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCareClinicById, getCareInvitationByTokenHash, getCarePatientById } from "@/lib/db/queries/care";
import { getInvitationState, hashInvitationToken, isInvitationRecipient } from "@/lib/care/invitations";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Invitation link is incomplete" }, { status: 400 });

  const invitation = await getCareInvitationByTokenHash(hashInvitationToken(token));
  if (!invitation) return NextResponse.json({ error: "This invitation is no longer available", code: "invalid" }, { status: 410 });
  const state = getInvitationState(invitation);
  if (state !== "active") return NextResponse.json({ error: "This invitation is no longer available", code: state }, { status: 410 });

  const patient = await getCarePatientById(invitation.patientId);
  if (!isInvitationRecipient(invitation, patient, auth.user.id)) {
    return NextResponse.json({ error: "This invitation is not for this account", code: "not_recipient" }, { status: 403 });
  }
  const clinic = await getCareClinicById(invitation.clinicId);
  if (!clinic) return NextResponse.json({ error: "Clinic is no longer available" }, { status: 410 });

  return NextResponse.json({ ok: true, clinic: { id: clinic.id, name: clinic.name }, expiresAt: invitation.expiresAt });
}
