import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';

export type AppearanceMode = 'system' | 'light' | 'dark';

type AppearanceContextValue = {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const STORAGE_KEY = '@daily-log/appearance';

function applyTheme(mode: AppearanceMode) {
  // 1. Native status and system scheme
  if (Platform.OS !== 'web' && typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }

  // 2. Web DOM styling & HTML theme attribute
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    if (document.body) {
      document.body.style.backgroundColor = isDark ? '#1d2929' : '#f7f2ea';
      document.body.style.color = isDark ? '#f4eee5' : '#26343a';
    }
  }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'system' || value === 'light' || value === 'dark') {
        setModeState(value);
        applyTheme(value);
      } else {
        applyTheme('system');
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        if (mode === 'system') applyTheme('system');
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [mode]);

  const setMode = (nextMode: AppearanceMode) => {
    setModeState(nextMode);
    applyTheme(nextMode);
    void AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };

  return (
    <AppearanceContext.Provider value={{ mode, setMode }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance must be used inside AppearanceProvider');
  return value;
}