import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAppearance } from '@/contexts/AppearanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalSearchResult, performGlobalSearch } from '@/lib/dataService';

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'note', label: 'Notes' },
  { id: 'journal', label: 'Journal' },
  { id: 'routine', label: 'Habits' },
  { id: 'reflection', label: 'Reflections' },
] as const;

export function AppHeader() {
  const colors = useColors();
  const { isDark, toggleTheme } = useAppearance();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'note' | 'journal' | 'routine' | 'reflection'>('all');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Global keyboard shortcut listener for Web (Cmd+K / Ctrl+K / /)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Perform search debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await performGlobalSearch(query, user?.id);
        setResults(res);
      } catch (err) {
        console.warn('Search failed', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, user?.id]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter((r) => r.type === activeFilter);
  }, [results, activeFilter]);

  const handleSelectResult = (item: GlobalSearchResult) => {
    setSearchOpen(false);
    setQuery('');

    if (item.type === 'note') {
      router.push('/notes');
    } else if (item.type === 'journal' && item.date) {
      router.push({ pathname: '/', params: { date: item.date } });
    } else if (item.type === 'routine') {
      router.push('/routine');
    } else if (item.type === 'reflection') {
      router.push('/week');
    }
  };

  const getResultIcon = (type: GlobalSearchResult['type']): keyof typeof Feather.glyphMap => {
    switch (type) {
      case 'note':
        return 'file-text';
      case 'journal':
        return 'book-open';
      case 'routine':
        return 'check-circle';
      case 'reflection':
        return 'calendar';
      default:
        return 'file';
    }
  };

  const getResultColor = (type: GlobalSearchResult['type']) => {
    switch (type) {
      case 'note':
        return colors.primary;
      case 'journal':
        return '#4A7C59';
      case 'routine':
        return '#3D72A4';
      case 'reflection':
        return '#8A60A2';
      default:
        return colors.mutedForeground;
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 8) + (isWeb ? 8 : 4),
          },
        ]}
      >
        <View style={styles.headerInner}>
          {/* 1. App Brand & Logo */}
          <Pressable
            style={({ pressed }) => [styles.brandWrapper, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => router.push('/')}
          >
            <View style={styles.logoBox}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={[styles.brandName, { color: colors.foreground }]}>Daily Log</Text>
              {isWeb && (
                <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
                  Mindful Journal & Habits
                </Text>
              )}
            </View>
          </Pressable>

          {/* 2. Global Search Bar */}
          <Pressable
            style={({ pressed }) => [
              styles.searchBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => setSearchOpen(true)}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} style={styles.searchIcon} />
            <Text
              numberOfLines={1}
              style={[
                styles.searchPlaceholder,
                { color: colors.mutedForeground },
              ]}
            >
              {isWeb ? 'Search notes, journal, habits…' : 'Global search…'}
            </Text>
            {isWeb && (
              <View style={[styles.kbdBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.kbdText, { color: colors.secondaryForeground }]}>⌘K</Text>
              </View>
            )}
          </Pressable>

          {/* Quick Theme Toggle */}
          <Pressable
            style={({ pressed }) => [
              styles.themeToggleBtn,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            onPress={toggleTheme}
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Feather
              name={isDark ? 'sun' : 'moon'}
              size={17}
              color={colors.primary}
            />
          </Pressable>

          {/* 3. User Avatar / Profile link */}
          <Pressable
            style={({ pressed }) => [
              styles.avatarBtn,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Open user profile"
          >
            {profile?.avatarUrl && !profile.avatarUrl.startsWith('preset:') ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
            ) : profile?.avatarUrl?.startsWith('preset:') ? (
              <Text style={{ fontSize: 16 }}>{profile.avatarUrl.split(':')[1] || '🌿'}</Text>
            ) : (
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {profile?.fullName ? profile.fullName[0].toUpperCase() : 'U'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Global Search Dialog Modal */}
      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSearchOpen(false)}
        >
          <Pressable
            style={[
              styles.modalDialog,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
              <Feather name="search" size={19} color={colors.primary} style={styles.modalSearchIcon} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search notes, journal entries, habits, reflections…"
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoFocus
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
              <Pressable
                onPress={() => setSearchOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
              >
                <Text style={[styles.closeBtnText, { color: colors.secondaryForeground }]}>ESC</Text>
              </Pressable>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {FILTER_TYPES.map((f) => {
                const active = activeFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: active ? colors.primary : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setActiveFilter(f.id)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: active ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Results Area */}
            <ScrollView
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
              keyboardShouldPersistTaps="handled"
            >
              {searching ? (
                <View style={styles.feedbackBox}>
                  <Text style={[styles.feedbackText, { color: colors.mutedForeground }]}>
                    Searching across your data…
                  </Text>
                </View>
              ) : !query.trim() ? (
                <View style={styles.feedbackBox}>
                  <Feather name="compass" size={28} color={colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={[styles.feedbackTitle, { color: colors.foreground }]}>
                    Global Universal Search
                  </Text>
                  <Text style={[styles.feedbackText, { color: colors.mutedForeground }]}>
                    Type any keyword, thought, habit, or date (e.g., “2026-10”, “meeting”, “exercise”).
                  </Text>
                </View>
              ) : filteredResults.length === 0 ? (
                <View style={styles.feedbackBox}>
                  <Feather name="slash" size={24} color={colors.mutedForeground} style={{ marginBottom: 6 }} />
                  <Text style={[styles.feedbackTitle, { color: colors.foreground }]}>
                    No results found
                  </Text>
                  <Text style={[styles.feedbackText, { color: colors.mutedForeground }]}>
                    No matches found for “{query}”. Try different keywords or switch the filter.
                  </Text>
                </View>
              ) : (
                filteredResults.map((item) => {
                  const typeColor = getResultColor(item.type);
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.resultCard,
                        {
                          backgroundColor: pressed ? colors.secondary : colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleSelectResult(item)}
                    >
                      <View style={[styles.resultIconWrap, { backgroundColor: `${typeColor}15` }]}>
                        <Feather name={getResultIcon(item.type)} size={16} color={typeColor} />
                      </View>
                      <View style={styles.resultDetails}>
                        <View style={styles.resultTitleRow}>
                          <Text numberOfLines={1} style={[styles.resultTitle, { color: colors.foreground }]}>
                            {item.title}
                          </Text>
                          {item.badge ? (
                            <View style={[styles.badgePill, { backgroundColor: colors.secondary }]}>
                              <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>
                                {item.badge}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text numberOfLines={2} style={[styles.resultSnippet, { color: colors.mutedForeground }]}>
                          {item.snippet}
                        </Text>
                        {item.date ? (
                          <Text style={[styles.resultDate, { color: colors.mutedForeground }]}>
                            {item.date}
                          </Text>
                        ) : null}
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  brandWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTextWrap: {
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: -2,
  },
  searchBar: {
    flex: 1,
    maxWidth: 440,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchPlaceholder: {
    fontFamily: 'Amazon Ember Display',
    flex: 1,
    fontSize: 13,
  },
  kbdBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  kbdText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 10,
    fontWeight: '700',
  },
  themeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    fontWeight: '700',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 18, 0.65)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 70 : 40,
    paddingHorizontal: 16,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalSearchIcon: {
    marginRight: 4,
  },
  searchInput: {
    fontFamily: 'Amazon Ember Display',
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearBtn: {
    padding: 6,
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsList: {
    maxHeight: 400,
  },
  resultsContent: {
    padding: 16,
    paddingTop: 4,
    gap: 10,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  resultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultDetails: {
    flex: 1,
    gap: 2,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 10,
    fontWeight: '600',
  },
  resultSnippet: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    lineHeight: 17,
  },
  resultDate: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    marginTop: 2,
  },
  feedbackBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  feedbackTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
