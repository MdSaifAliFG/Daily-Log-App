import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Button, Card, Field, IconButton, LoadingState, Page, styles as ui } from '@/components/AppUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/contexts/AuthContext';
import {
  addRoutineItem,
  deleteRoutineItem,
  fetchRoutineItems,
  RoutineItem,
  updateRoutineItem,
} from '@/lib/dataService';

export default function RoutineScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const routineQuery = useQuery({
    queryKey: ['routine-items', user?.id ?? 'user'],
    queryFn: () => fetchRoutineItems(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Record<number, string>>({});

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['routine-items'] });
    queryClient.invalidateQueries({ queryKey: ['daily-log'] });
    queryClient.invalidateQueries({ queryKey: ['week-summary'] });
    queryClient.invalidateQueries({ queryKey: ['month-summary'] });
  };

  const addMutation = useMutation({
    mutationFn: (routineName: string) => addRoutineItem(routineName, user?.id),
    onSuccess: () => {
      setName('');
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: { name?: string; isActive?: boolean } }) =>
      updateRoutineItem(id, updates, user?.id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRoutineItem(id, user?.id),
    onSuccess: invalidate,
  });

  if (routineQuery.isLoading && !routineQuery.data) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  const items = [...(routineQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  const rename = (id: number) => {
    const value = editing[id]?.trim();
    if (!value) return;
    updateMutation.mutate({ id, updates: { name: value } });
  };

  const deactivate = (id: number, itemName: string) => {
    Alert.alert(
      'Pause this ritual?',
      `“${itemName}” will stay in your history but stop appearing on new days.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Pause',
          style: 'destructive',
          onPress: () => updateMutation.mutate({ id, updates: { isActive: false } }),
        },
      ]
    );
  };

  const toggleActive = (id: number, item: RoutineItem) => {
    if (item.isActive) {
      deactivate(id, item.name);
    } else {
      updateMutation.mutate({ id, updates: { isActive: true } });
    }
  };

  return (
    <Page hideHeader>
      <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
        <View style={local.header}>
          <IconButton icon="x" label="Close routine settings" onPress={() => router.back()} />
          <View style={local.headerCopy}>
            <Text style={[ui.eyebrow, { color: colors.primary }]}>Your daily anchors</Text>
            <Text style={[local.title, { color: colors.foreground }]}>Routines</Text>
          </View>
          <View style={{ width: 46 }} />
        </View>

        <Text style={[ui.muted, { color: colors.mutedForeground, marginBottom: 18 }]}>
          Keep the list small enough to feel like care, not homework.
        </Text>

        {/* Add Ritual Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Add a ritual</Text>
          <View style={local.addRow}>
            <View style={ui.flex}>
              <Field
                value={name}
                onChangeText={setName}
                placeholder="e.g. Stretch for five minutes"
              />
            </View>
            <IconButton
              icon="plus"
              label="Add routine item"
              onPress={add}
              tint={colors.primary}
            />
          </View>
          {addMutation.isError && (
            <Text style={[ui.muted, { color: colors.destructive }]}>
              Couldn’t add that one. Try again.
            </Text>
          )}
        </Card>

        {/* Routine list */}
        <View style={local.listHeading}>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>In order</Text>
          <Text style={[ui.muted, { color: colors.mutedForeground }]}>
            {items.filter((item) => item.isActive).length} active
          </Text>
        </View>

        {items.length === 0 ? (
          <Card>
            <View style={local.empty}>
              <Feather name="list" size={25} color={colors.primary} />
              <Text style={[local.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text>
              <Text style={[ui.muted, { color: colors.mutedForeground, textAlign: 'center' }]}>
                Start with one small action you’d like to return to.
              </Text>
            </View>
          </Card>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              style={[local.item, !item.isActive && { opacity: 0.55 }]}
            >
              <View style={local.itemTop}>
                <View style={[local.grip, { backgroundColor: colors.secondary }]}>
                  <Feather name="check" size={18} color={colors.primary} />
                </View>
                <View style={ui.flex}>
                  <Text style={[local.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text
                    style={[
                      ui.muted,
                      { color: item.isActive ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {item.isActive ? 'Appears on each new day' : 'Paused'}
                  </Text>
                </View>
              </View>

              <View style={[local.renameRow, { borderTopColor: colors.border }]}>
                <View style={ui.flex}>
                  <Field
                    value={editing[item.id] ?? item.name}
                    onChangeText={(value) =>
                      setEditing((current) => ({ ...current, [item.id]: value }))
                    }
                    placeholder="Routine name"
                  />
                </View>
                <IconButton
                  icon="check"
                  label={`Save ${item.name}`}
                  onPress={() => rename(item.id)}
                  tint={colors.primary}
                />
                <IconButton
                  icon={item.isActive ? 'pause-circle' : 'play-circle'}
                  label={item.isActive ? `Pause ${item.name}` : `Resume ${item.name}`}
                  onPress={() => toggleActive(item.id, item)}
                  tint={item.isActive ? colors.destructive : colors.primary}
                />
              </View>
            </Card>
          ))
        )}
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}

const local = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerCopy: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 29,
    marginTop: 3,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
  },
  item: {
    padding: 14,
    marginBottom: 12,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  grip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  renameRow: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 9,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});