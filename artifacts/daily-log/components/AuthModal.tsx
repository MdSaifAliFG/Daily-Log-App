import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ visible, onClose, initialMode = 'signin' }: AuthModalProps) {
  const colors = useColors();
  const { signIn, signUp, isConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(cleanEmail, password);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          onClose();
        }
      } else {
        const result = await signUp(cleanEmail, password, fullName);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          setSuccessMessage(result.message || 'Account created! Signing you in...');
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={local.backdrop}>
        <View style={[local.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={local.header}>
            <View>
              <Text style={[local.eyebrow, { color: colors.primary }]}>
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={[local.title, { color: colors.foreground }]}>
                {mode === 'signin' ? 'Sign in to Daily Log' : 'Start your journal'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[local.closeBtn, { backgroundColor: colors.secondary }]}
              accessibilityLabel="Close auth window"
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {!isConfigured && (
            <View style={[local.warningBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={16} color={colors.primary} />
              <Text style={[local.warningText, { color: colors.secondaryForeground }]}>
                Supabase keys not detected yet. You can still test in offline guest mode or enter your keys in Settings.
              </Text>
            </View>
          )}

          {/* Mode Switch Tabs */}
          <View style={[local.tabBar, { backgroundColor: colors.muted }]}>
            <Pressable
              style={[
                local.tab,
                mode === 'signin' && [local.tabActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  local.tabText,
                  { color: mode === 'signin' ? colors.primary : colors.mutedForeground },
                  mode === 'signin' && local.tabTextActive,
                ]}
              >
                Sign In
              </Text>
            </Pressable>

            <Pressable
              style={[
                local.tab,
                mode === 'signup' && [local.tabActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  local.tabText,
                  { color: mode === 'signup' ? colors.primary : colors.mutedForeground },
                  mode === 'signup' && local.tabTextActive,
                ]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
            {/* Full Name for Sign Up */}
            {mode === 'signup' && (
              <View style={local.inputGroup}>
                <Text style={[local.label, { color: colors.foreground }]}>Your Name</Text>
                <View style={[local.inputWrapper, { backgroundColor: colors.background, borderColor: colors.input }]}>
                  <Feather name="user" size={18} color={colors.mutedForeground} style={local.inputIcon} />
                  <TextInput
                    style={[local.input, { color: colors.foreground }]}
                    placeholder="e.g. Jordan Smith"
                    placeholderTextColor={colors.mutedForeground}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Email Field */}
            <View style={local.inputGroup}>
              <Text style={[local.label, { color: colors.foreground }]}>Email Address</Text>
              <View style={[local.inputWrapper, { backgroundColor: colors.background, borderColor: colors.input }]}>
                <Feather name="mail" size={18} color={colors.mutedForeground} style={local.inputIcon} />
                <TextInput
                  style={[local.input, { color: colors.foreground }]}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={local.inputGroup}>
              <Text style={[local.label, { color: colors.foreground }]}>Password</Text>
              <View style={[local.inputWrapper, { backgroundColor: colors.background, borderColor: colors.input }]}>
                <Feather name="lock" size={18} color={colors.mutedForeground} style={local.inputIcon} />
                <TextInput
                  style={[local.input, { color: colors.foreground }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Error Message */}
            {errorMessage && (
              <View style={[local.messageBox, { backgroundColor: 'rgba(185, 77, 69, 0.12)' }]}>
                <Feather name="alert-circle" size={16} color={colors.destructive} />
                <Text style={[local.messageText, { color: colors.destructive }]}>{errorMessage}</Text>
              </View>
            )}

            {/* Success Message */}
            {successMessage && (
              <View style={[local.messageBox, { backgroundColor: 'rgba(53, 86, 79, 0.12)' }]}>
                <Feather name="check-circle" size={16} color={colors.secondaryForeground} />
                <Text style={[local.messageText, { color: colors.secondaryForeground }]}>{successMessage}</Text>
              </View>
            )}

            {/* Action Button */}
            <Pressable
              style={({ pressed }) => [
                local.submitButton,
                { backgroundColor: colors.primary, opacity: loading ? 0.7 : pressed ? 0.85 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text style={[local.submitText, { color: colors.primaryForeground }]}>
                  {mode === 'signin' ? 'Sign In with Supabase' : 'Create Free Account'}
                </Text>
              )}
            </Pressable>

            {/* Privacy note */}
            <Text style={[local.footerNote, { color: colors.mutedForeground }]}>
              🔐 Backed by Supabase Row-Level Security. Your daily thoughts are encrypted and private to you.
            </Text>
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

const local = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 25, 23, 0.6)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { alignItems: 'center', justifyContent: 'center' } : {}),
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    ...(Platform.OS === 'web'
      ? { maxWidth: 460, borderRadius: 28, maxHeight: '85%' }
      : {}),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 24,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  submitButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
});
