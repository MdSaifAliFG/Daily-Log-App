import React, { useState } from 'react';
import {
  ActivityIndicator,
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
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(cleanPhone, password);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          onClose();
        }
      } else {
        const result = await signUp(cleanPhone, password, fullName);
        if (result.error) {
          setErrorMessage(result.error);
        } else {
          setSuccessMessage(result.message || 'Account created successfully!');
          setTimeout(() => {
            onClose();
          }, 1000);
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
                {mode === 'signin' ? 'Phone Sign In' : 'Join Daily Log'}
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
                setSuccessMessage(null);
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
                setSuccessMessage(null);
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
                <Text style={[local.label, { color: colors.foreground }]}>Your Full Name</Text>
                <View style={[local.inputWrapper, { backgroundColor: colors.background, borderColor: colors.input }]}>
                  <Feather name="user" size={18} color={colors.mutedForeground} style={local.inputIcon} />
                  <TextInput
                    style={[local.input, { color: colors.foreground }]}
                    placeholder="e.g. Saif Ali"
                    placeholderTextColor={colors.mutedForeground}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Phone Number Field with +91 India badge */}
            <View style={local.inputGroup}>
              <Text style={[local.label, { color: colors.foreground }]}>Mobile Number</Text>
              <View style={[local.inputWrapper, { backgroundColor: colors.background, borderColor: colors.input }]}>
                <View style={local.countryPrefix}>
                  <Text style={local.flagIcon}>🇮🇳</Text>
                  <Text style={[local.countryCode, { color: colors.foreground }]}>+91</Text>
                  <View style={[local.prefixDivider, { backgroundColor: colors.border }]} />
                </View>
                <TextInput
                  style={[local.input, { color: colors.foreground }]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.mutedForeground}
                  value={phoneNumber}
                  onChangeText={(val) => setPhoneNumber(val.replace(/[^\d\s]/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={12}
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
                  {mode === 'signin' ? 'Sign In with Phone' : 'Create Account'}
                </Text>
              )}
            </Pressable>

            {/* Switch mode prompt */}
            <Pressable
              style={local.switchPromptBtn}
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              <Text style={[local.switchPromptText, { color: colors.mutedForeground }]}>
                {mode === 'signin' ? "Don't have an account? " : 'Already registered? '}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </Pressable>

            {/* Security note */}
            <Text style={[local.footerNote, { color: colors.mutedForeground }]}>
              🔐 Instant access with no email verification required. Your daily log is private to you.
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
    backgroundColor: 'rgba(15, 20, 18, 0.65)',
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
    ...(Platform.OS === 'web' ? { maxWidth: 480, borderRadius: 28, maxHeight: '85%' } : {}),
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
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  countryPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  flagIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
  },
  prefixDivider: {
    width: 1,
    height: 18,
    marginLeft: 10,
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
    lineHeight: 18,
  },
  submitButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchPromptBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  switchPromptText: {
    fontSize: 13,
  },
  footerNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 8,
  },
});
