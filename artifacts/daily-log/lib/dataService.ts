import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { iso, parseIso, shiftDays, startOfWeek } from './date';

export interface Entry {
  date: string;
  journalText: string;
  moodRating: number | null;
  topPriorities: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineItem {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  completed?: boolean;
}

export interface DailyData {
  date: string;
  entry: Entry | null;
  routines: RoutineItem[];
  previousEntrySnippet: string | null;
}

export interface WeekDaySummary {
  date: string;
  dayName: string;
  hasEntry: boolean;
  moodRating: number | null;
  completionPercent: number;
  completedCount: number;
  totalCount: number;
}

export interface WeekSummary {
  weekStartDate: string;
  days: WeekDaySummary[];
  reflection: { wentWell: string; improve: string } | null;
  averageCompletion: number;
}

export interface MonthDaySummary {
  date: string;
  moodRating: number | null;
  routineCompletionPercent: number;
  hasEntry: boolean;
}

export interface MonthSummary {
  year: number;
  month: number;
  days: MonthDaySummary[];
  stats: {
    averageMood: number | null;
    averageRoutineCompletion: number;
    currentStreak: number;
    mostProductiveDay: string;
  };
}

// Local Storage Keys
const LOCAL_ENTRIES_KEY = '@daily-log/entries';
const LOCAL_ROUTINES_KEY = '@daily-log/routines';
const LOCAL_COMPLETIONS_KEY = '@daily-log/completions';
const LOCAL_REFLECTIONS_KEY = '@daily-log/reflections';

const DEFAULT_STARTER_ROUTINES: Omit<RoutineItem, 'completed'>[] = [
  { id: 1, name: 'Morning meditation or walk', isActive: true, sortOrder: 0 },
  { id: 2, name: '8 hours restful sleep', isActive: true, sortOrder: 1 },
  { id: 3, name: 'Deep work block', isActive: true, sortOrder: 2 },
  { id: 4, name: 'No screen before bed', isActive: true, sortOrder: 3 },
  { id: 5, name: 'Read 20 minutes', isActive: true, sortOrder: 4 },
];

// Helper: Local Routine Initializer
async function getLocalRoutines(): Promise<Omit<RoutineItem, 'completed'>[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ROUTINES_KEY);
    if (raw) return JSON.parse(raw);
    await AsyncStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(DEFAULT_STARTER_ROUTINES));
    return DEFAULT_STARTER_ROUTINES;
  } catch {
    return DEFAULT_STARTER_ROUTINES;
  }
}

// ---------------------------------------------------------------------------
// 1. Daily Log (Entry + Routines for Date)
// ---------------------------------------------------------------------------
export async function fetchDailyLog(date: string, userId?: string | null): Promise<DailyData> {
  const supabase = getSupabase();
  const useCloud = isSupabaseConfigured() && Boolean(userId);

  if (useCloud && userId) {
    try {
      // 1. Fetch Entry
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (entryError && entryError.code !== 'PGRST116') {
        throw entryError;
      }

      // 2. Fetch Active Routines
      const { data: routinesData } = await supabase
        .from('routine_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // 3. Fetch Completions for today
      const { data: completionsData } = await supabase
        .from('routine_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date);

      // 4. Fetch Previous Entry snippet
      const yesterday = shiftDays(date, -1);
      const { data: prevData } = await supabase
        .from('entries')
        .select('journal_text')
        .eq('user_id', userId)
        .eq('date', yesterday)
        .maybeSingle();

      const completionMap = new Map<number, boolean>();
      (completionsData || []).forEach((c) => completionMap.set(c.routine_item_id, c.completed));

      const routines: RoutineItem[] = (routinesData || []).map((r) => ({
        id: r.id,
        name: r.name,
        isActive: r.is_active,
        sortOrder: r.sort_order,
        completed: completionMap.get(r.id) ?? false,
      }));

      const entry: Entry | null = entryData
        ? {
            date: entryData.date,
            journalText: entryData.journal_text,
            moodRating: entryData.mood_rating,
            topPriorities: Array.isArray(entryData.top_priorities) ? entryData.top_priorities : ['', '', ''],
            createdAt: entryData.created_at,
            updatedAt: entryData.updated_at,
          }
        : null;

      // Cache locally for offline viewing if entry was found
      if (entry) {
        await AsyncStorage.setItem(`${LOCAL_ENTRIES_KEY}_${date}`, JSON.stringify(entry));
      }

      return {
        date,
        entry,
        routines: routines.length > 0 ? routines : DEFAULT_STARTER_ROUTINES.map((r) => ({ ...r, completed: false })),
        previousEntrySnippet: prevData?.journal_text ? prevData.journal_text.slice(0, 100) : null,
      };
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local storage', err);
    }
  }

  // Local / Guest Fallback
  const rawEntry = await AsyncStorage.getItem(`${LOCAL_ENTRIES_KEY}_${date}`);
  const entry: Entry | null = rawEntry ? JSON.parse(rawEntry) : null;
  const localRoutines = await getLocalRoutines();
  const rawCompletions = await AsyncStorage.getItem(`${LOCAL_COMPLETIONS_KEY}_${date}`);
  const completionMap: Record<number, boolean> = rawCompletions ? JSON.parse(rawCompletions) : {};

  const routines: RoutineItem[] = localRoutines
    .filter((r) => r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      ...r,
      completed: completionMap[r.id] ?? false,
    }));

  const yesterday = shiftDays(date, -1);
  const rawPrev = await AsyncStorage.getItem(`${LOCAL_ENTRIES_KEY}_${yesterday}`);
  const prevEntry: Entry | null = rawPrev ? JSON.parse(rawPrev) : null;

  return {
    date,
    entry,
    routines,
    previousEntrySnippet: prevEntry?.journalText ? prevEntry.journalText.slice(0, 100) : null,
  };
}

// ---------------------------------------------------------------------------
// 2. Save Journal Entry
// ---------------------------------------------------------------------------
export async function saveDailyEntry(
  date: string,
  entryData: { journalText: string; moodRating: number | null; topPriorities: string[] },
  userId?: string | null
): Promise<Entry> {
  const cleanEntry: Entry = {
    date,
    journalText: entryData.journalText,
    moodRating: entryData.moodRating,
    topPriorities: [...entryData.topPriorities, '', '', ''].slice(0, 3),
    updatedAt: new Date().toISOString(),
  };

  // Always save locally first for instant optimistic response
  await AsyncStorage.setItem(`${LOCAL_ENTRIES_KEY}_${date}`, JSON.stringify(cleanEntry));

  const supabase = getSupabase();
  const useCloud = isSupabaseConfigured() && Boolean(userId);

  if (useCloud && userId) {
    try {
      const { data, error } = await supabase
        .from('entries')
        .upsert(
          {
            user_id: userId,
            date,
            journal_text: cleanEntry.journalText,
            mood_rating: cleanEntry.moodRating,
            top_priorities: cleanEntry.topPriorities,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single();

      if (data && !error) {
        return {
          date: data.date,
          journalText: data.journal_text,
          moodRating: data.mood_rating,
          topPriorities: data.top_priorities,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Cloud sync error, saved locally', err);
    }
  }

  return cleanEntry;
}

// ---------------------------------------------------------------------------
// 3. Toggle Routine Completion
// ---------------------------------------------------------------------------
export async function toggleRoutineItemCompletion(
  date: string,
  routineItemId: number,
  completed: boolean,
  userId?: string | null
): Promise<boolean> {
  // 1. Update locally
  const rawCompletions = await AsyncStorage.getItem(`${LOCAL_COMPLETIONS_KEY}_${date}`);
  const completionMap: Record<number, boolean> = rawCompletions ? JSON.parse(rawCompletions) : {};
  completionMap[routineItemId] = completed;
  await AsyncStorage.setItem(`${LOCAL_COMPLETIONS_KEY}_${date}`, JSON.stringify(completionMap));

  // 2. Sync to cloud if available
  const supabase = getSupabase();
  if (isSupabaseConfigured() && userId) {
    try {
      await supabase.from('routine_completions').upsert(
        {
          user_id: userId,
          date,
          routine_item_id: routineItemId,
          completed,
        },
        { onConflict: 'user_id,date,routine_item_id' }
      );
    } catch (err) {
      console.warn('Routine completion cloud sync error', err);
    }
  }

  return completed;
}

// ---------------------------------------------------------------------------
// 4. Week Summary & Reflections
// ---------------------------------------------------------------------------
export async function fetchWeekSummary(weekStart: string, userId?: string | null): Promise<WeekSummary> {
  const days: WeekDaySummary[] = [];
  let totalPercent = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = shiftDays(weekStart, i);
    const dayObj = parseIso(curDate);
    const dayName = dayObj.toLocaleDateString(undefined, { weekday: 'short' });
    const daily = await fetchDailyLog(curDate, userId);

    const completedCount = daily.routines.filter((r) => r.completed).length;
    const totalCount = daily.routines.length;
    const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    totalPercent += completionPercent;

    days.push({
      date: curDate,
      dayName,
      hasEntry: Boolean(daily.entry?.journalText?.trim()),
      moodRating: daily.entry?.moodRating ?? null,
      completionPercent,
      completedCount,
      totalCount,
    });
  }

  // Reflection
  let reflection: { wentWell: string; improve: string } | null = null;
  const rawRef = await AsyncStorage.getItem(`${LOCAL_REFLECTIONS_KEY}_${weekStart}`);
  if (rawRef) reflection = JSON.parse(rawRef);

  if (isSupabaseConfigured() && userId) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('weekly_reflections')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStart)
        .maybeSingle();

      if (data) {
        reflection = { wentWell: data.went_well, improve: data.improve };
      }
    } catch {}
  }

  return {
    weekStartDate: weekStart,
    days,
    reflection,
    averageCompletion: Math.round(totalPercent / 7),
  };
}

export async function saveWeekReflection(
  weekStartDate: string,
  wentWell: string,
  improve: string,
  userId?: string | null
): Promise<{ wentWell: string; improve: string }> {
  const reflection = { wentWell, improve };
  await AsyncStorage.setItem(`${LOCAL_REFLECTIONS_KEY}_${weekStartDate}`, JSON.stringify(reflection));

  if (isSupabaseConfigured() && userId) {
    try {
      const supabase = getSupabase();
      await supabase.from('weekly_reflections').upsert(
        {
          user_id: userId,
          week_start_date: weekStartDate,
          went_well: wentWell,
          improve,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,week_start_date' }
      );
    } catch (err) {
      console.warn('Reflection sync error', err);
    }
  }

  return reflection;
}

// ---------------------------------------------------------------------------
// 5. Month Summary
// ---------------------------------------------------------------------------
export async function fetchMonthSummary(year: number, month: number, userId?: string | null): Promise<MonthSummary> {
  const totalDays = new Date(year, month, 0).getDate();
  const days: MonthDaySummary[] = [];
  let moodSum = 0;
  let moodCount = 0;
  let compSum = 0;
  let currentStreak = 0;
  const dayNameCompletions: Record<string, number[]> = {};

  const todayStr = iso(new Date());

  for (let d = 1; d <= totalDays; d++) {
    const curDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const daily = await fetchDailyLog(curDate, userId);

    const completedCount = daily.routines.filter((r) => r.completed).length;
    const totalCount = daily.routines.length;
    const routineCompletionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const hasEntry = Boolean(daily.entry?.journalText?.trim());
    if (daily.entry?.moodRating) {
      moodSum += daily.entry.moodRating;
      moodCount++;
    }
    compSum += routineCompletionPercent;

    const weekday = parseIso(curDate).toLocaleDateString(undefined, { weekday: 'long' });
    if (!dayNameCompletions[weekday]) dayNameCompletions[weekday] = [];
    dayNameCompletions[weekday].push(routineCompletionPercent);

    if (curDate <= todayStr && (hasEntry || routineCompletionPercent >= 50)) {
      currentStreak++;
    } else if (curDate < todayStr) {
      currentStreak = 0;
    }

    days.push({
      date: curDate,
      moodRating: daily.entry?.moodRating ?? null,
      routineCompletionPercent,
      hasEntry,
    });
  }

  let mostProductiveDay = 'Wednesday';
  let bestAvg = -1;
  Object.entries(dayNameCompletions).forEach(([day, vals]) => {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      mostProductiveDay = day;
    }
  });

  return {
    year,
    month,
    days,
    stats: {
      averageMood: moodCount > 0 ? Number((moodSum / moodCount).toFixed(1)) : null,
      averageRoutineCompletion: Math.round(compSum / totalDays),
      currentStreak,
      mostProductiveDay,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Routine Management
// ---------------------------------------------------------------------------
export async function fetchRoutineItems(userId?: string | null): Promise<RoutineItem[]> {
  if (isSupabaseConfigured() && userId) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('routine_items')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (data && !error && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          name: r.name,
          isActive: r.is_active,
          sortOrder: r.sort_order,
        }));
      }

      if (data && !error && data.length === 0) {
        // Auto-seed starter routines for the user
        const starterPayload = DEFAULT_STARTER_ROUTINES.map((r) => ({
          user_id: userId,
          name: r.name,
          is_active: r.isActive,
          sort_order: r.sortOrder,
        }));
        const { data: seeded } = await supabase.from('routine_items').insert(starterPayload).select();
        if (seeded && seeded.length > 0) {
          return seeded.map((r) => ({
            id: r.id,
            name: r.name,
            isActive: r.is_active,
            sortOrder: r.sort_order,
          }));
        }
      }
    } catch {}
  }

  const local = await getLocalRoutines();
  return local.map((r) => ({ ...r, completed: false }));
}

export async function addRoutineItem(name: string, userId?: string | null): Promise<RoutineItem> {
  const current = await fetchRoutineItems(userId);
  const nextId = current.length > 0 ? Math.max(...current.map((r) => r.id)) + 1 : 1;
  const newItem: RoutineItem = {
    id: nextId,
    name: name.trim(),
    isActive: true,
    sortOrder: current.length,
  };

  const updated = [...current, newItem];
  await AsyncStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(updated));

  if (isSupabaseConfigured() && userId) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('routine_items')
        .insert({
          user_id: userId,
          name: newItem.name,
          is_active: true,
          sort_order: newItem.sortOrder,
        })
        .select()
        .single();

      if (data) return { id: data.id, name: data.name, isActive: data.is_active, sortOrder: data.sort_order };
    } catch {}
  }

  return newItem;
}

export async function updateRoutineItem(
  id: number,
  updates: { name?: string; isActive?: boolean },
  userId?: string | null
): Promise<void> {
  const current = await fetchRoutineItems(userId);
  const next = current.map((r) => (r.id === id ? { ...r, ...updates } : r));
  await AsyncStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(next));

  if (isSupabaseConfigured() && userId) {
    try {
      const supabase = getSupabase();
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      await supabase.from('routine_items').update(payload).eq('id', id).eq('user_id', userId);
    } catch {}
  }
}

export async function deleteRoutineItem(id: number, userId?: string | null): Promise<void> {
  const current = await fetchRoutineItems(userId);
  const next = current.filter((r) => r.id !== id);
  await AsyncStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(next));

  if (isSupabaseConfigured() && userId) {
    try {
      const supabase = getSupabase();
      await supabase.from('routine_items').delete().eq('id', id).eq('user_id', userId);
    } catch {}
  }
}
