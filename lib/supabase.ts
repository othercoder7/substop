import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const authStorageKey = 'substop-auth-token';
const rememberSessionKey = 'substop-remember-session';

const memoryStorage = new Map<string, string>();

async function getRememberSessionEnabled() {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(rememberSessionKey) !== 'false';
  }

  try {
    return (await AsyncStorage.getItem(rememberSessionKey)) !== 'false';
  } catch {
    return memoryStorage.get(rememberSessionKey) !== 'false';
  }
}

export async function getRememberSessionPreference() {
  return getRememberSessionEnabled();
}

export async function setRememberSessionEnabled(enabled: boolean) {
  const value = enabled ? 'true' : 'false';

  if (Platform.OS === 'web') {
    window.localStorage.setItem(rememberSessionKey, value);

    if (!enabled) {
      window.localStorage.removeItem(authStorageKey);
    }

    return;
  }

  try {
    await AsyncStorage.setItem(rememberSessionKey, value);

    if (!enabled) {
      await AsyncStorage.removeItem(authStorageKey);
    }
  } catch {
    memoryStorage.set(rememberSessionKey, value);

    if (!enabled) {
      memoryStorage.delete(authStorageKey);
    }
  }
}

const storage = {
  getItem: async (key: string) => {
    if (key === authStorageKey && !(await getRememberSessionEnabled())) {
      return null;
    }

    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (key === authStorageKey && !(await getRememberSessionEnabled())) {
      memoryStorage.delete(key);
      return;
    }

    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    storageKey: authStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
