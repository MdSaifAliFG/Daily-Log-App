import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Card, SectionTitle, styles as ui } from '@/components/AppUI';
import { fetchDailyNotes, fetchMonthSummary, fetchRoutineItems } from '@/lib/dataService';
import { iso } from '@/lib/date';

const PRESET_AVATARS = [
  { id: 'fern', label: 'Forest Fern', emoji: '🌿', color: '#3A5F43' },
  { id: 'dawn', label: 'Morning Dawn', emoji: '🌅', color: '#D97D54' },
  { id: 'lotus', label: 'Sacred Lotus', emoji: '🪷', color: '#C05C82' },
  { id: 'coffee', label: 'Warm Brew', emoji: '☕', color: '#825838' },
  { id: 'mountain', label: 'Quiet Mountain', emoji: '🏔️', color: '#456987' },
  { id: 'dove', label: 'Peace Dove', emoji: '🕊️', color: '#6A7D88' },
  { id: 'wave', label: 'Ocean Flow', emoji: '🌊', color: '#2F788B' },
  { id: 'night', label: 'Starlight', emoji: '🌌', color: '#4B3F72' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, updateProfile, signOut, deleteAccount } = useAuth();

  // Editing state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.fullName || '');
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Stats query
  const today = new Date();
  const monthQuery = useQuery({
    queryKey: ['month-summary', today.getFullYear(), today.getMonth() + 1, user?.id],
    queryFn: () => fetchMonthSummary(today.getFullYear(), today.getMonth() + 1, user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const notesQuery = useQuery({
    queryKey: ['daily-notes', user?.id],
    queryFn: () => fetchDailyNotes(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const routinesQuery = useQuery({
    queryKey: ['routine-items', user?.id],
    queryFn: () => fetchRoutineItems(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const streak = monthQuery.data?.stats.currentStreak ?? 0;
  const totalNotes = notesQuery.data?.length ?? 0;
  const activeHabits = (routinesQuery.data ?? []).filter((r) => r.isActive).length;
  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return 'Recent';
    try {
      const d = new Date(profile.createdAt);
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } catch {
      return 'Recent';
    }
  }, [profile?.createdAt]);

  // Image Picker from Device Gallery
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow camera roll access to choose a profile image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setSaving(true);
        await updateProfile({ avatarUrl: result.assets[0].uri });
        setSaving(false);
        setAvatarModalOpen(false);
      }
    } catch (err) {
      console.warn('Image picker error', err);
      Alert.alert('Error', 'Could not open image picker.');
      setSaving(false);
    }
  };

  const handleSelectPresetAvatar = async (preset: (typeof PRESET_AVATARS)[0]) => {
    setSaving(true);
    await updateProfile({ avatarUrl: `preset:${preset.emoji}:${preset.color}` });
    setSaving(false);
    setAvatarModalOpen(false);
  };

  const handleRemoveAvatar = async () => {
    setSaving(true);
    await updateProfile({ avatarUrl: '' });
    setSaving(false);
    setAvatarModalOpen(false);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    await updateProfile({ fullName: nameInput.trim() });
    setSaving(false);
    setEditingName(false);
  };

  const handleSaveBio = async () => {
    setSaving(true);
    await updateProfile({ bio: bioInput.trim() });
    setSaving(false);
    setEditingBio(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Daily Log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Confirmation Mismatch', 'Please type DELETE to confirm account removal.');
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteModalOpen(false);
      router.replace('/');
    } catch {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const isPresetAvatar = profile?.avatarUrl?.startsWith('preset:');
  const presetData = useMemo(() => {
    if (!isPresetAvatar || !profile?.avatarUrl) return null;
    const parts = profile.avatarUrl.split(':');
    return { emoji: parts[1] || '🌿', color: parts[2] || colors.primary };
  }, [isPresetAvatar, profile?.avatarUrl, colors.primary]);

  return (
    <View style={[local.container, { backgroundColor: colors.background }]}>
      {/* Top Navigation Header */}
      <View
        style={[
          local.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 14 : 8),
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            local.backBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <View style={local.headerTitleWrap}>
          <Text style={[local.headerEyebrow, { color: colors.primary }]}>Account & Identity</Text>
          <Text style={[local.headerTitle, { color: colors.foreground }]}>My Profile</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          local.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Picture Card */}
        <Card style={local.avatarCard}>
          <View style={local.avatarHero}>
            <Pressable
              style={({ pressed }) => [
                local.avatarWrapper,
                { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => setAvatarModalOpen(true)}
              accessibilityLabel="Change profile avatar"
            >
              {profile?.avatarUrl && !isPresetAvatar ? (
                <Image source={{ uri: profile.avatarUrl }} style={local.avatarImg} />
              ) : isPresetAvatar && presetData ? (
                <View style={[local.presetAvatarBox, { backgroundColor: presetData.color }]}>
                  <Text style={local.presetAvatarEmoji}>{presetData.emoji}</Text>
                </View>
              ) : (
                <View style={[local.initialAvatarBox, { backgroundColor: colors.secondary }]}>
                  <Text style={[local.initialAvatarText, { color: colors.primary }]}>
                    {(profile?.fullName || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[local.cameraBadge, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={14} color={colors.primaryForeground} />
              </View>
            </Pressable>

            <View style={local.heroInfo}>
              <Text style={[local.profileNameTitle, { color: colors.foreground }]}>
                {profile?.fullName || 'Journaler'}
              </Text>
              <View style={local.phoneBadgeRow}>
                <Text style={local.flagEmoji}>🇮🇳</Text>
                <Text style={[local.phoneText, { color: colors.mutedForeground }]}>
                  {profile?.phoneNumber || 'Mobile Account'}
                </Text>
                <Feather name="check-circle" size={13} color="#4A7C59" />
              </View>
              <Text style={[local.memberSinceText, { color: colors.mutedForeground }]}>
                Member since {memberSince}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              local.changePhotoBtn,
              { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => setAvatarModalOpen(true)}
          >
            <Feather name="image" size={15} color={colors.primary} />
            <Text style={[local.changePhotoText, { color: colors.primary }]}>
              Change Profile Photo or Avatar
            </Text>
          </Pressable>
        </Card>

        {/* 2. Personal Information Card */}
        <Card>
          <SectionTitle eyebrow="Identity" title="Personal Details" />

          {/* Name Row */}
          <View style={local.fieldBlock}>
            <View style={local.fieldLabelRow}>
              <Text style={[local.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
              {!editingName && (
                <Pressable onPress={() => { setEditingName(true); setNameInput(profile?.fullName || ''); }}>
                  <Text style={[local.fieldActionLink, { color: colors.primary }]}>Edit</Text>
                </Pressable>
              )}
            </View>
            {editingName ? (
              <View style={local.editInputRow}>
                <TextInput
                  style={[local.inputField, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                />
                <Pressable
                  style={[local.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  <Text style={[local.saveBtnText, { color: colors.primaryForeground }]}>
                    {saving ? '…' : 'Save'}
                  </Text>
                </Pressable>
                <Pressable style={local.cancelBtn} onPress={() => setEditingName(false)}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[local.fieldValue, { color: colors.foreground }]}>
                {profile?.fullName || 'Not specified'}
              </Text>
            )}
          </View>

          {/* Mobile Row */}
          <View style={local.fieldBlock}>
            <Text style={[local.fieldLabel, { color: colors.mutedForeground }]}>Verified Mobile</Text>
            <Text style={[local.fieldValue, { color: colors.foreground }]}>
              {profile?.phoneNumber || '10-digit phone linked'}
            </Text>
          </View>

          {/* Daily Intention / Bio Row */}
          <View style={local.fieldBlock}>
            <View style={local.fieldLabelRow}>
              <Text style={[local.fieldLabel, { color: colors.mutedForeground }]}>
                Daily Intention / Bio
              </Text>
              {!editingBio && (
                <Pressable onPress={() => { setEditingBio(true); setBioInput(profile?.bio || ''); }}>
                  <Text style={[local.fieldActionLink, { color: colors.primary }]}>
                    {profile?.bio ? 'Edit' : 'Add'}
                  </Text>
                </Pressable>
              )}
            </View>
            {editingBio ? (
              <View style={local.editBioBlock}>
                <TextInput
                  style={[local.bioInputField, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input }]}
                  value={bioInput}
                  onChangeText={setBioInput}
                  placeholder="e.g. Practicing mindful calm and daily rituals."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
                <View style={local.bioBtnRow}>
                  <Pressable style={local.cancelBtn} onPress={() => setEditingBio(false)}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[local.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveBio}
                    disabled={saving}
                  >
                    <Text style={[local.saveBtnText, { color: colors.primaryForeground }]}>
                      {saving ? 'Saving…' : 'Save Intention'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={[local.fieldValue, { color: colors.foreground, fontStyle: profile?.bio ? 'normal' : 'italic' }]}>
                {profile?.bio || 'No intention added yet. Add a personal quote or thought.'}
              </Text>
            )}
          </View>
        </Card>

        {/* 3. Mindfulness Journey Stats Card */}
        <Card>
          <SectionTitle eyebrow="Activity" title="Your Journey" />
          <View style={local.statsGrid}>
            <View style={[local.statTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={local.statEmoji}>🔥</Text>
              <Text style={[local.statValue, { color: colors.foreground }]}>{streak} Days</Text>
              <Text style={[local.statLabel, { color: colors.mutedForeground }]}>Current Streak</Text>
            </View>
            <View style={[local.statTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={local.statEmoji}>📖</Text>
              <Text style={[local.statValue, { color: colors.foreground }]}>Active</Text>
              <Text style={[local.statLabel, { color: colors.mutedForeground }]}>Daily Journal</Text>
            </View>
            <View style={[local.statTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={local.statEmoji}>📝</Text>
              <Text style={[local.statValue, { color: colors.foreground }]}>{totalNotes}</Text>
              <Text style={[local.statLabel, { color: colors.mutedForeground }]}>Daily Notes</Text>
            </View>
            <View style={[local.statTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={local.statEmoji}>🎯</Text>
              <Text style={[local.statValue, { color: colors.foreground }]}>{activeHabits}</Text>
              <Text style={[local.statLabel, { color: colors.mutedForeground }]}>Active Rituals</Text>
            </View>
          </View>
        </Card>

        {/* 4. Account Actions & Sign Out */}
        <Card>
          <SectionTitle eyebrow="Session" title="Account Actions" />
          <Pressable
            style={({ pressed }) => [
              local.actionRow,
              { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleSignOut}
          >
            <View style={local.actionIconBox}>
              <Feather name="log-out" size={18} color={colors.foreground} />
            </View>
            <View style={ui.flex}>
              <Text style={[local.actionTitle, { color: colors.foreground }]}>Sign Out</Text>
              <Text style={[local.actionDetail, { color: colors.mutedForeground }]}>
                Safely sign out of your account on this device
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              local.dangerRow,
              { backgroundColor: 'rgba(185, 77, 69, 0.08)', borderColor: colors.destructive, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => setDeleteModalOpen(true)}
          >
            <View style={local.actionIconBox}>
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </View>
            <View style={ui.flex}>
              <Text style={[local.actionTitle, { color: colors.destructive }]}>Delete Account</Text>
              <Text style={[local.actionDetail, { color: colors.destructive, opacity: 0.8 }]}>
                Permanently delete all journal entries, notes, and records
              </Text>
            </View>
            <Feather name="alert-triangle" size={16} color={colors.destructive} />
          </Pressable>
        </Card>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal visible={avatarModalOpen} transparent animationType="fade" onRequestClose={() => setAvatarModalOpen(false)}>
        <Pressable style={local.modalBackdrop} onPress={() => setAvatarModalOpen(false)}>
          <Pressable style={[local.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={local.modalHeader}>
              <Text style={[local.modalTitle, { color: colors.foreground }]}>Choose Profile Avatar</Text>
              <Pressable onPress={() => setAvatarModalOpen(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            {/* Gallery Upload Option */}
            <Pressable
              style={[local.pickerOptionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handlePickImage}
              disabled={saving}
            >
              <Feather name="upload" size={18} color={colors.primary} />
              <View style={ui.flex}>
                <Text style={[local.pickerOptionTitle, { color: colors.foreground }]}>Upload Photo from Gallery</Text>
                <Text style={[local.pickerOptionSubtitle, { color: colors.mutedForeground }]}>Choose any image from your device</Text>
              </View>
            </Pressable>

            {/* Preset Avatars Grid */}
            <Text style={[local.presetsHeader, { color: colors.mutedForeground }]}>Or pick a mindful icon:</Text>
            <View style={local.presetsGrid}>
              {PRESET_AVATARS.map((preset) => (
                <Pressable
                  key={preset.id}
                  style={({ pressed }) => [
                    local.presetItem,
                    { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
                  ]}
                  onPress={() => handleSelectPresetAvatar(preset)}
                >
                  <View style={[local.presetCircle, { backgroundColor: preset.color }]}>
                    <Text style={local.presetEmoji}>{preset.emoji}</Text>
                  </View>
                  <Text numberOfLines={1} style={[local.presetLabel, { color: colors.foreground }]}>
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Remove photo option */}
            {profile?.avatarUrl && (
              <Pressable style={local.removePhotoBtn} onPress={handleRemoveAvatar}>
                <Text style={{ color: colors.destructive, fontSize: 13, fontWeight: '600' }}>
                  Reset to default initials
                </Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={deleteModalOpen} transparent animationType="slide" onRequestClose={() => setDeleteModalOpen(false)}>
        <View style={local.modalBackdrop}>
          <View style={[local.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={local.modalHeader}>
              <View>
                <Text style={[local.modalTitle, { color: colors.destructive }]}>Delete Account</Text>
                <Text style={[ui.muted, { color: colors.mutedForeground }]}>This action cannot be undone.</Text>
              </View>
              <Pressable onPress={() => setDeleteModalOpen(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            <Text style={[local.deleteWarning, { color: colors.foreground }]}>
              All your daily journal logs, habits, reflections, and notes will be permanently removed.
            </Text>

            <Text style={[local.confirmPrompt, { color: colors.foreground }]}>
              Type <Text style={{ fontWeight: '700', color: colors.destructive }}>DELETE</Text> to confirm:
            </Text>

            <TextInput
              style={[local.inputField, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input, marginBottom: 16 }]}
              value={confirmDeleteText}
              onChangeText={setConfirmDeleteText}
              placeholder="DELETE"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
            />

            <View style={local.deleteBtnRow}>
              <Pressable style={[local.cancelBtn, { paddingVertical: 10 }]} onPress={() => setDeleteModalOpen(false)}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[local.confirmDeleteBtn, { backgroundColor: colors.destructive, opacity: confirmDeleteText !== 'DELETE' || deleting ? 0.5 : 1 }]}
                disabled={confirmDeleteText !== 'DELETE' || deleting}
                onPress={handleDeleteAccount}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Permanently Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const local = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  avatarCard: {
    padding: 20,
    alignItems: 'center',
  },
  avatarHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    width: '100%',
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    position: 'relative',
    overflow: 'visible',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  presetAvatarBox: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetAvatarEmoji: {
    fontSize: 40,
  },
  initialAvatarBox: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialAvatarText: {
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: '700',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  profileNameTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
  },
  phoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagEmoji: {
    fontSize: 14,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberSinceText: {
    fontSize: 12,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldActionLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editBioBlock: {
    gap: 8,
  },
  bioInputField: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 18, 0.65)',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
  },
  pickerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  pickerOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerOptionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  presetsHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  presetItem: {
    width: '23%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  presetCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetEmoji: {
    fontSize: 22,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  removePhotoBtn: {
    alignItems: 'center',
    paddingTop: 16,
  },
  deleteWarning: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  confirmPrompt: {
    fontSize: 13,
    marginBottom: 8,
  },
  deleteBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    alignItems: 'center',
  },
  confirmDeleteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
