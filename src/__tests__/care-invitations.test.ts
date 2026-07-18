import { describe, expect, it } from "vitest";
import { getInvitationState, hasActiveAcknowledgement, hashInvitationToken, invitationExpiry, INVITATION_TTL_MS, isInvitationRecipient } from "@/lib/care/invitations";

describe("care invitations", () => {
  const now = new Date("2026-07-18T10:00:00.000Z");
  const active = { expiresAt: new Date("2026-07-19T10:00:00.000Z"), acceptedAt: null, revokedAt: null };

  it("hashes raw invitation secrets deterministically without retaining the token", () => {
    expect(hashInvitationToken("a-secure-token")).toHaveLength(64);
    expect(hashInvitationToken("a-secure-token")).toBe(hashInvitationToken("a-secure-token"));
    expect(hashInvitationToken("a-secure-token")).not.toBe(hashInvitationToken("another-token"));
  });

  it("marks missing, expired, accepted, and revoked links unavailable", () => {
    expect(getInvitationState(undefined, now)).toBe("invalid");
    expect(getInvitationState({ ...active, expiresAt: now }, now)).toBe("expired");
    expect(getInvitationState({ ...active, acceptedAt: now }, now)).toBe("accepted");
    expect(getInvitationState({ ...active, revokedAt: now }, now)).toBe("revoked");
    expect(getInvitationState(active, now)).toBe("active");
  });

  it("gives invitations a seven-day lifetime", () => {
    expect(invitationExpiry(now).getTime() - now.getTime()).toBe(INVITATION_TTL_MS);
  });

  it("does not allow a link to cross clinic or account boundaries", () => {
    const invitation = { patientId: "patient-a", clinicId: "clinic-a" };
    expect(isInvitationRecipient(invitation, { id: "patient-a", userId: "user-a", clinicId: "clinic-a" }, "user-a")).toBe(true);
    expect(isInvitationRecipient(invitation, { id: "patient-a", userId: "user-b", clinicId: "clinic-a" }, "user-a")).toBe(false);
    expect(isInvitationRecipient(invitation, { id: "patient-a", userId: "user-a", clinicId: "clinic-b" }, "user-a")).toBe(false);
  });

  it("blocks care access after acknowledgement is withdrawn", () => {
    expect(hasActiveAcknowledgement({ revokedAt: null })).toBe(true);
    expect(hasActiveAcknowledgement({ revokedAt: now })).toBe(false);
    expect(hasActiveAcknowledgement(undefined)).toBe(false);
  });
});
