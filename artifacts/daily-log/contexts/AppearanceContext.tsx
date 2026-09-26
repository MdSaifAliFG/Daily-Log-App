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

function applyNativeColorScheme(mode: AppearanceMode) {
  if (Platform.OS !== 'web' && typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'system' || value === 'light' || value === 'dark') {
        setModeState(value);
        applyNativeColorScheme(value);
      }
    });
  }, []);

  const setMode = (nextMode: AppearanceMode) => {
    setModeState(nextMode);
    applyNativeColorScheme(nextMode);
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