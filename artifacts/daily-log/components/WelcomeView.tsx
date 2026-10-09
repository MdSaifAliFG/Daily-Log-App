import React, { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AuthModal } from './AuthModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GENZ_MOTIVATIONS = [
  {
    id: 1,
    tag: 'VIBE CHECK',
    quote: 'Romanticize your daily routine. You are the author of this season.',
    author: 'Daily Affirmation',
    emoji: '✨',
  },
  {
    id: 2,
    tag: 'ENERGY',
    quote: 'Your mind is for having ideas, not holding them. Dump it on paper.',
    author: 'Deep Work Principle',
    emoji: '🔋',
  },
  {
    id: 3,
    tag: 'GROWTH',
    quote: '1% better habits every day compound into a completely new life.',
    author: 'Atomic Living',
    emoji: '🌱',
  },
];

export function WelcomeView() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [activeQuoteIdx, setActiveQuoteIdx] = useState(0);

  const currentQuote = GENZ_MOTIVATIONS[activeQuoteIdx];

  const handleOpenAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthVisible(true);
  };

  return (
    <View style={[local.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          local.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 12),
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 24 : 18),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={local.contentWrap}>
          {/* 1. Gen Z Eyebrow Pill */}
          <View style={[local.eyebrowBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={local.badgeEmoji}>⚡</Text>
            <Text style={[local.eyebrowText, { color: colors.primary }]}>
              GEN Z MINDFUL JOURNAL & HABITS
            </Text>
          </View>

          {/* 2. Hero Logo & Title Section */}
          <View style={local.heroSection}>
            <View style={local.logoShadowWrap}>
              <View style={[local.logoContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={local.logoImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            <Text style={[local.appName, { color: colors.foreground }]}>Daily Log</Text>
            <Text style={[local.tagline, { color: colors.mutedForeground }]}>
              Your aesthetic safe space to brain-dump thoughts, build unbroken habits, and track your daily vibe.
            </Text>
          </View>

          {/* 3. Aesthetic Lifestyle Image & Motivation Quote Card */}
          <View style={[local.imageQuoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={local.imageWrapper}>
              <Image
                source={require('@/assets/images/motivation_card.jpg')}
                style={local.motivationImage}
                resizeMode="cover"
              />
              <View style={local.imageGradientOverlay}>
                <View style={[local.quoteCategoryPill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                  <Text style={local.quoteCategoryText}>
                    {currentQuote.emoji} {currentQuote.tag}
                  </Text>
                </View>
              </View>
            </View>

            <View style={local.quoteBody}>
              <Text style={[local.quoteText, { color: colors.foreground }]}>
                “{currentQuote.quote}”
              </Text>
              <View style={local.quoteFooter}>
                <Text style={[local.quoteAuthor, { color: colors.mutedForeground }]}>
                  — {currentQuote.author}
                </Text>

                {/* Micro quote selector dots */}
                <View style={local.quoteDotsRow}>
                  {GENZ_MOTIVATIONS.map((q, idx) => (
                    <Pressable
                      key={q.id}
                      onPress={() => setActiveQuoteIdx(idx)}
                      style={[
                        local.quoteDot,
                        {
                          backgroundColor: idx === activeQuoteIdx ? colors.primary : colors.border,
                          width: idx === activeQuoteIdx ? 16 : 6,
                        },
                      ]}
                      accessibilityLabel={`Show quote ${idx + 1}`}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* 4. Gen Z Vibe Feature Highlights */}
          <View style={local.featureGrid}>
            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="edit-3" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>Brain-Dump Notes</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Unfiltered daily journaling</Text>
              </View>
            </View>

            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="check-circle" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>Micro-Habits</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Atomic daily routines</Text>
              </View>
            </View>

            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="smile" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>Mood & Vibe</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Track mental energy</Text>
              </View>
            </View>

            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="lock" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>100% Private</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Encrypted, zero ads</Text>
              </View>
            </View>
          </View>

          {/* 5. Clear Direct Action Buttons (Sign Up vs Sign In) */}
          <View style={local.ctaSection}>
            <Pressable
              style={({ pressed }) => [
                local.primaryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => handleOpenAuth('signup')}
            >
              <Text style={[local.primaryBtnText, { color: colors.primaryForeground }]}>
                Create Free Account
              </Text>
              <Feather name="arrow-right" size={16} color={colors.primaryForeground} style={local.btnIconRight} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                local.secondaryBtn,
                { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => handleOpenAuth('signin')}
            >
              <Feather name="log-in" size={15} color={colors.secondaryForeground} style={local.btnIconLeft} />
              <Text style={[local.secondaryBtnText, { color: colors.secondaryForeground }]}>
                Already have an account? Sign In
              </Text>
            </Pressable>

            <Text style={[local.privacyNote, { color: colors.mutedForeground }]}>
              🔒 Secure phone login • Instant cloud sync • Private to you
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Auth Modal with explicit mode */}
      <AuthModal
        visible={authVisible}
        onClose={() => setAuthVisible(false)}
        initialMode={authMode}
      />
    </View>
  );
}

const local = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentWrap: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    paddingVertical: 4,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  eyebrowText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
  },
  logoShadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 10,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  imageQuoteCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  motivationImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  quoteCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  quoteCategoryText: {
    fontFamily: 'Amazon Ember Display',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  quoteBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quoteText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteAuthor: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    fontWeight: '500',
  },
  quoteDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quoteDot: {
    height: 6,
    borderRadius: 3,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  microFeatureCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  microIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microTextWrap: {
    flex: 1,
  },
  microTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  microDesc: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 10,
    lineHeight: 14,
  },
  ctaSection: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
    paddingHorizontal: 18,
  },
  btnIconRight: {
    marginLeft: 6,
  },
  btnIconLeft: {
    marginRight: 6,
  },
  primaryBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '600',
  },
  privacyNote: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
});
