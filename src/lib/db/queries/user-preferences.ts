import { eq } from "drizzle-orm";
import { db } from "../client";
import { userPreferences, type UserPreferences, type NewUserPreferences } from "../schema";

export async function getPreferences(userId: string): Promise<UserPreferences | undefined> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return rows[0];
}

export async function upsertPreferences(
  data: Omit<NewUserPreferences, "createdAt" | "updatedAt">
): Promise<UserPreferences> {
  const rows = await db
    .insert(userPreferences)
    .values(data)
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        mode: data.mode,
        orbPersonality: data.orbPersonality,
        locale: data.locale,
        wakeTime: data.wakeTime,
        bedTime: data.bedTime,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}
