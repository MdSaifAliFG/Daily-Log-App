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

/**
 * Ensures any identifier (phone number, custom user id, or legacy id)
 * is represented as a valid RFC 4122 v4 UUID string suitable for PostgreSQL.
 */
export function toValidUuid(input: string | null | undefined): string {
  if (!input) return '00000000-0000-0000-0000-000000000000';
  const trimmed = String(input).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // If this was a legacy usr_<phone>_<timestamp> format or phone number, normalize to the 10-digit phone seed
  let seed = trimmed;
  const legacyPhoneMatch = trimmed.match(/^usr_(\d{10})/);
  if (legacyPhoneMatch) {
    seed = legacyPhoneMatch[1];
  } else {
    const rawDigits = trimmed.replace(/\D/g, '');
    if (rawDigits.length >= 10 && (trimmed.startsWith('+') || /^\d+$/.test(trimmed))) {
      seed = rawDigits.slice(-10);
    }
  }

  // Derive deterministic 128-bit RFC 4122 v4 UUID from seed string
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x61c88647, h4 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2246822507);
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const hex = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`.toLowerCase();
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
