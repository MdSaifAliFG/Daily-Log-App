import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { IndiaCalendarModal } from '@/components/IndiaCalendarModal';
import { getIndianHoliday } from '@/lib/holidaysIndia';
import {
  Button,
  Card,
  Field,
  IconButton,
  LoadingState,
  Page,
  SectionTitle,
  styles as ui,
} from '@/components/AppUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { displayDate, iso, parseIso, shiftDays } from '@/lib/date';
import { useAuth } from '@/contexts/AuthContext';
import {
  addRoutineItem,
  fetchDailyLog,
  saveDailyEntry,
  toggleRoutineItemCompletion,
} from '@/lib/dataService';

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ date?: string }>();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const [date, setDate] = useState(iso(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load daily log data with fallback
  const dailyQuery = useQuery({
    queryKey: ['daily-log', date, user?.id ?? 'user'],
    queryFn: () => fetchDailyLog(date, user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const [journalText, setJournalText] = useState('');
  const [moodRating, setMoodRating] = useState<number | null>(null);
  const [priorities, setPriorities] = useState<string[]>(['', '', '']);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);
  const loadedDate = useRef<string | null>(null);
  const dirty = useRef(false);

  // Sync route param date
  useEffect(() => {
    if (routeParams.date && /^\d{4}-\d{2}-\d{2}$/.test(routeParams.date)) {
      setDate(routeParams.date);
    }
  }, [routeParams.date]);

  // Sync data when query succeeds
  useEffect(() => {
    if (dailyQuery.data) {
      dirty.current = false;
      setJournalText(dailyQuery.data.entry?.journalText ?? '');
      setMoodRating(dailyQuery.data.entry?.moodRating ?? null);
      setPriorities([0, 1, 2].map((i) => dailyQuery.data?.entry?.topPriorities[i] ?? ''));
      setCompleted(
        Object.fromEntries(dailyQuery.data.routines.map((item) => [item.id, !!item.completed]))
      );
      loadedDate.current = date;
    }
  }, [dailyQuery.data, date]);

  // Mutation for saving journal entry
  const saveMutation = useMutation({
    mutationFn: (data: { journalText: string; moodRating: number | null; topPriorities: string[] }) =>
      saveDailyEntry(date, data, user?.id),
    onSuccess: (savedEntry) => {
      queryClient.setQueryData(
        ['daily-log', date, user?.id ?? 'user'],
        (old: any) => (old ? { ...old, entry: savedEntry } : old)
      );
      queryClient.invalidateQueries({ queryKey: ['week-summary'] });
      queryClient.invalidateQueries({ queryKey: ['month-summary'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      dirty.current = true;
    },
  });

  // Mutation for routine item completion
  const routineMutation = useMutation({
    mutationFn: ({ id, isDone }: { id: number; isDone: boolean }) =>
      toggleRoutineItemCompletion(date, id, isDone, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['week-summary'] });
      queryClient.invalidateQueries({ queryKey: ['month-summary'] });
    },
    onError: (_err, variables) => {
      // Revert optimistic update
      setCompleted((cur) => ({ ...cur, [variables.id]: !variables.isDone }));
    },
  });

  // Inline routine addition
  const [isAddingRoutine, setIsAddingRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');

  const addRoutineMutation = useMutation({
    mutationFn: (name: string) => addRoutineItem(name, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      queryClient.invalidateQueries({ queryKey: ['routine-items'] });
      setNewRoutineName('');
      setIsAddingRoutine(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
  });

  const handleAddRoutine = () => {
    if (!newRoutineName.trim()) return;
    addRoutineMutation.mutate(newRoutineName.trim());
  };

  const save = () => {
    dirty.current = false;
    saveMutation.mutate({
      journalText,
      moodRating,
      topPriorities: priorities,
    });
  };

  const changeDate = (nextDate: string) => {
    if (dirty.current && loadedDate.current === date) {
      save();
    }
    setDate(nextDate);
  };

  // Auto-save debounced effect
  useEffect(() => {
    if (loadedDate.current !== date || !dailyQuery.data || !dirty.current) return;
    const timeout = setTimeout(() => save(), 1200);
    return () => clearTimeout(timeout);
  }, [journalText, moodRating, priorities, date]);

  const toggleRoutine = (id: number) => {
    const next = !completed[id];
    Haptics.selectionAsync().catch(() => {});
    setCompleted((current) => ({ ...current, [id]: next }));
    routineMutation.mutate({ id, isDone: next });
  };

  const isToday = date === iso(new Date());

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = profile?.fullName ? ` ${profile.fullName.split(' ')[0]}` : '';
    if (hour < 12) return `Good morning${name}`;
    if (hour < 17) return `Good afternoon${name}`;
    return `Good evening${name}`;
  }, [profile]);

  const holidayToday = useMemo(() => getIndianHoliday(date), [date]);

  if (dailyQuery.isLoading && !dailyQuery.data) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  const routines = dailyQuery.data?.routines ?? [];
  const completedCount = routines.filter((r) => completed[r.id]).length;

  return (
    <Page>
      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dailyQuery.isRefetching}
            onRefresh={() => dailyQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Header */}
        <View style={local.header}>
          <View style={local.headerTextWrap}>
            <Text style={[ui.eyebrow, { color: colors.primary, marginBottom: 2 }]}>
              {isToday ? greeting : 'Looking back'}
            </Text>
            <Text style={[local.date, { color: colors.foreground }]}>{displayDate(date)}</Text>
            {holidayToday ? (
              <View style={[local.holidayHeaderBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={local.holidayEmoji}>{holidayToday.emoji}</Text>
                <Text style={[local.holidayText, { color: colors.foreground }]}>
                  {holidayToday.name} · {holidayToday.type} Holiday
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Date Navigation Bar */}
        <View style={local.dateNav}>
          <IconButton
            icon="chevron-left"
            label="Previous day"
            onPress={() => changeDate(shiftDays(date, -1))}
          />
          <IconButton
            icon="calendar"
            label="Live Indian calendar with holidays"
            onPress={() => setShowDatePicker(true)}
            tint={colors.primary}
          />
          <Button
            title={isToday ? 'Today' : 'Back to today'}
            onPress={() => changeDate(iso(new Date()))}
            secondary
          />
          <IconButton
            icon="chevron-right"
            label="Next day"
            onPress={() => changeDate(shiftDays(date, 1))}
          />
        </View>

        {/* Live Indian Calendar Modal */}
        <IndiaCalendarModal
          visible={showDatePicker}
          selectedDate={date}
          onSelectDate={changeDate}
          onClose={() => setShowDatePicker(false)}
        />

        {/* 1. Daily Journal Card */}
        <Card>
          <SectionTitle eyebrow="A few lines" title="What’s on your mind?" />
          <Field
            value={journalText}
            onChangeText={(value) => {
              dirty.current = true;
              setJournalText(value);
            }}
            placeholder="Let the day land here…"
            multiline
          />
          <View style={local.saveRow}>
            <Text
              style={[
                ui.muted,
                { color: saved ? colors.primary : colors.mutedForeground },
              ]}
            >
              {saved
                ? 'Saved just now'
                : saveMutation.isPending
                ? 'Saving changes…'
                : journalText.trim()
                ? `${journalText.trim().split(/\s+/).filter(Boolean).length} ${
                    journalText.trim().split(/\s+/).filter(Boolean).length === 1 ? 'word' : 'words'
                  } · Private to you`
                : 'Private to you'}
            </Text>
            <Button
              title={saveMutation.isPending ? 'Saving…' : 'Save entry'}
              onPress={save}
              disabled={saveMutation.isPending}
            />
          </View>
        </Card>

        {/* 2. Mood Check-in Card */}
        <Card>
          <SectionTitle eyebrow="A small signal" title="How did today feel?" />
          <View style={local.moods}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Pressable
                key={rating}
                accessibilityLabel={`Mood ${rating} of 5`}
                onPress={() => {
                  dirty.current = true;
                  setMoodRating(rating);
                  Haptics.selectionAsync().catch(() => {});
                }}
                style={local.moodItem}
              >
                <View
                  style={[
                    local.moodCircle,
                    {
                      backgroundColor: moodRating === rating ? colors.primary : colors.secondary,
                      borderColor: moodRating === rating ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: moodRating === rating ? colors.primaryForeground : colors.foreground,
                      fontWeight: '700',
                    }}
                  >
                    {rating}
                  </Text>
                </View>
                <Text style={[local.moodLabel, { color: colors.mutedForeground }]}>
                  {['low', 'soft', 'steady', 'bright', 'full'][rating - 1]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* 3. Top Priorities */}
        <Card>
          <SectionTitle eyebrow="Keep close" title="Top priorities" />
          {priorities.map((priority, index) => (
            <View key={index} style={local.priorityRow}>
              <Text style={[local.priorityNumber, { color: colors.primary }]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Field
                value={priority}
                onChangeText={(value) => {
                  dirty.current = true;
                  setPriorities((current) => current.map((item, i) => (i === index ? value : item)));
                }}
                placeholder={index === 0 ? 'The one thing that matters' : 'Another intention'}
              />
            </View>
          ))}
        </Card>

        {/* 4. Routine Habits with Inline Add Option */}
        <Card>
          <SectionTitle
            eyebrow="Your rhythm"
            title="Today’s routines"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[ui.muted, { color: colors.primary, fontWeight: '700' }]}>
                  {completedCount}/{routines.length}
                </Text>
                <Pressable
                  onPress={() => setIsAddingRoutine((prev) => !prev)}
                  style={({ pressed }) => [
                    local.addRoutineBadge,
                    {
                      backgroundColor: isAddingRoutine ? colors.primary : colors.secondary,
                      borderColor: colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                  accessibilityLabel="Add new routine"
                >
                  <Feather
                    name={isAddingRoutine ? 'x' : 'plus'}
                    size={13}
                    color={isAddingRoutine ? colors.primaryForeground : colors.primary}
                  />
                  <Text
                    style={[
                      local.addRoutineBadgeText,
                      { color: isAddingRoutine ? colors.primaryForeground : colors.primary },
                    ]}
                  >
                    {isAddingRoutine ? 'Close' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            }
          />

          {/* Inline Add Input Box */}
          {isAddingRoutine && (
            <View style={[local.inlineAddBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                value={newRoutineName}
                onChangeText={setNewRoutineName}
                placeholder="New routine name (e.g., Gym, Read 20 mins)…"
                placeholderTextColor={colors.mutedForeground}
                style={[local.inlineAddInput, { color: colors.foreground }]}
                onSubmitEditing={handleAddRoutine}
                returnKeyType="done"
                autoFocus
              />
              <Pressable
                onPress={handleAddRoutine}
                disabled={!newRoutineName.trim() || addRoutineMutation.isPending}
                style={({ pressed }) => [
                  local.inlineAddBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: !newRoutineName.trim() ? 0.45 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Feather name="check" size={14} color={colors.primaryForeground} />
                <Text style={[local.inlineAddBtnText, { color: colors.primaryForeground }]}>
                  {addRoutineMutation.isPending ? 'Adding…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          )}

          {routines.length === 0 ? (
            <View style={local.emptyRow}>
              <Feather name="sunrise" color={colors.primary} size={21} />
              <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                No rituals yet. Tap Add above to create your first!
              </Text>
            </View>
          ) : (
            routines.map((item) => (
              <RoutineRow
                key={item.id}
                name={item.name}
                done={!!completed[item.id]}
                onPress={() => toggleRoutine(item.id)}
                colors={colors}
              />
            ))
          )}

          {!isAddingRoutine && (
            <Pressable
              onPress={() => setIsAddingRoutine(true)}
              style={({ pressed }) => [
                local.addRoutineRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={[local.addRoutineRowText, { color: colors.primary }]}>
                + Add a new routine habit
              </Text>
            </Pressable>
          )}
        </Card>

        {/* 5. Previous Entry Snippet */}
        {dailyQuery.data?.previousEntrySnippet ? (
          <Card style={{ backgroundColor: colors.secondary }}>
            <Text style={[ui.eyebrow, { color: colors.primary }]}>From the last page</Text>
            <Text style={[local.snippet, { color: colors.secondaryForeground }]}>
              “{dailyQuery.data.previousEntrySnippet}”
            </Text>
            <Pressable onPress={() => changeDate(shiftDays(date, -1))}>
              <Text style={[ui.muted, { color: colors.primary, marginTop: 10, fontWeight: '600' }]}>
                View yesterday’s page →
              </Text>
            </Pressable>
          </Card>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

function RoutineRow({
  name,
  done,
  onPress,
  colors,
}: {
  name: string;
  done: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        local.routineRow,
        { opacity: pressed ? 0.75 : 1 },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
    >
      <View
        style={[
          local.routineLine,
          { backgroundColor: done ? colors.primary : colors.border },
        ]}
      />
      <Text
        style={[
          local.routineName,
          {
            color: done ? colors.mutedForeground : colors.foreground,
            textDecorationLine: done ? 'line-through' : 'none',
          },
        ]}
      >
        {name}
      </Text>
      <View
        style={[
          local.habitCheckCircle,
          {
            backgroundColor: done ? colors.primary : 'transparent',
            borderColor: done ? colors.primary : colors.border,
          },
        ]}
      >
        {done && <Feather name="check" size={13} color={colors.primaryForeground} />}
      </View>
    </Pressable>
  );
}

const local = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTextWrap: {
    flex: 1,
  },
  date: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 27,
    marginTop: 3,
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  moods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  moodItem: {
    alignItems: 'center',
    gap: 6,
  },
  moodCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  moodLabel: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityNumber: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '700',
    width: 20,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    gap: 12,
  },
  routineLine: {
    width: 4,
    height: 27,
    borderRadius: 3,
  },
  routineName: {
    fontFamily: 'Amazon Ember Display',
    flex: 1,
    fontSize: 16,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  snippet: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 18,
    lineHeight: 27,
    marginTop: 7,
  },
  holidayHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  holidayEmoji: {
    fontSize: 14,
  },
  holidayText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '600',
  },
  addRoutineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  addRoutineBadgeText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineAddBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    gap: 8,
  },
  inlineAddInput: {
    fontFamily: 'Amazon Ember Display',
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  inlineAddBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '700',
  },
  addRoutineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  addRoutineRowText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    fontWeight: '600',
  },
  habitCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});