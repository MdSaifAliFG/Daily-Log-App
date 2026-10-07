import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
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
import { monthLabel, shortDate, shiftDays, startOfWeek, iso } from '@/lib/date';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchWeekSummary,
  saveWeekReflection,
  WeekDaySummary,
} from '@/lib/dataService';

export default function WeekScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [weekStart, setWeekStart] = useState(startOfWeek(iso(new Date())));

  const weekQuery = useQuery({
    queryKey: ['week-summary', weekStart, user?.id ?? 'guest'],
    queryFn: () => fetchWeekSummary(weekStart, user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const [wentWell, setWentWell] = useState('');
  const [improve, setImprove] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (weekQuery.data) {
      setWentWell(weekQuery.data.reflection?.wentWell ?? '');
      setImprove(weekQuery.data.reflection?.improve ?? '');
    }
  }, [weekQuery.data]);

  const rangeLabel = useMemo(() => {
    const end = shiftDays(weekStart, 6);
    return `${shortDate(weekStart)} – ${shortDate(end)}`;
  }, [weekStart]);

  const saveMutation = useMutation({
    mutationFn: () => saveWeekReflection(weekStart, wentWell, improve, user?.id),
    onSuccess: (reflection) => {
      queryClient.setQueryData(
        ['week-summary', weekStart, user?.id ?? 'guest'],
        (old: any) => (old ? { ...old, reflection } : old)
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (weekQuery.isLoading && !weekQuery.data) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  const days = weekQuery.data?.days ?? [];
  const average = weekQuery.data?.averageCompletion ?? 0;

  return (
    <Page>
      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={weekQuery.isRefetching}
            onRefresh={() => weekQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <SectionTitle
          eyebrow="A wider view"
          title="This week"
          right={<Feather name="sun" color={colors.primary} size={22} />}
        />

        {/* Week navigation */}
        <View style={local.nav}>
          <IconButton
            icon="chevron-left"
            label="Previous week"
            onPress={() => setWeekStart((value) => shiftDays(value, -7))}
          />
          <View style={local.range}>
            <Text style={[local.rangeText, { color: colors.foreground }]}>{rangeLabel}</Text>
            <Text style={[ui.muted, { color: colors.mutedForeground }]}>
              {monthLabel(Number(weekStart.slice(0, 4)), Number(weekStart.slice(5, 7)))}
            </Text>
          </View>
          <IconButton
            icon="chevron-right"
            label="Next week"
            onPress={() => setWeekStart((value) => shiftDays(value, 7))}
          />
        </View>

        {/* Summary Card */}
        <Card style={{ backgroundColor: colors.secondary }}>
          <View style={local.summaryTop}>
            <View>
              <Text style={[ui.eyebrow, { color: colors.primary }]}>The week in one line</Text>
              <Text style={[local.bigNumber, { color: colors.secondaryForeground }]}>{average}%</Text>
              <Text style={[ui.muted, { color: colors.mutedForeground }]}>routine rhythm</Text>
            </View>
            <View style={[local.arc, { borderColor: colors.primary }]}>
              <Feather name="activity" color={colors.primary} size={26} />
            </View>
          </View>
        </Card>

        {/* Days List */}
        <SectionTitle eyebrow="Monday to Sunday" title="Your days" />
        {days.length === 0 ? (
          <View style={local.empty}>
            <Feather name="calendar" color={colors.primary} size={25} />
            <Text style={[ui.muted, { color: colors.mutedForeground }]}>
              No days recorded yet. A blank week is still a beginning.
            </Text>
          </View>
        ) : (
          days.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              colors={colors}
              onPress={() => router.push(`/?date=${day.date}`)}
            />
          ))
        )}

        {/* Weekly Reflection */}
        <Card>
          <SectionTitle eyebrow="Look back gently" title="Weekly reflection" />
          <Text style={[local.prompt, { color: colors.foreground }]}>What gave you energy?</Text>
          <Field
            value={wentWell}
            onChangeText={setWentWell}
            placeholder="A moment worth carrying forward…"
            multiline
          />

          <Text style={[local.prompt, { color: colors.foreground }]}>What would you like to adjust?</Text>
          <Field
            value={improve}
            onChangeText={setImprove}
            placeholder="One kind change for next week…"
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
                ? 'Reflection saved'
                : saveMutation.isPending
                ? 'Saving…'
                : 'A note to your future self'}
            </Text>
            <Button
              title={saveMutation.isPending ? 'Saving…' : 'Save reflection'}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            />
          </View>
        </Card>
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

function DayCard({
  day,
  colors,
  onPress,
}: {
  day: WeekDaySummary;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={local.dayCard}>
        <View style={local.dayHeading}>
          <View>
            <Text style={[local.dayName, { color: colors.foreground }]}>{day.dayName}</Text>
            <Text style={[ui.muted, { color: colors.mutedForeground }]}>{shortDate(day.date)}</Text>
          </View>
          <Text style={[local.percent, { color: colors.primary }]}>{day.completionPercent}%</Text>
        </View>

        <View style={[local.bar, { backgroundColor: colors.muted }]}>
          <View
            style={[
              local.fill,
              {
                width: `${Math.min(100, day.completionPercent)}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <View style={local.meta}>
          <Text style={[ui.muted, { color: colors.mutedForeground }]}>
            {day.moodRating ? `Mood ${day.moodRating}/5` : 'No mood'} · {day.completedCount}/{day.totalCount} routines
          </Text>
          {day.hasEntry && (
            <View style={[local.entryPill, { backgroundColor: colors.secondary }]}>
              <Feather name="edit-3" size={11} color={colors.primary} />
              <Text style={[local.entryPillText, { color: colors.secondaryForeground }]}>Written</Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const local = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  range: {
    alignItems: 'center',
    gap: 3,
  },
  rangeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bigNumber: {
    fontFamily: 'Georgia',
    fontSize: 42,
    marginTop: 4,
  },
  arc: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: {
    padding: 15,
  },
  dayHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  percent: {
    fontSize: 18,
    fontWeight: '700',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 13,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  entryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  prompt: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 3,
  },
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  empty: {
    paddingVertical: 35,
    alignItems: 'center',
    gap: 10,
  },
});