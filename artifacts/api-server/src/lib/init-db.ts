import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export async function initializeDatabase() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS entries (
      date TEXT PRIMARY KEY,
      journal_text TEXT NOT NULL DEFAULT '',
      mood_rating INTEGER,
      top_priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS routine_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS routine_completions (
      date TEXT NOT NULL,
      routine_item_id INTEGER NOT NULL REFERENCES routine_items(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (date, routine_item_id)
    );
    CREATE TABLE IF NOT EXISTS weekly_reflections (
      week_start_date TEXT PRIMARY KEY,
      went_well TEXT NOT NULL DEFAULT '',
      improve TEXT NOT NULL DEFAULT ''
    );
    INSERT INTO routine_items (name, sort_order)
    SELECT seed.name, seed.sort_order
    FROM (VALUES
      ('Exercise', 0),
      ('8 hours sleep', 1),
      ('Deep work block', 2),
      ('No phone before bed', 3),
      ('Read 20 minutes', 4)
    ) AS seed(name, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM routine_items);
  `);
}