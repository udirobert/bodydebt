import { describe, it, expect } from "vitest";
import { getEvidenceBasedIntervention } from "@/lib/care/evidence";

describe("getEvidenceBasedIntervention", () => {
  it("returns Semaglutide guidance by default", () => {
    const result = getEvidenceBasedIntervention("nausea", "moderate");
    expect(result).toBeDefined();
    expect(result!.action).toBe("Take with food; slow dose escalation; small meals");
    expect(result!.evidence.trialSource).toContain("STEP 1");
  });

  it("selects Tirzepatide-specific guidance when medication and dose match", () => {
    const result = getEvidenceBasedIntervention("nausea", "moderate", "Tirzepatide", "15mg weekly");
    expect(result).toBeDefined();
    expect(result!.action).toBe("Take with food; slow dose escalation; small meals");
    expect(result!.evidence.trialSource).toContain("SURMOUNT-1");
  });

  it("selects Liraglutide-specific guidance", () => {
    const result = getEvidenceBasedIntervention("nausea", "moderate", "Liraglutide", "3mg daily");
    expect(result).toBeDefined();
    expect(result!.evidence.trialSource).toContain("SCALE");
  });

  it("selects Oral Semaglutide guidance", () => {
    const result = getEvidenceBasedIntervention("nausea", "moderate", "Oral Semaglutide", "50mg daily");
    expect(result).toBeDefined();
    expect(result!.action).toContain("empty stomach");
  });

  it("falls back to a mild-moderate entry when mild is requested", () => {
    const result = getEvidenceBasedIntervention("nausea", "mild", "Semaglutide", "2.4mg weekly");
    expect(result).toBeDefined();
  });
});
