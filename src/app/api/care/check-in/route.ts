import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { notifications } from "@/lib/sdk/eazo-server";
import { ai } from "@/lib/sdk/eazo-client";
import { sendEmail } from "@/lib/email";
import { buildEscalationEmail } from "@/lib/care/escalation-email";
import { processCheckIn } from "@/application/care/check-in";
import { careObservations, careInterventions, careEscalations, carePatients } from "@/lib/db/schema/care";
import { users } from "@/lib/db/schema/users";
import { db } from "@/lib/db/client";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { CareObservation, CareIntervention, CareEscalation, CareObservationInput } from "@/domain/care/types";

export const maxDuration = 30;

/**
 * POST /api/care/check-in
 *
 * Accepts a GLP-1 patient check-in, runs deterministic safety rules,
 * persists the observation, and returns either the next allowed
 * intervention or an escalation to the clinic.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    symptoms: string[];
    symptomSeverity: "mild" | "moderate" | "severe";
    adherence: string;
    weightKg?: number | null;
    fastingGlucose?: number | null;
    notes?: string | null;
    medication?: string | null;
    currentDose?: string | null;
  };

  if (!Array.isArray(body.symptoms) || body.symptoms.length === 0) {
    return NextResponse.json({ error: "symptoms are required" }, { status: 400 });
  }
  if (!["mild", "moderate", "severe"].includes(body.symptomSeverity)) {
    return NextResponse.json({ error: "invalid symptomSeverity" }, { status: 400 });
  }
  if (!body.adherence) {
    return NextResponse.json({ error: "adherence is required" }, { status: 400 });
  }

  // Find or create the care patient for this user and update medication/dose if supplied.
  let [patient] = await db.select().from(carePatients).where(eq(carePatients.userId, auth.user.id)).limit(1);
  if (!patient) {
    const [created] = await db
      .insert(carePatients)
      .values({
        id: randomUUID(),
        userId: auth.user.id,
        medication: body.medication ?? null,
        currentDose: body.currentDose ?? null,
        enrolledAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    patient = created;
  } else if (body.medication || body.currentDose) {
    const [updated] = await db
      .update(carePatients)
      .set({
        medication: body.medication ?? patient.medication,
        currentDose: body.currentDose ?? patient.currentDose,
        updatedAt: new Date(),
      })
      .where(eq(carePatients.id, patient.id))
      .returning();
    patient = updated;
  }

  const input: CareObservationInput = {
    patientId: patient.id,
    symptoms: body.symptoms as CareObservationInput["symptoms"],
    symptomSeverity: body.symptomSeverity,
    adherence: body.adherence as CareObservationInput["adherence"],
    weightKg: body.weightKg ?? null,
    fastingGlucose: body.fastingGlucose ?? null,
    notes: body.notes ?? null,
    medication: patient.medication,
    currentDose: patient.currentDose,
  };

  const result = await processCheckIn(input, {
    getPreviousObservations: async (patientId) => {
      return db
        .select({
          symptoms: careObservations.symptoms,
          symptomSeverity: careObservations.symptomSeverity,
          checkInAt: careObservations.checkInAt,
        })
        .from(careObservations)
        .where(eq(careObservations.patientId, patientId))
        .orderBy(desc(careObservations.checkInAt));
    },
    saveObservation: async (obs) => {
      const [row] = await db
        .insert(careObservations)
        .values({
          id: obs.id,
          patientId: obs.patientId,
          checkInAt: obs.checkInAt,
          symptoms: obs.symptoms,
          symptomSeverity: obs.symptomSeverity,
          adherence: obs.adherence,
          weightKg: obs.weightKg,
          fastingGlucose: obs.fastingGlucose,
          notes: obs.notes,
        })
        .returning();
      return row as CareObservation;
    },
    saveIntervention: async (intervention) => {
      const [row] = await db.insert(careInterventions).values(intervention).returning();
      return row as CareIntervention;
    },
    saveEscalation: async (escalation) => {
      const [row] = await db.insert(careEscalations).values(escalation).returning();
      return row as CareEscalation;
    },
    notifyEscalation: async (escalation, observation) => {
      const careTeamEmail = process.env.CARE_TEAM_EMAIL;
      if (careTeamEmail) {
        try {
          const [patientRow] = await db
            .select({
              name: users.name,
              email: users.email,
              medication: carePatients.medication,
              currentDose: carePatients.currentDose,
            })
            .from(carePatients)
            .innerJoin(users, eq(carePatients.userId, users.id))
            .where(eq(carePatients.id, observation.patientId))
            .limit(1);

          const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://bodydebt.thisyearnofear.com";
          const { subject, text, html } = buildEscalationEmail(
            escalation,
            observation,
            {
              name: patientRow?.name,
              email: patientRow?.email,
              medication: patientRow?.medication,
              currentDose: patientRow?.currentDose,
            },
            siteUrl,
          );

          await sendEmail({ to: careTeamEmail, subject, text, html });
        } catch (err) {
          console.error("[care/escalation] email failed", err);
        }
        return;
      }

      if (notifications.available) {
        try {
          await notifications.publish({
            title: "Care escalation",
            body: escalation.reason,
            data: { escalationId: escalation.id, patientId: escalation.patientId },
            audience: "care-team",
          });
        } catch {
          // Never block check-in on notification failure.
        }
      } else {
        console.log("[care/escalation] notification suppressed (no CARE_TEAM_EMAIL or push config)", escalation.id);
      }
    },
    explainIntervention: async (_input, action) => {
      const prompt = `Rephrase the following care instruction in a warm, patient-friendly way. Do not add new medical advice, do not change the meaning, and keep it under 30 words.\n\nInstruction: ${action.action}`;
      try {
        const response = await ai.chat({
          model: "anthropic.claude-3-5-haiku",
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.choices[0]?.message?.content?.trim();
        return content || action.action;
      } catch {
        return action.action;
      }
    },
  });

  return NextResponse.json({
    ok: true,
    observation: result.observation,
    action: result.action,
    intervention: result.intervention,
    escalation: result.escalation,
  });
}
