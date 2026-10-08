import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, loadStoredSupabaseConfig } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  createdAt?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      setIsLoading(true);
      await loadStoredSupabaseConfig();
      const supabase = getSupabase();

      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session) {
        setSession(data.session);
        setUser(data.session.user);
        await loadUserProfile(data.session.user);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.warn('Error initializing auth', error);
      setUser(null);
      setSession(null);
      setProfile(null);
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
        .maybeSingle();

      const fallbackName =
        currentUser.user_metadata?.full_name ||
        (currentUser.email ? currentUser.email.split('@')[0] : 'Journaler');

      if (data && !error) {
        setProfile({
          id: data.id,
          email: data.email ?? currentUser.email ?? '',
          fullName: data.full_name || fallbackName,
          avatarUrl: data.avatar_url ?? undefined,
          createdAt: data.created_at ?? currentUser.created_at,
        });
      } else {
        // Auto-heal: create profile row in Supabase
        const newProfile = {
          id: currentUser.id,
          email: currentUser.email ?? '',
          full_name: fallbackName,
        };
        await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });

        setProfile({
          id: currentUser.id,
          email: currentUser.email ?? '',
          fullName: fallbackName,
          createdAt: currentUser.created_at,
        });
      }
    } catch {
      setProfile({
        id: currentUser.id,
        email: currentUser.email ?? '',
        fullName: currentUser.user_metadata?.full_name ?? 'Journaler',
        createdAt: currentUser.created_at,
      });
    }
  };

  useEffect(() => {
    void initAuth();

    const supabase = getSupabase();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadUserProfile(newSession.user);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await loadUserProfile(data.user);
      }
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error?: string; message?: string }> => {
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

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        await loadUserProfile(data.user);
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

  const updateProfile = async (fullName: string): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const trimmed = fullName.trim();
      const supabase = getSupabase();

      // Update Supabase profile table
      await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: trimmed, email: user.email }, { onConflict: 'id' });

      // Update auth user metadata
      await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });

      setProfile((prev) => (prev ? { ...prev, fullName: trimmed } : null));
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update profile' };
    }
  };

  const signOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const deleteAccount = async (): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const supabase = getSupabase();

      // 1. Attempt RPC call for cascading delete
      const { error: rpcError } = await supabase.rpc('delete_user_account');

      // 2. Fallback: delete user records manually if RPC is not available
      if (rpcError) {
        await supabase.from('entries').delete().eq('user_id', user.id);
        await supabase.from('routine_completions').delete().eq('user_id', user.id);
        await supabase.from('routine_items').delete().eq('user_id', user.id);
        await supabase.from('weekly_reflections').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('id', user.id);
      }

      // 3. Clear local storage
      await AsyncStorage.clear();

      // 4. Sign out session
      await supabase.auth.signOut();

      setUser(null);
      setSession(null);
      setProfile(null);
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to delete account' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        deleteAccount,
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
