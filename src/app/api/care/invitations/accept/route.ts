import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  acceptCareInvitation,
  createCareAcknowledgement,
  getActiveCareAcknowledgement,
  getCareInvitationByTokenHash,
  getCarePatientById,
} from "@/lib/db/queries/care";
import { CARE_ACKNOWLEDGEMENT_VERSION, getInvitationState, hashInvitationToken, isInvitationRecipient } from "@/lib/care/invitations";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { token?: string };
  if (!body.token || typeof body.token !== "string") {
    return NextResponse.json({ error: "Invitation link is incomplete" }, { status: 400 });
  }
  const invitation = await getCareInvitationByTokenHash(hashInvitationToken(body.token));
  if (!invitation) return NextResponse.json({ error: "This invitation is no longer available", code: "invalid" }, { status: 410 });
  const state = getInvitationState(invitation);
  if (state !== "active") return NextResponse.json({ error: "This invitation is no longer available", code: state }, { status: 410 });

  const patient = await getCarePatientById(invitation.patientId);
  if (!patient || !isInvitationRecipient(invitation, patient, auth.user.id)) {
    return NextResponse.json({ error: "This invitation is not for this account", code: "not_recipient" }, { status: 403 });
  }
  const existing = await getActiveCareAcknowledgement(patient.id);
  if (existing) return NextResponse.json({ ok: true, acknowledgement: existing });

  await acceptCareInvitation(invitation.id);
  const acknowledgement = await createCareAcknowledgement({
    id: randomUUID(),
    clinicId: invitation.clinicId,
    patientId: patient.id,
    invitationId: invitation.id,
    policyVersion: CARE_ACKNOWLEDGEMENT_VERSION,
    acknowledgedAt: new Date(),
  });
  return NextResponse.json({ ok: true, acknowledgement });
}
