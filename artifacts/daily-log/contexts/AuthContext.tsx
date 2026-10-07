import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, loadStoredSupabaseConfig } from '@/lib/supabase';

const GUEST_KEY = '@daily-log/is-guest';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isGuest: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  reloadConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const initAuth = async () => {
    try {
      setIsLoading(true);
      await loadStoredSupabaseConfig();
      const configured = isSupabaseConfigured();
      setIsConfigured(configured);

      // Check guest mode preference
      const guestStored = await AsyncStorage.getItem(GUEST_KEY);
      if (guestStored === 'true') {
        setIsGuest(true);
      }

      if (configured) {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          setIsGuest(false);
          await loadUserProfile(data.session.user);
        }
      }
    } catch (error) {
      console.warn('Error initializing auth', error);
      // Fallback to guest mode on error so user is never blocked
      setIsGuest(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (currentUser: User) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data && !error) {
        setProfile({
          id: data.id,
          email: data.email ?? currentUser.email ?? '',
          fullName: data.full_name ?? currentUser.user_metadata?.full_name ?? 'Journaler',
          avatarUrl: data.avatar_url ?? undefined,
        });
      } else {
        setProfile({
          id: currentUser.id,
          email: currentUser.email ?? '',
          fullName: currentUser.user_metadata?.full_name ?? (currentUser.email ? currentUser.email.split('@')[0] : 'Journaler'),
        });
      }
    } catch {
      setProfile({
        id: currentUser.id,
        email: currentUser.email ?? '',
        fullName: currentUser.user_metadata?.full_name ?? 'Journaler',
      });
    }
  };

  useEffect(() => {
    void initAuth();

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            setIsGuest(false);
            await AsyncStorage.setItem(GUEST_KEY, 'false');
            await loadUserProfile(newSession.user);
          } else {
            setProfile(null);
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [isConfigured]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isConfigured) {
      return { error: 'Supabase credentials are not configured yet. You can configure them in Settings or continue as Guest.' };
    }
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message };
      }
      setIsGuest(false);
      await AsyncStorage.setItem(GUEST_KEY, 'false');
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error?: string; message?: string }> => {
    if (!isConfigured) {
      return { error: 'Supabase credentials are not configured yet. Configure them in Settings first.' };
    }
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        setIsGuest(false);
        await AsyncStorage.setItem(GUEST_KEY, 'false');
        return { message: 'Account created successfully!' };
      } else {
        return { message: 'Please check your email to confirm your account, then sign in.' };
      }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (isConfigured) {
        const supabase = getSupabase();
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsGuest(true);
      await AsyncStorage.setItem(GUEST_KEY, 'true');
    } catch (err) {
      console.warn('Sign out error', err);
    }
  };

  const continueAsGuest = async () => {
    setIsGuest(true);
    await AsyncStorage.setItem(GUEST_KEY, 'true');
  };

  const reloadConfig = async () => {
    await initAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isGuest,
        isLoading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        continueAsGuest,
        reloadConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
