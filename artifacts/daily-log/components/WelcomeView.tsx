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
            paddingTop: insets.top + (Platform.OS === 'web' ? 40 : 24),
            paddingBottom: insets.bottom + 36,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand / Logo Hero */}
        <View style={local.heroSection}>
          <View style={[local.logoContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={local.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[local.appName, { color: colors.foreground }]}>Daily Log</Text>
          <Text style={[local.tagline, { color: colors.mutedForeground }]}>
            A quiet, thoughtful space for your daily rhythm, essential rituals, and gentle reflections.
          </Text>
        </View>

        {/* Feature Highlights Grid */}
        <View style={local.featuresContainer}>
          <FeatureCard
            icon="book-open"
            title="Daily Mindfulness"
            description="Clear the mental clutter with intentional journaling, mood check-ins, and 3 key priorities."
            colors={colors}
          />
          <FeatureCard
            icon="check-circle"
            title="Non-Negotiable Routines"
            description="Anchor your day with repeatable rituals like restful sleep, deep work blocks, and morning breath."
            colors={colors}
          />
          <FeatureCard
            icon="trending-up"
            title="Weekly & Monthly Rhythm"
            description="Notice patterns without pressure: streaks, completion percentages, and quiet reflections."
            colors={colors}
          />
          <FeatureCard
            icon="shield"
            title="Private & Encrypted Sync"
            description="Your daily thoughts and personal records are encrypted and accessible only to you."
            colors={colors}
          />
        </View>

        {/* Action Controls */}
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
            <Feather name="user-plus" size={18} color={colors.primaryForeground} style={local.btnIcon} />
            <Text style={[local.primaryBtnText, { color: colors.primaryForeground }]}>
              Get Started — Create Account
            </Text>
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
            <Feather name="log-in" size={18} color={colors.secondaryForeground} style={local.btnIcon} />
            <Text style={[local.secondaryBtnText, { color: colors.secondaryForeground }]}>
              I already have an account — Sign In
            </Text>
          </Pressable>

          <Text style={[local.privacyNote, { color: colors.mutedForeground }]}>
            🔒 Fully private & secure. Your words belong only to you.
          </Text>
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

function FeatureCard({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[local.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[local.cardIconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <View style={local.cardContent}>
        <Text style={[local.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[local.cardDesc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
    maxWidth: 520,
  },
  logoContainer: {
    width: 104,
    height: 104,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 24,
  },
  appName: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 520,
    gap: 12,
    marginBottom: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 13,
    lineHeight: 19,
  },
  ctaSection: {
    width: '100%',
    maxWidth: 520,
    gap: 12,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  btnIcon: {
    marginRight: 8,
  },
  primaryBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 14,
    fontWeight: '600',
  },
  privacyNote: {
    fontFamily: 'Amazon Ember Display',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
});
