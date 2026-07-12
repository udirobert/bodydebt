import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pgTable, text, timestamp, varchar, integer, json, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import type { DebtAnalysis } from "@/lib/types";

/**
 * squad_players — persistent squad roster for football mode.
 *
 * Replaces the localStorage-only squad array in the Zustand store.
 * One row per player, linked to the coach's userId.
 */
export const squadPlayers = pgTable(
  "squad_players",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    coachId: varchar("coach_id", { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: text("position"),
    jerseyNumber: integer("jersey_number"),
    /** Last analysis result (JSON of DebtAnalysis | null) */
    analysis: json("analysis").$type<DebtAnalysis | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    coachIdx: index("squad_players_coach_idx").on(table.coachId),
  })
);

export type SquadPlayerRow = InferSelectModel<typeof squadPlayers>;
export type NewSquadPlayerRow = InferInsertModel<typeof squadPlayers>;
