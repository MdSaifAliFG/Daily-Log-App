import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetDaily, useSetRoutineCompletion, useUpsertEntry, getGetDailyQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { Button, Card, ErrorState, Field, IconButton, LoadingState, Page, SectionTitle, styles as ui } from '@/components/AppUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { displayDate, iso, parseIso, shiftDays } from '@/lib/date';

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ date?: string }>();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(iso(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const params = useMemo(() => ({ date }), [date]);
  const daily = useGetDaily(params, {
    query: {
      queryKey: getGetDailyQueryKey(params),
      retry: 2,
      retryDelay: (attempt) => Math.min(800 * (attempt + 1), 2500),
      refetchOnMount: 'always',
    },
  });
  const saveEntry = useUpsertEntry();
  const setCompletion = useSetRoutineCompletion();
  const [journalText, setJournalText] = useState('');
  const [moodRating, setMoodRating] = useState<number | null>(null);
  const [priorities, setPriorities] = useState<string[]>(['', '', '']);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);
  const loadedDate = useRef<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (routeParams.date && /^\d{4}-\d{2}-\d{2}$/.test(routeParams.date)) setDate(routeParams.date);
  }, [routeParams.date]);

  useEffect(() => {
    if (daily.data) {
      dirty.current = false;
      setJournalText(daily.data.entry?.journalText ?? '');
      setMoodRating(daily.data.entry?.moodRating ?? null);
      setPriorities([0, 1, 2].map((index) => daily.data?.entry?.topPriorities[index] ?? ''));
      setCompleted(Object.fromEntries(daily.data.routines.map((item) => [item.id, item.completed])));
      loadedDate.current = date;
    }
  }, [daily.data]);

  const save = () => {
    dirty.current = false;
    saveEntry.mutate({ date, data: { journalText, moodRating, topPriorities: priorities } }, {
      onSuccess: (entry) => {
        queryClient.setQueryData(getGetDailyQueryKey(params), (old) => old ? { ...old, entry } : old);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      },
      onError: () => {
        dirty.current = true;
      },
    });
  };

  const changeDate = (nextDate: string) => {
    if (dirty.current && loadedDate.current === date) {
      save();
    }
    setDate(nextDate);
  };

  useEffect(() => {
    if (loadedDate.current !== date || !daily.data || !dirty.current) return;
    const timeout = setTimeout(() => save(), 1000);
    return () => clearTimeout(timeout);
  }, [journalText, moodRating, priorities, date]);

  const toggleRoutine = (id: number) => {
    const next = !completed[id];
    Haptics.selectionAsync();
    setCompleted((current) => ({ ...current, [id]: next }));
    setCompletion.mutate({ date, routineItemId: id, data: { completed: next } }, {
      onError: () => setCompleted((current) => ({ ...current, [id]: !next })),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDailyQueryKey(params) }),
    });
  };

  if (daily.isLoading) return <Page><LoadingState /></Page>;
  if (daily.isError || !daily.data) return <Page><ErrorState onRetry={() => daily.refetch()} /></Page>;
  const isToday = date === iso(new Date());

  return <Page>
     <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={daily.isRefetching} onRefresh={() => daily.refetch()} tintColor={colors.primary} />}>
      <View style={local.header}>
        <View>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>{isToday ? 'Your quiet corner' : 'Looking back'}</Text>
          <Text style={[local.date, { color: colors.foreground }]}>{displayDate(date)}</Text>
        </View>
        <IconButton icon="settings" label="Open settings" onPress={() => router.push('/settings')} />
      </View>
      <View style={local.dateNav}>
        <IconButton icon="chevron-left" label="Previous day" onPress={() => changeDate(shiftDays(date, -1))} />
        <IconButton icon="calendar" label="Choose a date" onPress={() => setShowDatePicker(true)} tint={colors.primary} />
        <Button title={isToday ? 'Today' : 'Back to today'} onPress={() => changeDate(iso(new Date()))} secondary />
        <IconButton icon="chevron-right" label="Next day" onPress={() => changeDate(shiftDays(date, 1))} />
      </View>
      {showDatePicker && Platform.OS !== 'web' ? <Modal transparent animationType="fade" visible onRequestClose={() => setShowDatePicker(false)}>
        <View style={local.pickerBackdrop}>
          <View style={[local.pickerCard, { backgroundColor: colors.card }]}>
            <Text style={[ui.eyebrow, { color: colors.primary }]}>Choose a day</Text>
            <DateTimePicker value={parseIso(date)} mode="date" display="spinner" onChange={(_, selected) => { if (selected) changeDate(iso(selected)); }} />
            <Button title="Done" onPress={() => setShowDatePicker(false)} />
          </View>
        </View>
      </Modal> : null}

      <Card>
        <SectionTitle eyebrow="A few lines" title="What’s on your mind?" />
        <Field value={journalText} onChangeText={(value) => { dirty.current = true; setJournalText(value); }} placeholder="Let the day land here…" multiline />
        <View style={local.saveRow}>
          <Text style={[ui.muted, { color: saved ? colors.primary : colors.mutedForeground }]}>{saved ? 'Saved just now' : saveEntry.isError ? 'Couldn’t save — try again' : 'Private to you'}</Text>
          <Button title={saveEntry.isPending ? 'Saving…' : 'Save entry'} onPress={save} disabled={saveEntry.isPending} />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="A small signal" title="How did today feel?" />
          <View style={local.moods}>{[1, 2, 3, 4, 5].map((rating) => <Pressable key={rating} accessibilityLabel={`Mood ${rating} of 5`} onPress={() => { dirty.current = true; setMoodRating(rating); Haptics.selectionAsync(); }} style={local.moodItem}>
          <View style={[local.moodCircle, { backgroundColor: moodRating === rating ? colors.primary : colors.secondary, borderColor: moodRating === rating ? colors.primary : colors.border }]}><Text style={{ color: moodRating === rating ? colors.primaryForeground : colors.foreground, fontWeight: '700' }}>{rating}</Text></View>
          <Text style={[local.moodLabel, { color: colors.mutedForeground }]}>{['low', 'soft', 'steady', 'bright', 'full'][rating - 1]}</Text>
        </Pressable>)}</View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Keep close" title="Top priorities" />
        {priorities.map((priority, index) => <View key={index} style={local.priorityRow}>
          <Text style={[local.priorityNumber, { color: colors.primary }]}>{String(index + 1).padStart(2, '0')}</Text>
          <Field value={priority} onChangeText={(value) => { dirty.current = true; setPriorities((current) => current.map((item, i) => i === index ? value : item)); }} placeholder={index === 0 ? 'The one thing that matters' : 'Another intention'} />
        </View>)}
      </Card>

      <Card>
        <SectionTitle eyebrow="Your rhythm" title="Today’s routines" right={<Text style={[ui.muted, { color: colors.primary }]}>{daily.data.routines.filter((item) => completed[item.id]).length}/{daily.data.routines.length}</Text>} />
        {daily.data.routines.length === 0 ? <View style={local.emptyRow}><Feather name="sunrise" color={colors.primary} size={21} /><Text style={[ui.muted, { color: colors.mutedForeground }]}>Add a few rituals in Settings.</Text></View> : daily.data.routines.map((item) => <RoutineRow key={item.id} name={item.name} done={!!completed[item.id]} onPress={() => toggleRoutine(item.id)} colors={colors} />)}
      </Card>

       {daily.data.previousEntrySnippet ? <Card style={{ backgroundColor: colors.secondary }}><Text style={[ui.eyebrow, { color: colors.primary }]}>From the last page</Text><Text style={[local.snippet, { color: colors.secondaryForeground }]}>“{daily.data.previousEntrySnippet}”</Text><Pressable onPress={() => changeDate(shiftDays(date, -1))}><Text style={[ui.muted, { color: colors.primary, marginTop: 10 }]}>View yesterday’s page</Text></Pressable></Card> : null}
     </KeyboardAwareScrollViewCompat>
  </Page>;
}

function RoutineRow({ name, done, onPress, colors }: { name: string; done: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <View style={local.routineRow}><View style={[local.routineLine, { backgroundColor: done ? colors.primary : colors.border }]} /><Text style={[local.routineName, { color: done ? colors.mutedForeground : colors.foreground, textDecorationLine: done ? 'line-through' : 'none' }]}>{name}</Text><IconButton icon={done ? 'check' : 'circle'} label={`${done ? 'Uncheck' : 'Check'} ${name}`} onPress={onPress} tint={done ? colors.primary : colors.mutedForeground} /></View>;
}

const local = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  date: { fontFamily: 'Georgia', fontSize: 27, marginTop: 3 },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  moods: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2 },
  moodItem: { alignItems: 'center', gap: 6, position: 'relative' },
  moodCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  moodLabel: { fontSize: 11 },
  moodTap: { position: 'absolute', width: 48, height: 48, top: -3 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priorityNumber: { fontSize: 12, fontWeight: '700', width: 20 },
  routineRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: 12 },
  routineLine: { width: 4, height: 27, borderRadius: 3 },
  routineName: { flex: 1, fontSize: 16 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  snippet: { fontFamily: 'Georgia', fontSize: 18, lineHeight: 27, marginTop: 7 },
  pickerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,30,25,0.35)', padding: 22 },
  pickerCard: { width: '100%', borderRadius: 22, padding: 20, alignItems: 'center' },
});