import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = '@daily-log/supabase-config';

// Default / fallback placeholder credentials
const FALLBACK_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const FALLBACK_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let cachedUrl = FALLBACK_URL;
let cachedKey = FALLBACK_ANON_KEY;
let clientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    cachedUrl &&
      cachedKey &&
      cachedUrl.startsWith('https://') &&
      cachedUrl.includes('.supabase.co') &&
      cachedKey.length > 20
  );
}

export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    const validUrl = isSupabaseConfigured() ? cachedUrl : 'https://placeholder.supabase.co';
    const validKey = isSupabaseConfigured() ? cachedKey : 'placeholder-anon-key-placeholder';
    
    clientInstance = createClient(validUrl, validKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return clientInstance;
}

export async function loadStoredSupabaseConfig(): Promise<{ url: string; key: string }> {
  try {
    const stored = await AsyncStorage.getItem(SUPABASE_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.key) {
        cachedUrl = parsed.url;
        cachedKey = parsed.key;
        clientInstance = null; // Recreate client with new credentials
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load stored Supabase configuration', error);
  }
  return { url: cachedUrl, key: cachedKey };
}

export async function saveSupabaseConfig(url: string, key: string): Promise<boolean> {
  try {
    const trimmedUrl = url.trim().replace(/\/+$/, '');
    const trimmedKey = key.trim();
    cachedUrl = trimmedUrl;
    cachedKey = trimmedKey;
    await AsyncStorage.setItem(
      SUPABASE_CONFIG_KEY,
      JSON.stringify({ url: trimmedUrl, key: trimmedKey })
    );
    clientInstance = null; // Reset instance
    return true;
  } catch (error) {
    console.error('Failed to save Supabase configuration', error);
    return false;
  }
}

export async function clearSupabaseConfig(): Promise<void> {
  cachedUrl = FALLBACK_URL;
  cachedKey = FALLBACK_ANON_KEY;
  clientInstance = null;
  await AsyncStorage.removeItem(SUPABASE_CONFIG_KEY);
}
