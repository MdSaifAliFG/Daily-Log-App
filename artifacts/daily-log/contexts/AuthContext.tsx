import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured, loadStoredSupabaseConfig, toValidUuid } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  phoneNumber?: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
}

interface StoredAccount {
  id: string;
  phone10: string;
  formattedPhone: string;
  fullName: string;
  password: string;
  createdAt: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error?: string }>;
  signUp: (phone: string, password: string, fullName: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (
    params: string | { fullName?: string; avatarUrl?: string; bio?: string }
  ) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCAL_ACCOUNTS_KEY = '@daily-log/registered-accounts';
const LOCAL_CURRENT_USER_KEY = '@daily-log/current-user';

async function getStoredAccounts(): Promise<Record<string, StoredAccount>> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

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

      // 1. Check Supabase session first
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data?.session?.user) {
            setSession(data.session);
            setUser(data.session.user);
            await loadUserProfile(data.session.user);
            return;
          }
        } catch {}
      }

      // 2. Check local stored user
      const rawUser = await AsyncStorage.getItem(LOCAL_CURRENT_USER_KEY);
      if (rawUser) {
        const stored = JSON.parse(rawUser) as StoredAccount;
        const validId = toValidUuid(stored.id || stored.phone10);
        if (stored.id !== validId) {
          stored.id = validId;
          await AsyncStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(stored));
          try {
            const accounts = await getStoredAccounts();
            if (accounts[stored.phone10]) {
              accounts[stored.phone10].id = validId;
              await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
            }
          } catch {}
        }

        const fakeUser = {
          id: validId,
          email: `${stored.phone10}@phone.local`,
          created_at: stored.createdAt,
          user_metadata: {
            full_name: stored.fullName,
            phone_number: stored.formattedPhone,
          },
        } as unknown as User;

        setUser(fakeUser);
        setProfile({
          id: validId,
          email: `${stored.phone10}@phone.local`,
          phoneNumber: stored.formattedPhone,
          fullName: stored.fullName,
          avatarUrl: (stored as any).avatarUrl,
          bio: (stored as any).bio,
          createdAt: stored.createdAt,
        });
        return;
      }

      // Not logged in
      setSession(null);
      setUser(null);
      setProfile(null);
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
      const validUid = toValidUuid(currentUser.id);
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', validUid)
        .maybeSingle();

      const phoneMeta = currentUser.user_metadata?.phone_number || '';
      const fallbackName =
        currentUser.user_metadata?.full_name ||
        (phoneMeta ? `User ${phoneMeta.slice(-4)}` : 'Journaler');

      if (data && !error) {
        setProfile({
          id: data.id,
          email: data.email ?? currentUser.email ?? '',
          phoneNumber: data.phone_number || phoneMeta,
          fullName: data.full_name || fallbackName,
          avatarUrl: data.avatar_url ?? undefined,
          bio: currentUser.user_metadata?.bio || '',
          createdAt: data.created_at ?? currentUser.created_at,
        });
      } else {
        const newProfile = {
          id: validUid,
          email: currentUser.email ?? '',
          full_name: fallbackName,
          phone_number: phoneMeta,
        };
        await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });

        setProfile({
          id: validUid,
          email: currentUser.email ?? '',
          phoneNumber: phoneMeta,
          fullName: fallbackName,
          createdAt: currentUser.created_at,
        });
      }
    } catch {
      setProfile({
        id: toValidUuid(currentUser.id),
        email: currentUser.email ?? '',
        phoneNumber: currentUser.user_metadata?.phone_number || '',
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
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await loadUserProfile(newSession.user);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (phone: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return { error: 'Please enter a valid 10-digit phone number.' };
      }
      const phone10 = cleanPhone.slice(-10);
      const authEmail = `p${phone10}@daily-log.internal`;

      // 1. Try Supabase Authentication if configured
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (data?.session && data?.user && !error) {
          setSession(data.session);
          setUser(data.user);
          await loadUserProfile(data.user);

          // Sync local account cache
          const accounts = await getStoredAccounts();
          const existing = accounts[phone10];
          const syncAccount: StoredAccount = {
            id: data.user.id,
            phone10,
            formattedPhone: existing?.formattedPhone || `+91 ${phone10}`,
            fullName: data.user.user_metadata?.full_name || existing?.fullName || 'Journaler',
            password,
            createdAt: data.user.created_at || new Date().toISOString(),
          };
          accounts[phone10] = syncAccount;
          await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
          await AsyncStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(syncAccount));
          return {};
        }
      }

      // 2. Check Local Registered Accounts
      const accounts = await getStoredAccounts();
      const account = accounts[phone10];

      if (!account) {
        return {
          error: 'This phone number is not registered yet. Please create an account / sign up first.',
        };
      }

      if (account.password !== password) {
        return { error: 'Incorrect password. Please try again.' };
      }

      const validId = toValidUuid(account.id || phone10);
      if (account.id !== validId) {
        account.id = validId;
        accounts[phone10].id = validId;
        await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
      }

      // Successful local sign in
      const fakeUser = {
        id: validId,
        email: `${phone10}@phone.local`,
        created_at: account.createdAt,
        user_metadata: {
          full_name: account.fullName,
          phone_number: account.formattedPhone,
          avatar_url: account.avatarUrl || '',
          bio: account.bio || '',
        },
      } as unknown as User;

      setUser(fakeUser);
      setProfile({
        id: validId,
        email: `${phone10}@phone.local`,
        phoneNumber: account.formattedPhone,
        fullName: account.fullName,
        avatarUrl: account.avatarUrl,
        bio: account.bio,
        createdAt: account.createdAt,
      });

      await AsyncStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(account));
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    phone: string,
    password: string,
    fullName: string
  ): Promise<{ error?: string; message?: string }> => {
    try {
      setIsLoading(true);

      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return { error: 'Please enter a valid 10-digit mobile number.' };
      }
      if (password.length < 6) {
        return { error: 'Password must be at least 6 characters.' };
      }
      if (!fullName.trim()) {
        return { error: 'Please enter your full name.' };
      }

      const phone10 = cleanPhone.slice(-10);
      const formattedPhone = `+91 ${phone10}`;
      const authEmail = `p${phone10}@daily-log.internal`;

      const accounts = await getStoredAccounts();
      if (accounts[phone10]) {
        return { error: 'An account with this phone number already exists. Please sign in.' };
      }

      const userId = toValidUuid(phone10);
      let assignedId = userId;

      // 1. Register with Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabase();

          // Try RPC signup_with_phone (direct creation with confirmed email)
          const { data: rpcData, error: rpcError } = await supabase.rpc('signup_with_phone', {
            p_phone: phone10,
            p_password: password,
            p_full_name: fullName.trim(),
          });

          if (!rpcError && rpcData?.success && rpcData?.user_id) {
            assignedId = rpcData.user_id;
            // Immediate sign in
            const { data: signData } = await supabase.auth.signInWithPassword({
              email: authEmail,
              password,
            });
            if (signData?.session && signData?.user) {
              setSession(signData.session);
              setUser(signData.user);
              await loadUserProfile(signData.user);
            }
          }
        } catch (err) {
          console.warn('Supabase cloud signup attempt deferred to local persistence', err);
        }
      }

      // 2. Persist account
      const newAccount: StoredAccount = {
        id: assignedId,
        phone10,
        formattedPhone,
        fullName: fullName.trim(),
        password,
        createdAt: new Date().toISOString(),
      };

      accounts[phone10] = newAccount;
      await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
      await AsyncStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(newAccount));

      // 3. Set local user state if Supabase didn't already
      if (!user) {
        const fakeUser = {
          id: assignedId,
          email: `${phone10}@phone.local`,
          created_at: newAccount.createdAt,
          user_metadata: {
            full_name: newAccount.fullName,
            phone_number: formattedPhone,
          },
        } as unknown as User;

        setUser(fakeUser);
        setProfile({
          id: assignedId,
          email: `${phone10}@phone.local`,
          phoneNumber: formattedPhone,
          fullName: newAccount.fullName,
          createdAt: newAccount.createdAt,
        });
      }

      return { message: 'Account created successfully! Welcome to Daily Log.' };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (
    params: string | { fullName?: string; avatarUrl?: string; bio?: string }
  ): Promise<{ error?: string }> => {
    if (!profile) return { error: 'Not authenticated' };
    try {
      const updates = typeof params === 'string' ? { fullName: params } : params;
      const nextFullName = updates.fullName !== undefined ? updates.fullName.trim() : profile.fullName;
      const nextAvatar = updates.avatarUrl !== undefined ? updates.avatarUrl : profile.avatarUrl;
      const nextBio = updates.bio !== undefined ? updates.bio.trim() : profile.bio;

      // Update Supabase if connected
      if (isSupabaseConfigured() && user) {
        try {
          const supabase = getSupabase();
          const validUid = toValidUuid(user.id);
          await supabase.from('profiles').upsert(
            {
              id: validUid,
              full_name: nextFullName,
              avatar_url: nextAvatar || '',
            },
            { onConflict: 'id' }
          );
          await supabase.auth.updateUser({
            data: {
              full_name: nextFullName,
              avatar_url: nextAvatar || '',
              bio: nextBio || '',
            },
          });
        } catch {}
      }

      // Update local storage
      const accounts = await getStoredAccounts();
      const phone10 = profile.phoneNumber?.replace(/\D/g, '').slice(-10);
      if (phone10 && accounts[phone10]) {
        accounts[phone10].fullName = nextFullName;
        accounts[phone10].avatarUrl = nextAvatar;
        accounts[phone10].bio = nextBio;
        await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
        await AsyncStorage.setItem(
          LOCAL_CURRENT_USER_KEY,
          JSON.stringify({
            ...accounts[phone10],
            avatarUrl: nextAvatar,
            bio: nextBio,
          })
        );
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: nextFullName,
              avatarUrl: nextAvatar,
              bio: nextBio,
            }
          : null
      );
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update profile' };
    }
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        await supabase.auth.signOut().catch(() => {});
      }
      await AsyncStorage.removeItem(LOCAL_CURRENT_USER_KEY);
    } catch (err) {
      console.warn('Sign out error', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const deleteAccount = async (): Promise<{ error?: string }> => {
    try {
      const phone10 = profile?.phoneNumber?.replace(/\D/g, '').slice(-10);

      // Supabase cascade deletion
      if (isSupabaseConfigured() && user) {
        try {
          const supabase = getSupabase();
          try {
            await supabase.rpc('delete_user_account');
          } catch {
            const validUid = toValidUuid(user.id);
            await supabase.from('entries').delete().eq('user_id', validUid);
            await supabase.from('daily_notes').delete().eq('user_id', validUid);
            await supabase.from('routine_completions').delete().eq('user_id', validUid);
            await supabase.from('routine_items').delete().eq('user_id', validUid);
            await supabase.from('profiles').delete().eq('id', validUid);
          }
          await supabase.auth.signOut();
        } catch {}
      }

      // Remove local account
      if (phone10) {
        const accounts = await getStoredAccounts();
        delete accounts[phone10];
        await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
      }

      await AsyncStorage.removeItem(LOCAL_CURRENT_USER_KEY);
      await AsyncStorage.clear();

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
