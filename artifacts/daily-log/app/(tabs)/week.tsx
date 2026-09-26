import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useGetWeek, useUpsertWeeklyReflection, getGetWeekQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { Button, Card, ErrorState, Field, IconButton, LoadingState, Page, SectionTitle, styles as ui } from '@/components/AppUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { iso, monthLabel, shortDate, shiftDays, startOfWeek } from '@/lib/date';

export default function WeekScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(startOfWeek(iso(new Date())));
  const query = useGetWeek(weekStart, { query: { queryKey: getGetWeekQueryKey(weekStart) } });
  const saveReflection = useUpsertWeeklyReflection();
  const [wentWell, setWentWell] = useState('');
  const [improve, setImprove] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      setWentWell(query.data.reflection?.wentWell ?? '');
      setImprove(query.data.reflection?.improve ?? '');
    }
  }, [query.data]);

  const rangeLabel = useMemo(() => {
    const end = shiftDays(weekStart, 6);
    return `${shortDate(weekStart)} – ${shortDate(end)}`;
  }, [weekStart]);

  const save = () => saveReflection.mutate({ weekStartDate: weekStart, data: { wentWell, improve } }, {
    onSuccess: (reflection) => {
      queryClient.setQueryData(getGetWeekQueryKey(weekStart), (old) => old ? { ...old, reflection } : old);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    },
  });

  if (query.isLoading) return <Page><LoadingState /></Page>;
  if (query.isError || !query.data) return <Page><ErrorState onRetry={() => query.refetch()} /></Page>;
  const average = query.data.days.length ? Math.round(query.data.days.reduce((sum, day) => sum + day.routineCompletionPercent, 0) / query.data.days.length) : 0;

  return <Page>
     <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
      <SectionTitle eyebrow="A wider view" title="This week" right={<Feather name="sun" color={colors.primary} size={22} />} />
      <View style={local.nav}><IconButton icon="chevron-left" label="Previous week" onPress={() => setWeekStart((value) => shiftDays(value, -7))} /><View style={local.range}><Text style={[local.rangeText, { color: colors.foreground }]}>{rangeLabel}</Text><Text style={[ui.muted, { color: colors.mutedForeground }]}>{monthLabel(Number(weekStart.slice(0, 4)), Number(weekStart.slice(5, 7)))} </Text></View><IconButton icon="chevron-right" label="Next week" onPress={() => setWeekStart((value) => shiftDays(value, 7))} /></View>
      <Card style={{ backgroundColor: colors.secondary }}>
        <View style={local.summaryTop}><View><Text style={[ui.eyebrow, { color: colors.primary }]}>The week in one line</Text><Text style={[local.bigNumber, { color: colors.secondaryForeground }]}>{average}%</Text><Text style={[ui.muted, { color: colors.mutedForeground }]}>routine rhythm</Text></View><View style={[local.arc, { borderColor: colors.primary }]}><Feather name="activity" color={colors.primary} size={26} /></View></View>
      </Card>
      <SectionTitle eyebrow="Monday to Sunday" title="Your days" />
      {query.data.days.length === 0 ? <View style={local.empty}><Feather name="calendar" color={colors.primary} size={25} /><Text style={[ui.muted, { color: colors.mutedForeground }]}>No days recorded yet. A blank week is still a beginning.</Text></View> : query.data.days.map((day) => <DayCard key={day.date} day={day} colors={colors} onPress={() => router.push(`/?date=${day.date}`)} />)}
      <Card>
        <SectionTitle eyebrow="Look back gently" title="Weekly reflection" />
        <Text style={[local.prompt, { color: colors.foreground }]}>What gave you energy?</Text>
        <Field value={wentWell} onChangeText={setWentWell} placeholder="A moment worth carrying forward…" multiline />
        <Text style={[local.prompt, { color: colors.foreground }]}>What would you like to adjust?</Text>
        <Field value={improve} onChangeText={setImprove} placeholder="One kind change for next week…" multiline />
        <View style={local.saveRow}><Text style={[ui.muted, { color: saved ? colors.primary : colors.mutedForeground }]}>{saved ? 'Reflection saved' : 'A note to your future self'}</Text><Button title={saveReflection.isPending ? 'Saving…' : 'Save reflection'} onPress={save} disabled={saveReflection.isPending} /></View>
      </Card>
     </KeyboardAwareScrollViewCompat>
  </Page>;
}

function DayCard({ day, colors, onPress }: { day: { date: string; dayName: string; routineCompletionPercent: number; moodRating: number | null; priorityCount: number; journalSnippet: string }; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return <Pressable onPress={onPress}><Card style={local.dayCard}><View style={local.dayHeading}><View><Text style={[local.dayName, { color: colors.foreground }]}>{day.dayName}</Text><Text style={[ui.muted, { color: colors.mutedForeground }]}>{shortDate(day.date)}</Text></View><Text style={[local.percent, { color: colors.primary }]}>{day.routineCompletionPercent}%</Text></View><View style={[local.bar, { backgroundColor: colors.muted }]}><View style={[local.fill, { width: `${Math.min(100, day.routineCompletionPercent)}%`, backgroundColor: colors.primary }]} /></View><View style={local.meta}><Text style={[ui.muted, { color: colors.mutedForeground }]}>{day.moodRating ? `Mood ${day.moodRating}/5` : 'No mood'} · {day.priorityCount} priorities</Text>{day.journalSnippet ? <Text numberOfLines={1} style={[ui.muted, { color: colors.foreground, flex: 1, textAlign: 'right' }]}>{day.journalSnippet}</Text> : null}</View></Card></Pressable>;
}

const local = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  range: { alignItems: 'center', gap: 3 },
  rangeText: { fontSize: 16, fontWeight: '700' },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigNumber: { fontFamily: 'Georgia', fontSize: 42, marginTop: 4 },
  arc: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dayCard: { padding: 15 },
  dayHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  percent: { fontSize: 18, fontWeight: '700' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginVertical: 13 },
  fill: { height: 6, borderRadius: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prompt: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 3 },
  saveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  empty: { paddingVertical: 35, alignItems: 'center', gap: 10 },
});