import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processCheckIn } from "@/application/care/check-in";
import type {
  CareObservationInput,
  CareObservation,
  CareIntervention,
  CareEscalation,
} from "@/domain/care/types";

function makeInput(overrides: Partial<CareObservationInput> = {}): CareObservationInput {
  return {
    patientId: "patient-1",
    symptoms: ["nausea"],
    symptomSeverity: "mild",
    adherence: "taken_as_prescribed",
    weightKg: null,
    fastingGlucose: null,
    notes: null,
    ...overrides,
  };
}

function makeDeps() {
  const observations: CareObservation[] = [];
  const interventions: CareIntervention[] = [];
  const escalations: CareEscalation[] = [];

  return {
    observations,
    interventions,
    escalations,
    getPreviousObservations: vi.fn(async () => observations.map((o) => ({
      symptoms: o.symptoms,
      symptomSeverity: o.symptomSeverity,
      checkInAt: o.checkInAt,
    }))),
    saveObservation: vi.fn(async (obs: CareObservation) => {
      observations.push(obs);
      return obs;
    }),
    saveIntervention: vi.fn(async (intervention: CareIntervention) => {
      interventions.push(intervention);
      return intervention;
    }),
    saveEscalation: vi.fn(async (escalation: CareEscalation) => {
      escalations.push(escalation);
      return escalation;
    }),
  };
}

describe("processCheckIn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T06:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an on-track intervention when symptoms are mild and adherence is good", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["nausea"], symptomSeverity: "mild" }), deps);

    expect(result.action.type).toBe("intervention");
    expect(result.action.action).toBe("Continue your care plan and log tomorrow to track the trend.");
    expect(result.intervention).toBeDefined();
    expect(result.escalation).toBeUndefined();
    expect(deps.saveObservation).toHaveBeenCalledTimes(1);
    expect(deps.saveIntervention).toHaveBeenCalledTimes(1);
    expect(deps.saveEscalation).not.toHaveBeenCalled();
  });

  it("escalates when a severe safety signal is reported", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["vomiting"], symptomSeverity: "moderate" }), deps);

    expect(result.action.type).toBe("escalate");
    expect(result.action.reason).toBe("Severe safety signal reported: vomiting.");
    expect(result.escalation).toBeDefined();
    expect(result.intervention).toBeUndefined();
    expect(deps.saveEscalation).toHaveBeenCalledTimes(1);
  });

  it("escalates when adherence is stopped or multiple doses are missed", async () => {
    const deps = makeDeps();
    const stopped = await processCheckIn(makeInput({ adherence: "stopped" }), deps);
    expect(stopped.action.type).toBe("escalate");
    expect(stopped.action.reason).toBe("Multiple missed doses or treatment stopped — clinic follow-up required.");

    const missed = await processCheckIn(makeInput({ adherence: "missed_multiple" }), deps);
    expect(missed.action.type).toBe("escalate");
  });

  it("escalates when a moderate+ symptom persists for more than 7 days", async () => {
    const deps = makeDeps();
    const eightDaysAgo = new Date("2026-05-26T06:00:00.000Z");
    deps.observations.push({
      id: "obs-1",
      patientId: "patient-1",
      checkInAt: eightDaysAgo,
      symptoms: ["nausea"],
      symptomSeverity: "moderate",
      adherence: "taken_as_prescribed",
      weightKg: null,
      fastingGlucose: null,
      notes: null,
    } as CareObservation);

    const result = await processCheckIn(makeInput({ symptoms: ["nausea"], symptomSeverity: "moderate" }), deps);

    expect(result.action.type).toBe("escalate");
    expect(result.action.reason).toBe("nausea has persisted at moderate or severe for more than 7 days.");
  });

  it("returns a symptom-specific intervention for moderate nausea", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["nausea"], symptomSeverity: "moderate" }), deps);

    expect(result.action.type).toBe("intervention");
    expect(result.action.action).toBe("Eat a small, bland meal before your next dose and sip ginger tea.");
  });

  it("sets the intervention dueAt to 24 hours after creation", async () => {
    const deps = makeDeps();
    const now = new Date("2026-06-03T06:00:00.000Z");
    const result = await processCheckIn(makeInput(), deps);

    expect(result.intervention).toBeDefined();
    expect(result.intervention!.dueAt.getTime()).toBe(now.getTime() + 24 * 60 * 60 * 1000);
  });
});
