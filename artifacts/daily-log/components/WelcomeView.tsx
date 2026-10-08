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

export function WelcomeView() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  return (
    <View style={[local.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          local.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 24 : 16),
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 24 : 18),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={local.contentWrap}>
          {/* 1. Top Eyebrow Pill */}
          <View style={[local.eyebrowBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[local.eyebrowText, { color: colors.primary }]}>
              MINDFUL DAILY LIVING
            </Text>
          </View>

          {/* 2. Brand Hero Section */}
          <View style={local.heroSection}>
            <View style={local.logoShadowWrap}>
              <View style={[local.logoContainer, { backgroundColor: colors.card }]}>
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={local.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={[local.appName, { color: colors.foreground }]}>Daily Log</Text>
            <Text style={[local.tagline, { color: colors.mutedForeground }]}>
              A quiet sanctuary for your daily rhythm, essential rituals, and gentle reflections.
            </Text>
          </View>

          {/* 3. Compact 2x2 Feature Highlights (Fits comfortably on screen) */}
          <View style={local.featureGrid}>
            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="book-open" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>Daily Notes & Mood</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Intentional journaling</Text>
              </View>
            </View>

            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="check-circle" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>Micro-Routines</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Repeatable daily rituals</Text>
              </View>
            </View>

            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="trending-up" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>Gentle Rhythm</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Streaks without pressure</Text>
              </View>
            </View>

            <View style={[local.microFeatureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[local.microIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="shield" size={15} color={colors.primary} />
              </View>
              <View style={local.microTextWrap}>
                <Text style={[local.microTitle, { color: colors.foreground }]}>Private & Encrypted</Text>
                <Text style={[local.microDesc, { color: colors.mutedForeground }]}>Only for your eyes</Text>
              </View>
            </View>
          </View>

          {/* 4. Action Controls */}
          <View style={local.ctaSection}>
            <Pressable
              style={({ pressed }) => [
                local.primaryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => {
                setAuthMode('signup');
                setAuthVisible(true);
              }}
            >
              <Text style={[local.primaryBtnText, { color: colors.primaryForeground }]}>
                Get Started with Phone
              </Text>
              <Feather name="arrow-right" size={17} color={colors.primaryForeground} style={local.btnIconRight} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                local.secondaryBtn,
                { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => {
                setAuthMode('signin');
                setAuthVisible(true);
              }}
            >
              <Feather name="log-in" size={15} color={colors.secondaryForeground} style={local.btnIconLeft} />
              <Text style={[local.secondaryBtnText, { color: colors.secondaryForeground }]}>
                I already have an account — Sign In
              </Text>
            </Pressable>

            <Text style={[local.privacyNote, { color: colors.mutedForeground }]}>
              🔒 Fully encrypted • Cloud synced • Zero ads
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Auth Modal */}
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
    maxWidth: 500,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  eyebrowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
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
    marginBottom: 16,
    width: '100%',
  },
  logoShadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
    marginBottom: 12,
  },
  logoContainer: {
    width: 82,
    height: 82,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 20,
  },
  microFeatureCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  microIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microTextWrap: {
    flex: 1,
  },
  microTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  microDesc: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    lineHeight: 15,
  },
  ctaSection: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    paddingHorizontal: 20,
  },
  btnIconRight: {
    marginLeft: 8,
  },
  btnIconLeft: {
    marginRight: 8,
  },
  primaryBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    fontWeight: '600',
  },
  privacyNote: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
});
