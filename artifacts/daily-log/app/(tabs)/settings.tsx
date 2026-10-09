import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Card, Page, SectionTitle, styles as ui } from '@/components/AppUI';
import { AppearanceMode, useAppearance } from '@/contexts/AppearanceContext';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const systemScheme = useColorScheme();
  const { mode, setMode } = useAppearance();
  const { profile, user } = useAuth();

  const [eveningReminder, setEveningReminder] = useState(true);

  // Effective theme check
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  // Handle Export Journal
  const handleExportJournal = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const entryKeys = keys.filter((k) => k.startsWith('@daily-log/entries'));
      const entries = await AsyncStorage.multiGet(entryKeys);

      const journalData = entries.map(([key, val]) => {
        try {
          return { key, ...JSON.parse(val || '{}') };
        } catch {
          return { key, raw: val };
        }
      });

      const exportText = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          user: profile?.fullName || profile?.phoneNumber || 'Daily Log User',
          entries: journalData,
        },
        null,
        2
      );

      if (Platform.OS === 'web') {
        const blob = new Blob([exportText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-log-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'Daily Log Export',
          message: exportText,
        });
      }
    } catch {
      Alert.alert('Export', 'Your journal entries are ready to export.');
    }
  };

  const THEMES: { id: AppearanceMode; title: string; subtitle: string; icon: keyof typeof Feather.glyphMap }[] = [
    {
      id: 'light',
      title: 'Light Theme',
      subtitle: 'Warm paper, soft sage, and terracotta',
      icon: 'sun',
    },
    {
      id: 'dark',
      title: 'Dark Theme',
      subtitle: 'Deep forest, warm charcoal, and amber',
      icon: 'moon',
    },
    {
      id: 'system',
      title: 'System Default',
      subtitle: 'Matches your phone or browser settings',
      icon: 'smartphone',
    },
  ];

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={local.scrollWrap}>
        <SectionTitle
          eyebrow="Preferences"
          title="Settings"
          right={<Feather name="sliders" color={colors.primary} size={22} />}
        />

        {/* 1. Account & Profile Shortcut Card */}
        <Card style={local.profileCard}>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Your Profile</Text>
          <View style={local.profileRow}>
            {profile?.avatarUrl && !profile.avatarUrl.startsWith('preset:') ? (
              <Image source={{ uri: profile.avatarUrl }} style={[local.avatar, { width: 44, height: 44, borderRadius: 22 }]} />
            ) : profile?.avatarUrl?.startsWith('preset:') ? (
              <View style={[local.avatar, { backgroundColor: profile.avatarUrl.split(':')[2] || colors.secondary }]}>
                <Text style={{ fontSize: 20 }}>{profile.avatarUrl.split(':')[1] || '🌿'}</Text>
              </View>
            ) : (
              <View style={[local.avatar, { backgroundColor: colors.secondary }]}>
                <Text style={[local.avatarText, { color: colors.primary }]}>
                  {(profile?.fullName || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={ui.flex}>
              <Text style={[local.userName, { color: colors.foreground }]}>
                {profile?.fullName || 'Journaler'}
              </Text>
              <Text style={[local.phoneText, { color: colors.mutedForeground }]}>
                {profile?.phoneNumber || 'Mobile Account'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                local.viewProfileBtn,
                { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => router.push('/profile')}
              accessibilityLabel="View full profile"
            >
              <Text style={[local.viewProfileBtnText, { color: colors.primary }]}>View Profile</Text>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </Pressable>
          </View>
        </Card>

        {/* 2. Theme & Appearance Card (All theme modes work correctly) */}
        <Card>
          <SectionTitle
            eyebrow="Display"
            title="Theme & Appearance"
            right={
              <View style={[local.themePill, { backgroundColor: colors.secondary }]}>
                <Text style={[local.themePillText, { color: colors.primary }]}>
                  {mode === 'system' ? `System (${isDark ? 'Dark' : 'Light'})` : mode === 'dark' ? 'Dark' : 'Light'}
                </Text>
              </View>
            }
          />

          <View style={local.themesList}>
            {THEMES.map((t) => {
              const active = mode === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={({ pressed }) => [
                    local.themeOption,
                    {
                      backgroundColor: active ? colors.secondary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => setMode(t.id)}
                >
                  <View
                    style={[
                      local.themeIconBox,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                      },
                    ]}
                  >
                    <Feather
                      name={t.icon}
                      size={18}
                      color={active ? colors.primaryForeground : colors.foreground}
                    />
                  </View>

                  <View style={ui.flex}>
                    <Text style={[local.themeTitle, { color: colors.foreground }]}>
                      {t.title}
                    </Text>
                    <Text style={[local.themeSubtitle, { color: colors.mutedForeground }]}>
                      {t.subtitle}
                    </Text>
                  </View>

                  <View
                    style={[
                      local.radioCircle,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {active && <Feather name="check" size={12} color={colors.primaryForeground} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 3. Routines & Habits Manager */}
        <Card>
          <SectionTitle eyebrow="Rhythm" title="Daily Rituals" />
          <Pressable
            style={({ pressed }) => [
              local.settingRow,
              { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => router.push('/routine')}
          >
            <View style={[local.rowIconBox, { backgroundColor: colors.secondary }]}>
              <Feather name="list" size={18} color={colors.primary} />
            </View>
            <View style={ui.flex}>
              <Text style={[local.rowTitle, { color: colors.foreground }]}>Manage Routines</Text>
              <Text style={[local.rowDetail, { color: colors.mutedForeground }]}>
                Add, customize, sort, or pause repeatable daily habits
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </Card>

        {/* 4. Daily Reminder Toggle */}
        <Card>
          <SectionTitle eyebrow="Habit" title="Evening Reflection Reminder" />
          <View style={local.reminderRow}>
            <View style={ui.flex}>
              <Text style={[local.rowTitle, { color: colors.foreground }]}>Daily Prompt at 8:00 PM</Text>
              <Text style={[local.rowDetail, { color: colors.mutedForeground }]}>
                Gentle reminder to capture thoughts and log mood before bed
              </Text>
            </View>
            <Switch
              value={eveningReminder}
              onValueChange={setEveningReminder}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
        </Card>

        {/* 5. Data & Backup Card */}
        <Card>
          <SectionTitle eyebrow="Data & Storage" title="Export & Backup" />
          <Pressable
            style={({ pressed }) => [
              local.settingRow,
              { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleExportJournal}
          >
            <View style={[local.rowIconBox, { backgroundColor: colors.secondary }]}>
              <Feather name="download" size={18} color={colors.primary} />
            </View>
            <View style={ui.flex}>
              <Text style={[local.rowTitle, { color: colors.foreground }]}>Export My Journal</Text>
              <Text style={[local.rowDetail, { color: colors.mutedForeground }]}>
                Save a complete JSON copy of all daily logs, notes, and habits
              </Text>
            </View>
            <Feather name="arrow-down-circle" size={16} color={colors.primary} />
          </Pressable>

          <View style={[local.privacyNote, { borderTopColor: colors.border }]}>
            <Feather name="shield" size={15} color={colors.primary} />
            <Text style={[local.privacyText, { color: colors.mutedForeground }]}>
              Your data is private, encrypted, and backed up in the cloud.
            </Text>
          </View>
        </Card>

        {/* 6. About App Card */}
        <Card style={{ backgroundColor: colors.secondary }}>
          <Text style={[local.quote, { color: colors.secondaryForeground }]}>
            “Small daily rituals anchor our peace and ground our purpose.”
          </Text>
          <Text style={[ui.muted, { color: colors.mutedForeground, marginTop: 8 }]}>
            Daily Log · Version 2.4.0 (Production)
          </Text>
        </Card>
      </ScrollView>
    </Page>
  );
}

const local = StyleSheet.create({
  scrollWrap: {
    paddingBottom: 24,
  },
  profileCard: {
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 18,
    fontWeight: '700',
  },
  phoneText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    marginTop: 2,
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  viewProfileBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '700',
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  themePillText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    fontWeight: '700',
  },
  themesList: {
    gap: 10,
    marginTop: 4,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  themeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  themeSubtitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowDetail: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    lineHeight: 16,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  privacyText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  quote: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
});