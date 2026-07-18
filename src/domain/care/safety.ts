import type {
  CareObservation,
  CareObservationInput,
  CareAction,
  CareSymptom,
  AdherenceStatus,
} from "./types";

export const SEVERE_SYMPTOMS: CareSymptom[] = [
  "vomiting",
  "abdominal_pain",
  "jaundice",
  "allergic_reaction",
  "hypoglycaemia_symptoms",
];

/**
 * Deterministic GLP-1 safety and escalation rules for the first 12 weeks.
 *
 * These rules do not diagnose or change doses. They decide whether the next
 * action is a clinic escalation or an allowed self-care intervention from the
 * care plan.
 */
export function evaluateObservation(
  input: CareObservationInput,
  previousObservations: Pick<CareObservation, "symptoms" | "symptomSeverity" | "checkInAt">[],
): CareAction {
  const symptoms = new Set(input.symptoms);

  // 1. Hard safety signals — always escalate
  for (const severe of SEVERE_SYMPTOMS) {
    if (symptoms.has(severe)) {
      return {
        type: "escalate",
        reason: `Severe safety signal reported: ${severe.replace(/_/g, " ")}.`,
      };
    }
  }

  // 2. Persistent moderate+ symptom > 7 days
  const sameSymptomForDays = (symptom: CareSymptom) => {
    const matching = previousObservations.filter(
      (o) => o.symptoms.includes(symptom) && o.symptomSeverity !== "mild",
    );
    if (matching.length === 0) return 0;
    const oldest = matching.reduce((min, o) => (o.checkInAt < min ? o.checkInAt : min), matching[0].checkInAt);
    const days = (Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24);
    return days;
  };

  for (const symptom of input.symptoms) {
    if (input.symptomSeverity !== "mild" && sameSymptomForDays(symptom) > 7) {
      return {
        type: "escalate",
        reason: `${symptom.replace(/_/g, " ")} has persisted at moderate or severe for more than 7 days.`,
      };
    }
  }

  // 3. Adherence / disengagement
  if (input.adherence === "missed_multiple" || input.adherence === "stopped") {
    return {
      type: "escalate",
      reason: "Multiple missed doses or treatment stopped — clinic follow-up required.",
    };
  }

  // 4. Persistent nausea / diarrhoea with moderate severity
  if (input.symptomSeverity === "moderate" || input.symptomSeverity === "severe") {
    if (symptoms.has("nausea")) {
      return { type: "intervention", action: "Eat a small, bland meal before your next dose and sip ginger tea." };
    }
    if (symptoms.has("diarrhoea")) {
      return { type: "intervention", action: "Increase oral rehydration and avoid high-fat meals for 24 hours." };
    }
    if (symptoms.has("constipation")) {
      return { type: "intervention", action: "Drink 500ml extra water today and add fibre to your next meal." };
    }
    if (symptoms.has("reflux")) {
      return { type: "intervention", action: "Avoid lying down for 2 hours after eating and elevate your head tonight." };
    }
    if (symptoms.has("headache")) {
      return { type: "intervention", action: "Drink 500ml water and rest in a dark room for 20 minutes." };
    }
    if (symptoms.has("fatigue")) {
      return { type: "intervention", action: "Plan a 20-minute walk after your next meal and aim for 8 hours sleep." };
    }
    if (symptoms.has("dizziness")) {
      return { type: "intervention", action: "Sit down, drink water, and do not drive until it passes." };
    }
  }

  // 5. Mild symptoms
  if (symptoms.has("nausea") || symptoms.has("fatigue")) {
    return { type: "intervention", action: "Continue your care plan and log tomorrow to track the trend." };
  }

  // 6. No symptoms, good adherence
  return { type: "intervention", action: "You're on track. Log again tomorrow." };
}

export function missedDoseCount(adherence: AdherenceStatus): number {
  switch (adherence) {
    case "missed_one_dose":
      return 1;
    case "missed_multiple":
      return 3;
    case "stopped":
    case "not_started":
      return 0;
    case "taken_as_prescribed":
      return 0;
  }
}
