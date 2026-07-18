import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import {
  careObservations,
  careInterventions,
  careEscalations,
  carePatients,
  type CareObservationRow,
  type CareInterventionRow,
  type CareEscalationRow,
  type CarePatient,
} from "../schema/care";

export async function getCarePatientByUserId(userId: string): Promise<CarePatient | undefined> {
  const rows = await db.select().from(carePatients).where(eq(carePatients.userId, userId)).limit(1);
  return rows[0];
}

export async function getCareObservationsForPatient(
  patientId: string,
  limit = 30,
): Promise<CareObservationRow[]> {
  return db
    .select()
    .from(careObservations)
    .where(eq(careObservations.patientId, patientId))
    .orderBy(desc(careObservations.checkInAt))
    .limit(limit);
}

export async function createCareObservation(
  data: typeof careObservations.$inferInsert,
): Promise<CareObservationRow> {
  const rows = await db.insert(careObservations).values(data).returning();
  return rows[0];
}

export async function createCareIntervention(
  data: typeof careInterventions.$inferInsert,
): Promise<CareInterventionRow> {
  const rows = await db.insert(careInterventions).values(data).returning();
  return rows[0];
}

export async function createCareEscalation(
  data: typeof careEscalations.$inferInsert,
): Promise<CareEscalationRow> {
  const rows = await db.insert(careEscalations).values(data).returning();
  return rows[0];
}

export async function getOpenEscalationsForClinic(
  clinicId: string,
  limit = 50,
): Promise<(CareEscalationRow & { patient: CarePatient })[]> {
  return db
    .select({
      id: careEscalations.id,
      patientId: careEscalations.patientId,
      observationId: careEscalations.observationId,
      reason: careEscalations.reason,
      status: careEscalations.status,
      createdAt: careEscalations.createdAt,
      resolvedAt: careEscalations.resolvedAt,
      patient: carePatients,
    })
    .from(careEscalations)
    .innerJoin(carePatients, eq(carePatients.id, careEscalations.patientId))
    .where(and(eq(carePatients.clinicId, clinicId), eq(careEscalations.status, "open")))
    .orderBy(desc(careEscalations.createdAt))
    .limit(limit) as unknown as (CareEscalationRow & { patient: CarePatient })[];
}

export async function getPendingInterventionsForPatient(
  patientId: string,
): Promise<CareInterventionRow[]> {
  return db
    .select()
    .from(careInterventions)
    .where(and(eq(careInterventions.patientId, patientId), eq(careInterventions.status, "pending")))
    .orderBy(desc(careInterventions.dueAt));
}
