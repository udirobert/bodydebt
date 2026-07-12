import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * user_preferences — cross-device sync of user settings.
 *
 * One row per user. Stores preferences that were previously localStorage-only
 * (orbPersonality, locale, mode, wake/bed times). Loaded on sign-in so a
 * user's setup follows them across devices.
 */
export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: varchar("user_id", { length: 128 })
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "personal" | "football" */
    mode: text("mode").default("personal"),
    /** Orb personality: "honest" | "encouraging" | "clinical" | "intense" */
    orbPersonality: text("orb_personality").default("honest"),
    /** ISO locale: "en" | "es" etc. */
    locale: text("locale").default("en"),
    /** HH:mm — user's typical wake time */
    wakeTime: text("wake_time"),
    /** HH:mm — user's typical bed time */
    bedTime: text("bed_time"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export type UserPreferences = InferSelectModel<typeof userPreferences>;
export type NewUserPreferences = InferInsertModel<typeof userPreferences>;
