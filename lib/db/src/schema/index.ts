import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const entriesTable = pgTable("entries", {
  date: text("date").primaryKey(),
  journalText: text("journal_text").notNull().default(""),
  moodRating: integer("mood_rating"),
  topPriorities: jsonb("top_priorities")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const routineItemsTable = pgTable("routine_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const routineCompletionsTable = pgTable(
  "routine_completions",
  {
    date: text("date").notNull(),
    routineItemId: integer("routine_item_id")
      .notNull()
      .references(() => routineItemsTable.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.date, table.routineItemId] }),
  }),
);

export const weeklyReflectionsTable = pgTable("weekly_reflections", {
  weekStartDate: text("week_start_date").primaryKey(),
  wentWell: text("went_well").notNull().default(""),
  improve: text("improve").notNull().default(""),
});

export const routineItemsRelations = relations(routineItemsTable, ({ many }) => ({
  completions: many(routineCompletionsTable),
}));

export type Entry = typeof entriesTable.$inferSelect;
export type RoutineItem = typeof routineItemsTable.$inferSelect;
export type RoutineCompletion = typeof routineCompletionsTable.$inferSelect;
export type WeeklyReflection = typeof weeklyReflectionsTable.$inferSelect;