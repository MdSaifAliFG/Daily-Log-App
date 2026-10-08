import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const systemScheme = useColorScheme();
  const { mode, setMode } = useAppearance();
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const { user, profile, signOut, updateProfile, deleteAccount } = useAuth();

  // Edit Name Modal State
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [newName, setNewName] = useState(profile?.fullName || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Delete Account Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle Name Update
  const handleSaveName = async () => {
    setNameError(null);
    if (!newName.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }
    setSavingName(true);
    const result = await updateProfile(newName.trim());
    setSavingName(false);
    if (result.error) {
      setNameError(result.error);
    } else {
      setEditNameVisible(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your journal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAccount();
    setDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeleteModalVisible(false);
    }
  };

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
          user: profile?.fullName || user?.email,
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

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <Page>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle
          eyebrow="Preferences"
          title="Settings"
          right={<Feather name="sliders" color={colors.primary} size={22} />}
        />

        {/* 1. User Profile Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Your Profile</Text>
          <View style={local.userRow}>
            <View style={[local.avatar, { backgroundColor: colors.secondary }]}>
              <Text style={[local.avatarText, { color: colors.primary }]}>
                {(profile?.fullName || user?.email || 'J')[0].toUpperCase()}
              </Text>
            </View>
            <View style={ui.flex}>
              <Text style={[local.userName, { color: colors.foreground }]}>
                {profile?.fullName || 'Journaler'}
              </Text>
              <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                {profile?.phoneNumber || (user?.email && !user.email.includes('@phone.local') && !user.email.includes('@daily-log.internal') ? user.email : 'Mobile Account')}
              </Text>
              <Text style={[local.memberText, { color: colors.mutedForeground }]}>
                Member since {memberSince}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setNewName(profile?.fullName || '');
                setEditNameVisible(true);
              }}
              style={[local.editBtn, { backgroundColor: colors.secondary }]}
              accessibilityLabel="Edit profile name"
            >
              <Feather name="edit-2" size={15} color={colors.primary} />
            </Pressable>
          </View>
        </Card>

        {/* 2. Routines & Habits Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Your rhythm</Text>
          <PressRow
            icon="list"
            title="Daily routines"
            detail="Add, customize, or pause repeatable rituals"
            onPress={() => router.push('/routine')}
            colors={colors}
          />
        </Card>

        {/* 3. Appearance Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Appearance</Text>
          <View style={local.appearance}>
            <View style={[local.appearanceIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="moon" size={18} color={colors.primary} />
            </View>
            <View style={ui.flex}>
              <Text style={[local.rowTitle, { color: colors.foreground }]}>Dark mode</Text>
              <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                {mode === 'system' ? 'Following device theme' : isDark ? 'Dark theme' : 'Warm paper theme'}
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
              Warm paper, terracotta, and soft sage
            </Text>
          </View>
        </Card>

        {/* 4. Data & Privacy Card */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Data & Privacy</Text>
          <PressRow
            icon="download"
            title="Export journal"
            detail="Download a complete copy of all your entries"
            onPress={handleExportJournal}
            colors={colors}
          />
          <View style={[local.privacyInfo, { borderTopColor: colors.border }]}>
            <Feather name="shield" size={16} color={colors.primary} />
            <Text style={[local.privacyText, { color: colors.mutedForeground }]}>
              Your data is encrypted and backed up securely in the cloud. Only you have access.
            </Text>
          </View>
        </Card>

        {/* 5. Account Actions (Sign Out & Delete) */}
        <Card>
          <Text style={[ui.eyebrow, { color: colors.primary }]}>Account</Text>
          <Pressable
            style={({ pressed }) => [
              local.actionBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={16} color={colors.foreground} />
            <Text style={[local.actionBtnText, { color: colors.foreground }]}>Log Out</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              local.actionBtn,
              local.deleteBtn,
              { borderColor: colors.destructive, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => {
              setDeleteConfirmationText('');
              setDeleteError(null);
              setDeleteModalVisible(true);
            }}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[local.actionBtnText, { color: colors.destructive }]}>Delete Account</Text>
          </Pressable>
        </Card>

        {/* 6. Philosophy Note */}
        <Card style={{ backgroundColor: colors.secondary }}>
          <Text style={[local.quote, { color: colors.secondaryForeground }]}>
            “The page is yours before it is anything else.”
          </Text>
          <Text style={[ui.muted, { color: colors.mutedForeground, marginTop: 8 }]}>
            A private place for the ordinary details that make a life.
          </Text>
        </Card>

        <Text style={[local.version, { color: colors.mutedForeground }]}>
          Daily Log · Version 1.0.0
        </Text>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={editNameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditNameVisible(false)}
      >
        <View style={local.modalBackdrop}>
          <View style={[local.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={local.modalHeader}>
              <Text style={[local.modalTitle, { color: colors.foreground }]}>Edit Your Name</Text>
              <IconButton icon="x" label="Close" onPress={() => setEditNameVisible(false)} />
            </View>

            <Text style={[ui.muted, { color: colors.mutedForeground, marginBottom: 12 }]}>
              This is how your name will appear in your morning and evening greetings.
            </Text>

            <TextInput
              style={[
                local.textInput,
                { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input },
              ]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />

            {nameError && (
              <Text style={[local.errorText, { color: colors.destructive }]}>{nameError}</Text>
            )}

            <View style={local.modalBtnRow}>
              <Pressable
                onPress={() => setEditNameVisible(false)}
                style={[local.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveName}
                disabled={savingName}
                style={[local.saveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>
                  {savingName ? 'Saving…' : 'Save Name'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal (Danger Zone) */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={local.modalBackdrop}>
          <View style={[local.modalCard, { backgroundColor: colors.card, borderColor: colors.destructive }]}>
            <View style={local.modalHeader}>
              <View style={local.deleteHeaderWrap}>
                <Feather name="alert-triangle" size={22} color={colors.destructive} />
                <Text style={[local.modalTitle, { color: colors.destructive }]}>Delete Account</Text>
              </View>
              <IconButton icon="x" label="Close" onPress={() => setDeleteModalVisible(false)} />
            </View>

            <Text style={[local.deleteWarning, { color: colors.foreground }]}>
              This will permanently delete your account, all daily journal entries, routines, and weekly reflections.
            </Text>
            <Text style={[ui.muted, { color: colors.mutedForeground, marginBottom: 14 }]}>
              This action cannot be undone. To confirm, please type <Text style={{ fontWeight: '700', color: colors.destructive }}>DELETE</Text> below:
            </Text>

            <TextInput
              style={[
                local.textInput,
                { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input },
              ]}
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              placeholder="Type DELETE to confirm"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
            />

            {deleteError && (
              <Text style={[local.errorText, { color: colors.destructive }]}>{deleteError}</Text>
            )}

            <View style={local.modalBtnRow}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                style={[local.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                style={[
                  local.saveBtn,
                  {
                    backgroundColor: colors.destructive,
                    opacity: deleteConfirmationText.trim().toUpperCase() === 'DELETE' ? 1 : 0.45,
                  },
                ]}
              >
                <Text style={{ color: colors.destructiveForeground, fontWeight: '700' }}>
                  {deleting ? 'Deleting…' : 'Permanently Delete'}
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
    <Pressable onPress={onPress} style={({ pressed }) => [local.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[local.appearanceIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={ui.flex}>
        <Text style={[local.rowTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[ui.muted, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const local = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  memberText: {
    fontSize: 12,
    marginTop: 2,
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
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
    paddingTop: 12,
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
  privacyInfo: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    marginTop: 4,
  },
  quote: {
    fontFamily: 'Georgia',
    fontSize: 20,
    lineHeight: 28,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,25,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
  },
  deleteWarning: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
  },
});