import { db } from "../client";
import { debtSessions, NewDebtSession, DebtSession } from "../schema";
import { desc, eq } from "drizzle-orm";

export async function createDebtSession(
  data: NewDebtSession
): Promise<DebtSession> {
  const [session] = await db.insert(debtSessions).values(data).returning();
  return session;
}

export async function getDebtSessionsByUser(
  userId: string,
  limit = 10
): Promise<DebtSession[]> {
  return db
    .select()
    .from(debtSessions)
    .where(eq(debtSessions.userId, userId))
    .orderBy(desc(debtSessions.createdAt))
    .limit(limit);
}

export async function getLatestDebtSession(
  userId: string
): Promise<DebtSession | null> {
  const [session] = await db
    .select()
    .from(debtSessions)
    .where(eq(debtSessions.userId, userId))
    .orderBy(desc(debtSessions.createdAt))
    .limit(1);
  return session ?? null;
}
