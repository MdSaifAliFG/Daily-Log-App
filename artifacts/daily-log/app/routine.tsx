import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCreateRoutineItem, useDeleteRoutineItem, useListRoutineItems, useReorderRoutineItems, useUpdateRoutineItem, getListRoutineItemsQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { Button, Card, ErrorState, Field, IconButton, LoadingState, Page, styles as ui } from '@/components/AppUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export default function RoutineScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useListRoutineItems();
  const create = useCreateRoutineItem();
  const update = useUpdateRoutineItem();
  const remove = useDeleteRoutineItem();
  const reorder = useReorderRoutineItems();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Record<number, string>>({});
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListRoutineItemsQueryKey() });

  if (query.isLoading) return <Page><LoadingState /></Page>;
  if (query.isError || !query.data) return <Page><ErrorState onRetry={() => query.refetch()} /></Page>;
  const items = [...query.data].sort((a, b) => a.sortOrder - b.sortOrder);
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({ data: { name: trimmed } }, { onSuccess: () => { setName(''); invalidate(); } });
  };
  const rename = (id: number) => {
    const value = editing[id]?.trim();
    if (!value) return;
    update.mutate({ id, data: { name: value } }, { onSuccess: invalidate });
  };
  const deactivate = (id: number, itemName: string) => Alert.alert('Pause this ritual?', `${itemName} will stay in your history but stop appearing on new days.`, [{ text: 'Keep it', style: 'cancel' }, { text: 'Pause', style: 'destructive', onPress: () => remove.mutate({ id }, { onSuccess: invalidate }) }]);
  const toggleActive = (id: number, item: { name: string; isActive: boolean }) => {
    if (item.isActive) {
      deactivate(id, item.name);
      return;
    }
    update.mutate({ id, data: { isActive: true } }, { onSuccess: invalidate });
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({ data: { ids: next.map((item) => item.id) } }, { onSuccess: invalidate });
  };

  return <Page>
    <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
      <View style={local.header}><IconButton icon="x" label="Close routine settings" onPress={() => router.back()} /><View style={local.headerCopy}><Text style={[ui.eyebrow, { color: colors.primary }]}>Your daily anchors</Text><Text style={[local.title, { color: colors.foreground }]}>Routines</Text></View><View style={{ width: 46 }} /></View>
      <Text style={[ui.muted, { color: colors.mutedForeground, marginBottom: 18 }]}>Keep the list small enough to feel like care, not homework.</Text>
      <Card>
        <Text style={[ui.eyebrow, { color: colors.primary }]}>Add a ritual</Text>
        <View style={local.addRow}><View style={ui.flex}><Field value={name} onChangeText={setName} placeholder="e.g. Stretch for five minutes" /></View><IconButton icon="plus" label="Add routine item" onPress={add} tint={colors.primary} /></View>
        {create.isError ? <Text style={[ui.muted, { color: colors.destructive }]}>Couldn’t add that one. Try again.</Text> : null}
      </Card>
      <View style={local.listHeading}><Text style={[ui.eyebrow, { color: colors.primary }]}>In order</Text><Text style={[ui.muted, { color: colors.mutedForeground }]}>{items.filter((item) => item.isActive).length} active</Text></View>
       {items.length === 0 ? <Card><View style={local.empty}><Feather name="list" size={25} color={colors.primary} /><Text style={[local.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text><Text style={[ui.muted, { color: colors.mutedForeground, textAlign: 'center' }]}>Start with one small action you’d like to return to.</Text></View></Card> : items.map((item, index) => <Card key={item.id} style={[local.item, !item.isActive && { opacity: 0.55 }]}><View style={local.itemTop}><View style={[local.grip, { backgroundColor: colors.secondary }]}><Feather name="menu" size={18} color={colors.mutedForeground} /></View><View style={ui.flex}><Text style={[local.itemName, { color: colors.foreground }]}>{item.name}</Text><Text style={[ui.muted, { color: item.isActive ? colors.primary : colors.mutedForeground }]}>{item.isActive ? 'Appears on each new day' : 'Paused'}</Text></View><View style={local.move}><IconButton icon="chevron-up" label={`Move ${item.name} up`} onPress={() => move(index, -1)} tint={index === 0 ? colors.border : colors.foreground} /><IconButton icon="chevron-down" label={`Move ${item.name} down`} onPress={() => move(index, 1)} tint={index === items.length - 1 ? colors.border : colors.foreground} /></View></View><View style={[local.renameRow, { borderTopColor: colors.border }]}><View style={ui.flex}><Field value={editing[item.id] ?? item.name} onChangeText={(value) => setEditing((current) => ({ ...current, [item.id]: value }))} placeholder="Routine name" /></View><IconButton icon="check" label={`Save ${item.name}`} onPress={() => rename(item.id)} tint={colors.primary} /><IconButton icon={item.isActive ? 'pause-circle' : 'play-circle'} label={item.isActive ? `Pause ${item.name}` : `Resume ${item.name}`} onPress={() => toggleActive(item.id, item)} tint={item.isActive ? colors.destructive : colors.primary} /></View></Card>)}
     </KeyboardAwareScrollViewCompat>
  </Page>;
}

const local = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerCopy: { alignItems: 'center' },
  title: { fontFamily: 'Georgia', fontSize: 29, marginTop: 3 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 5 },
  item: { padding: 14 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grip: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  move: { flexDirection: 'row', gap: 3 },
  renameRow: { borderTopWidth: 1, borderTopColor: 'rgba(120,120,100,0.14)', marginTop: 14, paddingTop: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 9 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
});