import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  CreateRoutineItemBody,
  CreateRoutineItemResponse,
  DeleteRoutineItemParams,
  GetDailyQueryParams,
  GetDailyResponse,
  GetMonthParams,
  GetMonthResponse,
  GetWeekParams,
  GetWeekResponse,
  ListRoutineItemsResponse,
  ReorderRoutineItemsBody,
  ReorderRoutineItemsResponse,
  SetRoutineCompletionBody,
  SetRoutineCompletionParams,
  SetRoutineCompletionResponse,
  UpdateRoutineItemBody,
  UpdateRoutineItemParams,
  UpdateRoutineItemResponse,
  UpsertEntryBody,
  UpsertEntryParams,
  UpsertEntryResponse,
  UpsertWeeklyReflectionBody,
  UpsertWeeklyReflectionParams,
  UpsertWeeklyReflectionResponse,
} from "@workspace/api-zod";
import {
  db,
  entriesTable,
  routineCompletionsTable,
  routineItemsTable,
  weeklyReflectionsTable,
} from "@workspace/db";

const router: IRouter = Router();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const emptyEntry = (date: string) => ({
  date,
  journalText: "",
  moodRating: null,
  topPriorities: ["", "", ""],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function assertDate(value: string) {
  if (!datePattern.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new Error("Invalid date");
  }
}

function shiftDate(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function mondayOf(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay();
  return shiftDate(date, day === 0 ? -6 : 1 - day);
}

function asEntry(row: typeof entriesTable.$inferSelect) {
  return {
    date: row.date,
    journalText: row.journalText,
    moodRating: row.moodRating,
    topPriorities: (row.topPriorities ?? ["", "", ""]).slice(0, 3),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getDaySummary(date: string) {
  const [entry] = await db
    .select()
    .from(entriesTable)
    .where(eq(entriesTable.date, date))
    .limit(1);
  const routines = await db
    .select({
      id: routineItemsTable.id,
      name: routineItemsTable.name,
      isActive: routineItemsTable.isActive,
      sortOrder: routineItemsTable.sortOrder,
      completed: routineCompletionsTable.completed,
    })
    .from(routineItemsTable)
    .leftJoin(
      routineCompletionsTable,
      and(
        eq(routineCompletionsTable.routineItemId, routineItemsTable.id),
        eq(routineCompletionsTable.date, date),
      ),
    )
    .where(eq(routineItemsTable.isActive, true))
    .orderBy(asc(routineItemsTable.sortOrder));
  const [previous] = await db
    .select({ journalText: entriesTable.journalText })
    .from(entriesTable)
    .where(eq(entriesTable.date, shiftDate(date, -1)))
    .limit(1);

  return {
    date,
    entry: entry ? asEntry(entry) : null,
    routines: routines.map((routine) => ({
      ...routine,
      completed: routine.completed ?? false,
    })),
    previousEntrySnippet: previous?.journalText
      ? previous.journalText.slice(0, 100)
      : null,
  };
}

router.get("/daily", async (req, res) => {
  try {
    const { date } = GetDailyQueryParams.parse(req.query);
    assertDate(date);
    res.json(GetDailyResponse.parse(await getDaySummary(date)));
  } catch (error) {
    req.log.error({ error }, "Failed to load daily log");
    res.status(400).json({ message: "Unable to load that day." });
  }
});

router.put("/entries/:date", async (req, res) => {
  try {
    const params = UpsertEntryParams.parse(req.params);
    assertDate(params.date);
    const body = UpsertEntryBody.parse(req.body);
    const priorities = [...body.topPriorities, "", "", ""].slice(0, 3);
    const [row] = await db
      .insert(entriesTable)
      .values({
        date: params.date,
        journalText: body.journalText,
        moodRating: body.moodRating,
        topPriorities: priorities,
      })
      .onConflictDoUpdate({
        target: entriesTable.date,
        set: {
          journalText: body.journalText,
          moodRating: body.moodRating,
          topPriorities: priorities,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(UpsertEntryResponse.parse(asEntry(row)));
  } catch (error) {
    req.log.error({ error }, "Failed to save journal entry");
    res.status(400).json({ message: "Unable to save your entry." });
  }
});

router.put("/entries/:date/routine/:routineItemId", async (req, res) => {
  try {
    const params = SetRoutineCompletionParams.parse(req.params);
    assertDate(params.date);
    const body = SetRoutineCompletionBody.parse(req.body);
    const [row] = await db
      .insert(routineCompletionsTable)
      .values({
        date: params.date,
        routineItemId: params.routineItemId,
        completed: body.completed,
      })
      .onConflictDoUpdate({
        target: [
          routineCompletionsTable.date,
          routineCompletionsTable.routineItemId,
        ],
        set: { completed: body.completed },
      })
      .returning();
    res.json(SetRoutineCompletionResponse.parse(row));
  } catch (error) {
    req.log.error({ error }, "Failed to save routine completion");
    res.status(400).json({ message: "Unable to save that routine update." });
  }
});

router.get("/weeks/:weekStartDate", async (req, res) => {
  try {
    const { weekStartDate } = GetWeekParams.parse(req.params);
    assertDate(weekStartDate);
    const start = mondayOf(weekStartDate);
    const [reflection] = await db
      .select()
      .from(weeklyReflectionsTable)
      .where(eq(weeklyReflectionsTable.weekStartDate, start))
      .limit(1);
    const days = [];
    for (let index = 0; index < 7; index += 1) {
      const date = shiftDate(start, index);
      const [entry] = await db
        .select()
        .from(entriesTable)
        .where(eq(entriesTable.date, date))
        .limit(1);
      const activeRoutines = await db
        .select({ id: routineItemsTable.id })
        .from(routineItemsTable)
        .where(eq(routineItemsTable.isActive, true));
      const completedRoutines = activeRoutines.length
        ? await db
            .select({ id: routineCompletionsTable.routineItemId })
            .from(routineCompletionsTable)
            .where(
              and(
                eq(routineCompletionsTable.date, date),
                eq(routineCompletionsTable.completed, true),
              ),
            )
        : [];
      days.push({
        date,
        dayName: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
          weekday: "long",
          timeZone: "UTC",
        }),
        routineCompletionPercent: activeRoutines.length
          ? Math.round((completedRoutines.length / activeRoutines.length) * 100)
          : 0,
        moodRating: entry?.moodRating ?? null,
        priorityCount: entry?.topPriorities?.filter(Boolean).length ?? 0,
        journalSnippet: entry?.journalText?.slice(0, 96) ?? "",
      });
    }
    res.json(
      GetWeekResponse.parse({
        weekStartDate: start,
        days,
        reflection: reflection
          ? {
              weekStartDate: reflection.weekStartDate,
              wentWell: reflection.wentWell,
              improve: reflection.improve,
            }
          : null,
      }),
    );
  } catch (error) {
    req.log.error({ error }, "Failed to load week");
    res.status(400).json({ message: "Unable to load that week." });
  }
});

router.put("/weeks/:weekStartDate/reflection", async (req, res) => {
  try {
    const params = UpsertWeeklyReflectionParams.parse(req.params);
    assertDate(params.weekStartDate);
    const body = UpsertWeeklyReflectionBody.parse(req.body);
    const weekStartDate = mondayOf(params.weekStartDate);
    const [row] = await db
      .insert(weeklyReflectionsTable)
      .values({ weekStartDate, ...body })
      .onConflictDoUpdate({
        target: weeklyReflectionsTable.weekStartDate,
        set: body,
      })
      .returning();
    res.json(UpsertWeeklyReflectionResponse.parse(row));
  } catch (error) {
    req.log.error({ error }, "Failed to save weekly reflection");
    res.status(400).json({ message: "Unable to save this reflection." });
  }
});

router.get("/months/:year/:month", async (req, res) => {
  try {
    const { year, month } = GetMonthParams.parse({
      year: Number(req.params.year),
      month: Number(req.params.month),
    });
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(Date.UTC(year, month, 0));
    const end = endDate.toISOString().slice(0, 10);
    const entries = await db
      .select()
      .from(entriesTable)
      .where(and(gte(entriesTable.date, start), lt(entriesTable.date, shiftDate(end, 1))));
    const completions = await db
      .select({
        date: routineCompletionsTable.date,
        completed: routineCompletionsTable.completed,
      })
      .from(routineCompletionsTable)
      .where(
        and(
          gte(routineCompletionsTable.date, start),
          lt(routineCompletionsTable.date, shiftDate(end, 1)),
        ),
      );
    const activeRoutineCount = (
      await db
        .select({ id: routineItemsTable.id })
        .from(routineItemsTable)
        .where(eq(routineItemsTable.isActive, true))
    ).length;
    const byDate = new Map(entries.map((entry) => [entry.date, entry]));
    const completionByDate = new Map<string, number>();
    for (const completion of completions) {
      if (completion.completed) {
        completionByDate.set(
          completion.date,
          (completionByDate.get(completion.date) ?? 0) + 1,
        );
      }
    }
    const days = [];
    for (let day = 1; day <= endDate.getUTCDate(); day += 1) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        date,
        moodRating: byDate.get(date)?.moodRating ?? null,
        routineCompletionPercent: activeRoutineCount
          ? Math.round(((completionByDate.get(date) ?? 0) / activeRoutineCount) * 100)
          : 0,
        hasEntry: Boolean(byDate.get(date)),
      });
    }
    const moodValues = entries
      .map((entry) => entry.moodRating)
      .filter((value): value is number => value != null);
    const routineValues = days.map((day) => day.routineCompletionPercent);
    const countsByDay = new Map<string, number>();
    for (const entry of entries) {
      const name = new Date(`${entry.date}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
      });
      countsByDay.set(name, (countsByDay.get(name) ?? 0) + 1);
    }
    const mostProductiveDay =
      [...countsByDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    let currentStreak = 0;
    for (let cursor = end; ; cursor = shiftDate(cursor, -1)) {
      if (!byDate.has(cursor)) break;
      currentStreak += 1;
    }
    res.json(
      GetMonthResponse.parse({
        year,
        month,
        days,
        stats: {
          averageMood: moodValues.length
            ? Math.round((moodValues.reduce((sum, value) => sum + value, 0) / moodValues.length) * 10) / 10
            : 0,
          averageRoutineCompletion: routineValues.length
            ? Math.round((routineValues.reduce((sum, value) => sum + value, 0) / routineValues.length) * 10) / 10
            : 0,
          currentStreak,
          mostProductiveDay,
        },
      }),
    );
  } catch (error) {
    req.log.error({ error }, "Failed to load month");
    res.status(400).json({ message: "Unable to load that month." });
  }
});

router.get("/routine-items", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(routineItemsTable)
      .orderBy(asc(routineItemsTable.sortOrder), asc(routineItemsTable.id));
    res.json(ListRoutineItemsResponse.parse(items));
  } catch (error) {
    req.log.error({ error }, "Failed to load routine items");
    res.status(500).json({ message: "Unable to load routines." });
  }
});

router.post("/routine-items", async (req, res) => {
  try {
    const body = CreateRoutineItemBody.parse(req.body);
    const [last] = await db
      .select({ sortOrder: routineItemsTable.sortOrder })
      .from(routineItemsTable)
      .orderBy(desc(routineItemsTable.sortOrder))
      .limit(1);
    const [item] = await db
      .insert(routineItemsTable)
      .values({ name: body.name.trim(), sortOrder: (last?.sortOrder ?? -1) + 1 })
      .returning();
    res.status(201).json(CreateRoutineItemResponse.parse(item));
  } catch (error) {
    req.log.error({ error }, "Failed to create routine item");
    res.status(400).json({ message: "Unable to add that routine." });
  }
});

router.patch("/routine-items/:id", async (req, res) => {
  try {
    const params = UpdateRoutineItemParams.parse({ id: Number(req.params.id) });
    const body = UpdateRoutineItemBody.parse(req.body);
    const [item] = await db
      .update(routineItemsTable)
      .set(body)
      .where(eq(routineItemsTable.id, params.id))
      .returning();
    if (!item) {
      res.status(404).json({ message: "Routine not found." });
      return;
    }
    res.json(UpdateRoutineItemResponse.parse(item));
  } catch (error) {
    req.log.error({ error }, "Failed to update routine item");
    res.status(400).json({ message: "Unable to update that routine." });
  }
});

router.delete("/routine-items/:id", async (req, res) => {
  try {
    const params = DeleteRoutineItemParams.parse({ id: Number(req.params.id) });
    await db
      .update(routineItemsTable)
      .set({ isActive: false })
      .where(eq(routineItemsTable.id, params.id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Failed to deactivate routine item");
    res.status(400).json({ message: "Unable to deactivate that routine." });
  }
});

router.put("/routine-items/reorder", async (req, res) => {
  try {
    const { ids } = ReorderRoutineItemsBody.parse(req.body);
    for (const [index, id] of ids.entries()) {
      await db
        .update(routineItemsTable)
        .set({ sortOrder: index })
        .where(eq(routineItemsTable.id, id));
    }
    const items = await db
      .select()
      .from(routineItemsTable)
      .orderBy(asc(routineItemsTable.sortOrder), asc(routineItemsTable.id));
    res.json(ReorderRoutineItemsResponse.parse(items));
  } catch (error) {
    req.log.error({ error }, "Failed to reorder routine items");
    res.status(400).json({ message: "Unable to reorder routines." });
  }
});

export default router;