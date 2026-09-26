import React, { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Page({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.page, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12), paddingBottom: insets.bottom + 92 }]}>{children}</View>;
  return scroll ? <View style={[styles.flex, { backgroundColor: colors.background }]}>{content}</View> : content;
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  const colors = useColors();
  return <View style={styles.sectionTitle}>
    <View style={styles.flex}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
    </View>
    {right}
  </View>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function IconButton({ icon, onPress, label, tint }: { icon: keyof typeof Feather.glyphMap; onPress: () => void; label: string; tint?: string }) {
  const colors = useColors();
  return <Pressable accessibilityLabel={label} testID={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.65 : 1 }]}>
    <Feather name={icon} size={19} color={tint ?? colors.foreground} />
  </Pressable>;
}

export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const colors = useColors();
  return <Pressable testID={`button-${title}`} accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? colors.secondary : colors.primary, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>
    <Text style={[styles.buttonText, { color: secondary ? colors.secondaryForeground : colors.primaryForeground }]}>{title}</Text>
  </Pressable>;
}

export function Field({ value, onChangeText, placeholder, multiline = false }: { value: string; onChangeText: (text: string) => void; placeholder: string; multiline?: boolean }) {
  const colors = useColors();
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.field, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }, multiline && styles.multiline]} />;
}

export function LoadingState() {
  const colors = useColors();
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>Opening your page…</Text></View>;
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return <View style={styles.empty}><Feather name="wifi-off" size={25} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn’t reach your log</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>Your words are safe. Check your connection and try again.</Text><Button title="Try again" onPress={onRetry} secondary /></View>;
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 },
  title: { fontFamily: 'Georgia', fontSize: 29, lineHeight: 34 },
  card: { borderRadius: 20, borderWidth: 1, padding: 17, marginBottom: 14 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 46, paddingHorizontal: 20, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  field: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, marginBottom: 10 },
  multiline: { minHeight: 150, paddingTop: 14, lineHeight: 23 },
  muted: { fontSize: 14, lineHeight: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
});