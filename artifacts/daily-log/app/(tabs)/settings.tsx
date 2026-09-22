import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Card, IconButton, Page, SectionTitle, styles as ui } from '@/components/AppUI';
import { useAppearance } from '@/contexts/AppearanceContext';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const systemScheme = useColorScheme();
  const { mode, setMode } = useAppearance();
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  return <Page>
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionTitle eyebrow="Make it yours" title="Settings" right={<Feather name="sliders" color={colors.primary} size={22} />} />
      <Card>
        <Text style={[ui.eyebrow, { color: colors.primary }]}>Your rhythm</Text>
        <PressRow icon="list" title="Routine items" detail="Add, rename, or pause daily rituals" onPress={() => router.push('/routine')} colors={colors} />
      </Card>
      <Card>
        <Text style={[ui.eyebrow, { color: colors.primary }]}>Appearance</Text>
        <View style={local.appearance}><View style={[local.appearanceIcon, { backgroundColor: colors.secondary }]}><Feather name="moon" size={18} color={colors.primary} /></View><View style={ui.flex}><Text style={[local.rowTitle, { color: colors.foreground }]}>Dark mode</Text><Text style={[ui.muted, { color: colors.mutedForeground }]}>{mode === 'system' ? 'Following your phone setting' : 'Saved on this device'}</Text></View><Switch value={isDark} onValueChange={(value) => setMode(value ? 'dark' : 'light')} trackColor={{ false: colors.muted, true: colors.primary }} thumbColor={colors.card} /></View>
        <View style={[local.swatchRow, { borderTopColor: colors.border }]}><View style={[local.swatch, { backgroundColor: colors.background, borderColor: colors.border }]} /><View style={[local.swatch, { backgroundColor: colors.primary, borderColor: colors.border }]} /><View style={[local.swatch, { backgroundColor: colors.secondary, borderColor: colors.border }]} /><Text style={[ui.muted, { color: colors.mutedForeground }]}>Warm paper, clay, and garden glass</Text></View>
      </Card>
      <Card style={{ backgroundColor: colors.secondary }}>
        <Text style={[local.quote, { color: colors.secondaryForeground }]}>“The page is yours before it is anything else.”</Text>
        <Text style={[ui.muted, { color: colors.mutedForeground, marginTop: 8 }]}>A private place for the ordinary details that make a life.</Text>
      </Card>
      <Text style={[local.version, { color: colors.mutedForeground }]}>Daily Log · made for quieter mornings</Text>
    </ScrollView>
  </Page>;
}

function PressRow({ icon, title, detail, onPress, colors }: { icon: keyof typeof Feather.glyphMap; title: string; detail: string; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <View style={local.row}><View style={[local.appearanceIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={18} color={colors.primary} /></View><View style={ui.flex}><Text style={[local.rowTitle, { color: colors.foreground }]}>{title}</Text><Text style={[ui.muted, { color: colors.mutedForeground }]}>{detail}</Text></View><IconButton icon="chevron-right" label={title} onPress={onPress} /></View>;
}

const local = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70 },
  rowTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  appearance: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 74 },
  appearanceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  systemPill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14 },
  pillText: { fontSize: 12, fontWeight: '700' },
  swatchRow: { borderTopWidth: 1, paddingTop: 14, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
  quote: { fontFamily: 'Georgia', fontSize: 20, lineHeight: 28 },
  version: { textAlign: 'center', fontSize: 12, marginVertical: 15 },
});