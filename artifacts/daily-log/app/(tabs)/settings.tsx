import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Card, Field, IconButton, Page, SectionTitle, styles as ui } from '@/components/AppUI';
import { useAppearance } from '@/contexts/AppearanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { saveSupabaseConfig, clearSupabaseConfig } from '@/lib/supabase';
import { AuthModal } from '@/components/AuthModal';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const systemScheme = useColorScheme();
  const { mode, setMode } = useAppearance();
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const { user, profile, isConfigured, isGuest, signOut, reloadConfig } = useAuth();

  const [authVisible, setAuthVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const handleSaveConfig = async () => {
    setConfigMessage(null);
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setConfigMessage('Please enter both Supabase Project URL and Anon Key.');
      return;
    }

    const success = await saveSupabaseConfig(supabaseUrl, supabaseKey);
    if (success) {
      await reloadConfig();
      setConfigMessage('Supabase credentials saved successfully!');
      setTimeout(() => {
        setConfigModalVisible(false);
        setConfigMessage(null);
      }, 1200);
    } else {
      setConfigMessage('Failed to save configuration. Please try again.');
    }
  };

  const handleResetConfig = async () => {
    Alert.alert(
      'Reset Supabase Settings?',
      'This will remove custom credentials saved on this device and revert to local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearSupabaseConfig();
            await reloadConfig();
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out?', 'You will return to offline guest mode on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle
          eyebrow="Make it yours"
          title="Settings"
          right={<Feather name="sliders" color={colors.primary} size={22} />}
        />

        {/* 1. Account / Profile Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Account & Sync</Text>
          {user ? (
            <View style={local.userRow}>
              <View style={[local.avatar, { backgroundColor: colors.secondary }]}>
                <Text style={[local.avatarText, { color: colors.primary }]}>
                  {(profile?.fullName || user.email || 'J')[0].toUpperCase()}
                </Text>
              </View>
              <View style={ui.flex}>
                <Text style={[local.userName, { color: colors.foreground }]}>
                  {profile?.fullName || 'Journaler'}
                </Text>
                <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                  {user.email}
                </Text>
                <View style={local.syncBadge}>
                  <Feather name="check" size={12} color={colors.primary} />
                  <Text style={[local.syncBadgeText, { color: colors.primary }]}>
                    Supabase Cloud Sync Active
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleSignOut}
                style={[local.signOutBtn, { borderColor: colors.border }]}
              >
                <Feather name="log-out" size={16} color={colors.destructive} />
              </Pressable>
            </View>
          ) : (
            <View style={local.guestRow}>
              <View style={[local.avatar, { backgroundColor: colors.muted }]}>
                <Feather name="user" size={20} color={colors.mutedForeground} />
              </View>
              <View style={ui.flex}>
                <Text style={[local.userName, { color: colors.foreground }]}>
                  Guest Mode (Offline)
                </Text>
                <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                  Your data is safely stored on this device.
                </Text>
              </View>
              <Pressable
                onPress={() => setAuthVisible(true)}
                style={[local.signInBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[local.signInBtnText, { color: colors.primaryForeground }]}>
                  Sign In
                </Text>
              </Pressable>
            </View>
          )}
        </Card>

        {/* 2. Supabase Backend Integration Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Supabase Backend</Text>
          <View style={local.backendRow}>
            <View
              style={[
                local.statusIndicator,
                { backgroundColor: isConfigured ? '#35564f' : colors.primary },
              ]}
            />
            <View style={ui.flex}>
              <Text style={[local.rowTitle, { color: colors.foreground }]}>
                {isConfigured ? 'Supabase Connected' : 'Local Storage Mode'}
              </Text>
              <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                {isConfigured
                  ? 'Cloud database is ready and connected'
                  : 'Add your Supabase URL & anon key to enable sync'}
              </Text>
            </View>
            <Pressable
              onPress={() => setConfigModalVisible(true)}
              style={[local.configBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="key" size={16} color={colors.primary} />
              <Text style={[local.configBtnText, { color: colors.primary }]}>Configure</Text>
            </Pressable>
          </View>
        </Card>

        {/* 3. Routine Habits Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Your rhythm</Text>
          <PressRow
            icon="list"
            title="Routine items"
            detail="Add, rename, or pause daily rituals"
            onPress={() => router.push('/routine')}
            colors={colors}
          />
        </Card>

        {/* 4. Appearance & Theme */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Appearance</Text>
          <View style={local.appearance}>
            <View style={[local.appearanceIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="moon" size={18} color={colors.primary} />
            </View>
            <View style={ui.flex}>
              <Text style={[local.rowTitle, { color: colors.foreground }]}>Dark mode</Text>
              <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                {mode === 'system' ? 'Following device setting' : 'Saved on this device'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(value) => setMode(value ? 'dark' : 'light')}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
          <View style={[local.swatchRow, { borderTopColor: colors.border }]}>
            <View style={[local.swatch, { backgroundColor: colors.background, borderColor: colors.border }]} />
            <View style={[local.swatch, { backgroundColor: colors.primary, borderColor: colors.border }]} />
            <View style={[local.swatch, { backgroundColor: colors.secondary, borderColor: colors.border }]} />
            <Text style={[ui.muted, { color: colors.mutedForeground }]}>
              Warm paper, terracotta, and sage
            </Text>
          </View>
        </Card>

        {/* 5. Mindful Note Card */}
        <Card style={{ backgroundColor: colors.secondary }}>
          <Text style={[local.quote, { color: colors.secondaryForeground }]}>
            “The page is yours before it is anything else.”
          </Text>
          <Text style={[ui.muted, { color: colors.mutedForeground, marginTop: 8 }]}>
            A private place for the ordinary details that make a life.
          </Text>
        </Card>

        <Text style={[local.version, { color: colors.mutedForeground }]}>
          Daily Log · v1.0.0 · Supabase Ready
        </Text>
      </ScrollView>

      {/* Auth Modal */}
      <AuthModal
        visible={authVisible}
        onClose={() => setAuthVisible(false)}
        initialMode="signin"
      />

      {/* Supabase Key Configuration Modal */}
      <Modal
        visible={configModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={local.modalBackdrop}>
          <View style={[local.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={local.modalHeader}>
              <View>
                <Text style={[ui.eyebrow, { color: colors.primary }]}>Cloud Backend</Text>
                <Text style={[local.modalTitle, { color: colors.foreground }]}>
                  Supabase Keys
                </Text>
              </View>
              <IconButton
                icon="x"
                label="Close dialog"
                onPress={() => setConfigModalVisible(false)}
              />
            </View>

            <Text style={[ui.muted, { color: colors.mutedForeground, marginBottom: 14 }]}>
              Paste your Supabase credentials below. They will be stored securely on this device.
            </Text>

            <Text style={[local.inputLabel, { color: colors.foreground }]}>Project URL</Text>
            <TextInput
              style={[local.textInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }]}
              placeholder="https://xyzcompany.supabase.co"
              placeholderTextColor={colors.mutedForeground}
              value={supabaseUrl}
              onChangeText={setSupabaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[local.inputLabel, { color: colors.foreground, marginTop: 12 }]}>Anon Public Key</Text>
            <TextInput
              style={[local.textInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }]}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              placeholderTextColor={colors.mutedForeground}
              value={supabaseKey}
              onChangeText={setSupabaseKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            {configMessage && (
              <Text
                style={[
                  local.message,
                  {
                    color: configMessage.includes('success')
                      ? colors.primary
                      : colors.destructive,
                  },
                ]}
              >
                {configMessage}
              </Text>
            )}

            <View style={local.modalBtnRow}>
              {isConfigured && (
                <Pressable
                  onPress={handleResetConfig}
                  style={[local.resetBtn, { borderColor: colors.destructive }]}
                >
                  <Text style={{ color: colors.destructive, fontSize: 13, fontWeight: '600' }}>
                    Reset
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleSaveConfig}
                style={[local.saveConfigBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '700' }}>
                  Save & Connect
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function PressRow({
  icon,
  title,
  detail,
  onPress,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={local.row}>
      <View style={[local.appearanceIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={ui.flex}>
        <Text style={[local.rowTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[ui.muted, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
      <IconButton icon="chevron-right" label={title} onPress={onPress} />
    </View>
  );
}

const local = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 70,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signInBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  backendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  configBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appearance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 74,
  },
  appearanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  quote: {
    fontFamily: 'Georgia',
    fontSize: 20,
    lineHeight: 28,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,25,23,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  message: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveConfigBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});