import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { Button, Card, IconButton, LoadingState, Page, SectionTitle, styles as ui } from '@/components/AppUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/contexts/AuthContext';
import {
  DailyNote,
  deleteDailyNote,
  fetchDailyNotes,
  saveDailyNote,
  togglePinDailyNote,
} from '@/lib/dataService';
import { iso } from '@/lib/date';

const CATEGORIES = ['All', 'Pinned', 'General', 'Idea', 'Personal', 'Work'];

export default function NotesScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State for New/Edit Note
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('General');
  const [notePinned, setNotePinned] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Fetch Daily Notes
  const notesQuery = useQuery({
    queryKey: ['daily-notes', user?.id ?? 'user'],
    queryFn: () => fetchDailyNotes(user?.id),
    staleTime: 1000 * 60 * 3,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['daily-notes'] });
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: {
      id?: string;
      title: string;
      content: string;
      category: string;
      isPinned: boolean;
    }) => saveDailyNote(payload, user?.id),
    onSuccess: () => {
      invalidate();
      setEditorVisible(false);
      resetEditor();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteDailyNote(noteId, user?.id),
    onSuccess: invalidate,
  });

  const pinMutation = useMutation({
    mutationFn: ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) =>
      togglePinDailyNote(noteId, isPinned, user?.id),
    onSuccess: invalidate,
  });

  const resetEditor = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('General');
    setNotePinned(false);
    setSavingNote(false);
  };

  const openNewNote = () => {
    resetEditor();
    setEditorVisible(true);
  };

  const openEditNote = (note: DailyNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNotePinned(note.isPinned);
    setEditorVisible(true);
  };

  const handleSave = () => {
    if (!noteTitle.trim() && !noteContent.trim()) {
      Alert.alert('Empty note', 'Please add a title or content before saving.');
      return;
    }
    setSavingNote(true);
    saveMutation.mutate({
      id: editingNoteId || undefined,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      category: noteCategory,
      isPinned: notePinned,
    });
  };

  const confirmDelete = (noteId: string, title: string) => {
    Alert.alert('Delete note?', `Are you sure you want to delete "${title || 'this note'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(noteId),
      },
    ]);
  };

  const handleTogglePin = (noteId: string, currentPin: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    pinMutation.mutate({ noteId, isPinned: !currentPin });
  };

  // Filtered Notes
  const allNotes = notesQuery.data ?? [];
  const filteredNotes = useMemo(() => {
    return allNotes.filter((note) => {
      // Category filter
      if (selectedCategory === 'Pinned' && !note.isPinned) return false;
      if (
        selectedCategory !== 'All' &&
        selectedCategory !== 'Pinned' &&
        note.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchContent = note.content.toLowerCase().includes(q);
      const matchCategory = note.category.toLowerCase().includes(q);
      const matchDate = note.date.includes(q);
      return matchTitle || matchContent || matchCategory || matchDate;
    });
  }, [allNotes, selectedCategory, searchQuery]);

  if (notesQuery.isLoading && !notesQuery.data) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  return (
    <Page>
      <KeyboardAwareScrollViewCompat
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={notesQuery.isRefetching}
            onRefresh={() => notesQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={local.headerRow}>
          <View style={ui.flex}>
            <Text style={[ui.eyebrow, { color: colors.primary }]}>Quick thoughts & ideas</Text>
            <Text style={[local.headerTitle, { color: colors.foreground }]}>Daily Notes</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              local.newNoteBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={openNewNote}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={[local.newNoteBtnText, { color: colors.primaryForeground }]}>New Note</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={[local.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} style={local.searchIcon} />
          <TextInput
            style={[local.searchInput, { color: colors.foreground }]}
            placeholder="Search notes, thoughts, tags, or dates…"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={local.clearBtn}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={local.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[
                  local.categoryPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    local.categoryText,
                    { color: isSelected ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search results summary */}
        {searchQuery.trim().length > 0 && (
          <View style={local.searchSummary}>
            <Text style={[ui.muted, { color: colors.mutedForeground }]}>
              Found {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} matching “{searchQuery}”
            </Text>
          </View>
        )}

        {/* Notes List */}
        {filteredNotes.length === 0 ? (
          <Card style={local.emptyCard}>
            <View style={local.emptyContent}>
              <Feather
                name={searchQuery ? 'search' : 'edit-3'}
                size={28}
                color={colors.primary}
              />
              <Text style={[local.emptyTitle, { color: colors.foreground }]}>
                {searchQuery ? 'No matching notes' : 'No daily notes yet'}
              </Text>
              <Text style={[ui.muted, { color: colors.mutedForeground, textAlign: 'center' }]}>
                {searchQuery
                  ? 'Try searching with different keywords or clear the filter.'
                  : 'Capture ideas, to-do thoughts, or meeting reflections anytime.'}
              </Text>
              {!searchQuery && (
                <Pressable
                  style={[local.createFirstBtn, { backgroundColor: colors.secondary }]}
                  onPress={openNewNote}
                >
                  <Feather name="plus" size={15} color={colors.primary} />
                  <Text style={[local.createFirstBtnText, { color: colors.primary }]}>
                    Create your first note
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        ) : (
          filteredNotes.map((note) => {
            const wordCount = note.content.trim()
              ? note.content.trim().split(/\s+/).filter(Boolean).length
              : 0;

            return (
              <Card key={note.id} style={local.noteCard}>
                <Pressable onPress={() => openEditNote(note)}>
                  <View style={local.noteHeader}>
                    <View style={ui.flex}>
                      <Text style={[local.noteTitle, { color: colors.foreground }]}>
                        {note.title || 'Untitled Note'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleTogglePin(note.id, note.isPinned)}
                      style={[
                        local.pinBtn,
                        {
                          backgroundColor: note.isPinned ? colors.secondary : 'transparent',
                        },
                      ]}
                      accessibilityLabel={note.isPinned ? 'Unpin note' : 'Pin note'}
                    >
                      <Feather
                        name="bookmark"
                        size={16}
                        color={note.isPinned ? colors.primary : colors.mutedForeground}
                      />
                    </Pressable>
                  </View>

                  {note.content.length > 0 && (
                    <Text
                      numberOfLines={3}
                      style={[local.noteSnippet, { color: colors.mutedForeground }]}
                    >
                      {note.content}
                    </Text>
                  )}

                  <View style={local.noteFooter}>
                    <View style={local.footerBadges}>
                      <View style={[local.badge, { backgroundColor: colors.secondary }]}>
                        <Text style={[local.badgeText, { color: colors.secondaryForeground }]}>
                          {note.category}
                        </Text>
                      </View>
                      <Text style={[local.noteMeta, { color: colors.mutedForeground }]}>
                        {formatNoteDate(note.date)} · {wordCount} {wordCount === 1 ? 'word' : 'words'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => confirmDelete(note.id, note.title)}
                      style={local.deleteNoteBtn}
                    >
                      <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </Pressable>
              </Card>
            );
          })
        )}
      </KeyboardAwareScrollViewCompat>

      {/* Note Editor Modal */}
      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <View style={local.modalBackdrop}>
          <View style={[local.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={local.modalHeader}>
              <View>
                <Text style={[ui.eyebrow, { color: colors.primary }]}>
                  {editingNoteId ? 'Edit Thought' : 'New Thought'}
                </Text>
                <Text style={[local.modalTitle, { color: colors.foreground }]}>
                  {editingNoteId ? 'Daily Note' : 'Capture Idea'}
                </Text>
              </View>
              <IconButton icon="x" label="Close editor" onPress={() => setEditorVisible(false)} />
            </View>

            <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
              {/* Title input */}
              <Text style={[local.fieldLabel, { color: colors.foreground }]}>Title</Text>
              <TextInput
                style={[
                  local.titleInput,
                  { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input },
                ]}
                placeholder="Give your note a title…"
                placeholderTextColor={colors.mutedForeground}
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              {/* Category Picker */}
              <Text style={[local.fieldLabel, { color: colors.foreground, marginTop: 12 }]}>Category</Text>
              <View style={local.categoryChips}>
                {['General', 'Idea', 'Personal', 'Work'].map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      local.chip,
                      {
                        backgroundColor: noteCategory === cat ? colors.primary : colors.background,
                        borderColor: noteCategory === cat ? colors.primary : colors.input,
                      },
                    ]}
                    onPress={() => setNoteCategory(cat)}
                  >
                    <Text
                      style={[
                        local.chipText,
                        { color: noteCategory === cat ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Pin switch */}
              <View style={local.pinRow}>
                <View style={ui.flex}>
                  <Text style={[local.pinLabel, { color: colors.foreground }]}>Pin to top</Text>
                  <Text style={[ui.muted, { color: colors.mutedForeground }]}>
                    Keep this note at the top of your list
                  </Text>
                </View>
                <Switch
                  value={notePinned}
                  onValueChange={setNotePinned}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.card}
                />
              </View>

              {/* Content input */}
              <Text style={[local.fieldLabel, { color: colors.foreground, marginTop: 12 }]}>Content</Text>
              <TextInput
                style={[
                  local.contentInput,
                  { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input },
                ]}
                placeholder="Write your note, inspiration, meeting takeaway, or list here…"
                placeholderTextColor={colors.mutedForeground}
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                textAlignVertical="top"
              />

              {/* Action buttons */}
              <View style={local.modalBtnRow}>
                <Pressable
                  onPress={() => setEditorVisible(false)}
                  style={[local.cancelModalBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={savingNote}
                  style={[local.saveModalBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>
                    {savingNote ? 'Saving…' : 'Save Note'}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAwareScrollViewCompat>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

function formatNoteDate(dateStr: string): string {
  const today = iso(new Date());
  if (dateStr === today) return 'Today';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return dateStr;
}

const local = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
  },
  newNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 4,
  },
  newNoteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  clearBtn: {
    padding: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingRight: 16,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchSummary: {
    marginBottom: 12,
  },
  noteCard: {
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noteTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  pinBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  noteSnippet: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  footerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noteMeta: {
    fontSize: 12,
  },
  deleteNoteBtn: {
    padding: 6,
  },
  emptyCard: {
    padding: 30,
    marginTop: 10,
  },
  emptyContent: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    marginTop: 10,
  },
  createFirstBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,25,23,0.6)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { alignItems: 'center', justifyContent: 'center' } : {}),
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    ...(Platform.OS === 'web' ? { maxWidth: 520, borderRadius: 28, maxHeight: '85%' } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  titleInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  contentInput: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveModalBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
