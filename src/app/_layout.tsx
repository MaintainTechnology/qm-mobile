import '@/polyfills';

import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricGate } from '@/features/auth/BiometricGate';
import { clerkPublishableKey } from '@/lib/env';
import { useNotificationObserver, usePushRegistration } from '@/lib/notifications';
import { usePurchases } from '@/lib/purchases';
import { asyncStoragePersister, queryClient } from '@/lib/query';
import { themes } from '@/lib/theme';
import { ThemeControlProvider, useTheme } from '@/lib/useTheme';

SplashScreen.preventAutoHideAsync();

// Navigation's own theme only paints transition backgrounds and headers, but a
// mismatched background flashes white between screens on the dark canvas.
const navDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: themes.dark.inkDeep,
    card: themes.dark.inkCard,
    border: themes.dark.inkLine,
    text: themes.dark.textPri,
    primary: themes.dark.accent,
  },
};
const navLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: themes.light.inkDeep,
    card: themes.light.inkCard,
    border: themes.light.inkLine,
    text: themes.light.textPri,
    primary: themes.light.accentInk,
  },
};

/** Null render: push registration + tap routing need Clerk and router context from this tree. */
function PushBridge() {
  usePushRegistration();
  useNotificationObserver();
  return null;
}

/** Inside ThemeControlProvider so the in-app toggle restyles navigation too. */
function ThemedApp() {
  const { isDark } = useTheme();
  // RevenueCat: configure at launch, keep the customer tied to the Clerk session,
  // and keep cached entitlements live as renewals and purchases land.
  usePurchases();
  return (
    <ThemeProvider value={isDark ? navDark : navLight}>
      <Stack screenOptions={{ headerShown: false }} />
      {/* Overlay, not a route: deep links keep resolving underneath the lock. */}
      <BiometricGate />
      <PushBridge />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Exactly the weights src/lib/theme.ts sanctions — anything else synthesises badly.
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    // GestureHandlerRootView must wrap everything, or swipes and scroll gestures silently no-op.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Clerk Core 3 requires the key to be passed in: EXPO_PUBLIC_* is not
            inlined inside node_modules in a production build, so Clerk cannot
            read it for itself any more. */}
        <ClerkProvider publishableKey={clerkPublishableKey()} tokenCache={tokenCache}>
          {/* Same queryClient as before, now rehydrated from AsyncStorage on cold
              start (src/lib/query.ts). maxAge mirrors the client's 24h gcTime, and
              the app version busts the cache across OTA/store updates so a stale
              shape never meets new screen code. */}
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: asyncStoragePersister,
              maxAge: 24 * 60 * 60 * 1000,
              buster: Constants.expoConfig?.version ?? 'dev',
            }}
          >
            <ThemeControlProvider>
              <ThemedApp />
            </ThemeControlProvider>
          </PersistQueryClientProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
