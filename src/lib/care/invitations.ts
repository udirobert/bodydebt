import { createHash, randomBytes } from "node:crypto";

export const CARE_ACKNOWLEDGEMENT_VERSION = "pilot-v1";
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiry(from = new Date()): Date {
  return new Date(from.getTime() + INVITATION_TTL_MS);
}

export type InvitationState = "active" | "expired" | "accepted" | "revoked" | "invalid";

export function getInvitationState(
  invitation: { expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null } | undefined,
  now = new Date(),
): InvitationState {
  if (!invitation) return "invalid";
  if (invitation.revokedAt) return "revoked";
  if (invitation.acceptedAt) return "accepted";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

export function isInvitationRecipient(
  invitation: { clinicId: string; patientId: string },
  patient: { id: string; userId: string; clinicId: string | null } | undefined,
  userId: string,
): boolean {
  return Boolean(patient && patient.id === invitation.patientId && patient.userId === userId && patient.clinicId === invitation.clinicId);
}

export function hasActiveAcknowledgement(acknowledgement: { revokedAt: Date | null } | undefined): boolean {
  return Boolean(acknowledgement && !acknowledgement.revokedAt);
}
