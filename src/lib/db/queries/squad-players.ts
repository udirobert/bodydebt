import { eq } from "drizzle-orm";
import { db } from "../client";
import { squadPlayers, type SquadPlayerRow, type NewSquadPlayerRow } from "../schema";

export async function getSquadByCoach(coachId: string): Promise<SquadPlayerRow[]> {
  return db
    .select()
    .from(squadPlayers)
    .where(eq(squadPlayers.coachId, coachId));
}

export async function createSquadPlayer(
  data: Omit<NewSquadPlayerRow, "createdAt" | "updatedAt">
): Promise<SquadPlayerRow> {
  const [row] = await db.insert(squadPlayers).values(data).returning();
  return row;
}

export async function updateSquadPlayer(
  id: string,
  patch: Partial<NewSquadPlayerRow>
): Promise<SquadPlayerRow | undefined> {
  const [row] = await db
    .update(squadPlayers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(squadPlayers.id, id))
    .returning();
  return row;
}

export async function deleteSquadPlayer(id: string): Promise<boolean> {
  const rows = await db
    .delete(squadPlayers)
    .where(eq(squadPlayers.id, id))
    .returning({ id: squadPlayers.id });
  return rows.length > 0;
}

export async function deleteSquadByCoach(coachId: string): Promise<void> {
  await db.delete(squadPlayers).where(eq(squadPlayers.coachId, coachId));
}
