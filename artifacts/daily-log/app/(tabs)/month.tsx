import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Card, IconButton, LoadingState, Page, SectionTitle, styles as ui } from '@/components/AppUI';
import { monthLabel } from '@/lib/date';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMonthSummary } from '@/lib/dataService';

export default function MonthScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const monthQuery = useQuery({
    queryKey: ['month-summary', year, month, user?.id ?? 'user'],
    queryFn: () => fetchMonthSummary(year, month, user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const changeMonth = (delta: number) => {
    const nextDate = new Date(year, month - 1 + delta, 1);
    setYear(nextDate.getFullYear());
    setMonth(nextDate.getMonth() + 1);
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const leading = firstDay === 0 ? 6 : firstDay - 1;

  const dayMap = useMemo(
    () => new Map((monthQuery.data?.days ?? []).map((day) => [Number(day.date.slice(-2)), day])),
    [monthQuery.data?.days]
  );

  const cells = Array.from(
    { length: leading + new Date(year, month, 0).getDate() },
    (_, index) => (index < leading ? null : index - leading + 1)
  );

  if (monthQuery.isLoading && !monthQuery.data) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  const stats = monthQuery.data?.stats ?? {
    averageMood: null,
    averageRoutineCompletion: 0,
    currentStreak: 0,
    mostProductiveDay: 'Wednesday',
  };

  return (
    <Page>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={monthQuery.isRefetching}
            onRefresh={() => monthQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <SectionTitle
          eyebrow="The long view"
          title="Month"
          right={<Feather name="grid" color={colors.primary} size={22} />}
        />

        {/* Month selector header */}
        <View style={local.nav}>
          <IconButton
            icon="chevron-left"
            label="Previous month"
            onPress={() => changeMonth(-1)}
          />
          <Text style={[local.monthTitle, { color: colors.foreground }]}>
            {monthLabel(year, month)}
          </Text>
          <IconButton
            icon="chevron-right"
            label="Next month"
            onPress={() => changeMonth(1)}
          />
        </View>

        {/* Calendar Grid */}
        <Card style={{ padding: 12 }}>
          <View style={local.weekdays}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((name, index) => (
              <Text key={`${name}-${index}`} style={[local.weekday, { color: colors.mutedForeground }]}>
                {name}
              </Text>
            ))}
          </View>
          <View style={local.grid}>
            {cells.map((number, index) => {
              const day = number ? dayMap.get(number) : undefined;
              return (
                <View key={index} style={local.cell}>
                  {number ? (
                    <Pressable
                      accessibilityLabel={`Open ${number}`}
                      onPress={() =>
                        router.push(
                          `/?date=${day?.date ?? `${year}-${String(month).padStart(2, '0')}-${String(number).padStart(2, '0')}`}`
                        )
                      }
                    >
                      <View
                        style={[
                          local.dayDot,
                          {
                            backgroundColor: day?.hasEntry ? colors.primary : colors.muted,
                            borderColor: day?.moodRating ? colors.accent : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            local.dayNumber,
                            { color: day?.hasEntry ? colors.primaryForeground : colors.foreground },
                          ]}
                        >
                          {number}
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                  {day && day.routineCompletionPercent > 0 ? (
                    <View style={[local.miniBar, { backgroundColor: colors.accent }]}>
                      <View
                        style={[
                          local.miniFill,
                          { width: `${day.routineCompletionPercent}%`, backgroundColor: colors.primary },
                        ]}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Monthly Metrics */}
        <SectionTitle eyebrow="Patterns, not pressure" title="Your month at a glance" />
        <View style={local.statGrid}>
          <Stat
            icon="heart"
            label="Average mood"
            value={stats.averageMood !== null ? `${stats.averageMood.toFixed(1)}/5` : '—'}
            colors={colors}
          />
          <Stat
            icon="check-circle"
            label="Routine rhythm"
            value={`${Math.round(stats.averageRoutineCompletion)}%`}
            colors={colors}
          />
          <Stat
            icon="zap"
            label="Current streak"
            value={`${stats.currentStreak} days`}
            colors={colors}
          />
        </View>

        <Card style={{ backgroundColor: colors.secondary, marginTop: 12 }}>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>A small observation</Text>
          <Text style={[local.observation, { color: colors.secondaryForeground }]}>
            Your most consistent rhythm is on {stats.mostProductiveDay || 'still being discovered'}.
          </Text>
        </Card>
      </ScrollView>
    </Page>
  );
}

function Stat({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Card style={local.stat}>
      <Feather name={icon} size={19} color={colors.primary} />
      <Text style={[local.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[ui.muted, { color: colors.mutedForeground }]}>{label}</Text>
    </Card>
  );
}

const local = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.285%',
    alignItems: 'center',
    minHeight: 55,
    paddingTop: 3,
    gap: 6,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  miniBar: {
    width: 27,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniFill: {
    height: 3,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  stat: {
    flex: 1,
    padding: 12,
    minHeight: 117,
    marginBottom: 0,
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  observation: {
    fontFamily: 'Georgia',
    fontSize: 17,
    lineHeight: 25,
    marginTop: 6,
  },
});