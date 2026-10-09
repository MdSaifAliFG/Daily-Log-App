import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppearanceProvider } from '@/contexts/AppearanceContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { WelcomeView } from '@/components/WelcomeView';
import { useColors } from '@/hooks/useColors';

// Prevent splash screen auto-hide until assets load
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { LoadingScreen } from '@/components/LoadingScreen';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // If user is not signed in, display the Landing / Welcome screen
  if (!user) {
    return <WelcomeView />;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="routine" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    'Amazon Ember Display': require('@/assets/fonts/AmazonEmberDisplay_Rg.ttf'),
    'AmazonEmberDisplay-Regular': require('@/assets/fonts/AmazonEmberDisplay_Rg.ttf'),
    'AmazonEmberDisplay-Medium': require('@/assets/fonts/AmazonEmberDisplay_Md.ttf'),
    'AmazonEmberDisplay-Bold': require('@/assets/fonts/AmazonEmberDisplay_Bd.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'amazon-ember-display-global-font';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body, #root, input, textarea, select, button {
            font-family: 'Amazon Ember Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
          [class*="css-text"]:not([style*="font-family: feather"]):not([style*="font-family: Feather"]) {
            font-family: 'Amazon Ember Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <AppearanceProvider>
          <LoadingScreen message="Starting Daily Log…" />
        </AppearanceProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <AuthProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={local.flex}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </AuthProvider>
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

const local = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
