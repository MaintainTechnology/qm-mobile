import '@/polyfills';

import { ClerkProvider, useAuth } from '@clerk/expo';
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
import { type ErrorBoundaryProps, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState, type ReactNode } from 'react';
import { DevSettings, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NetworkStatusBanner } from '@/components/NetworkStatusBanner';
import { BiometricGate } from '@/features/auth/BiometricGate';
import { clerkPublishableKey } from '@/lib/env';
import { captureAppError, initialiseMonitoring, setMonitoringRoute } from '@/lib/monitoring';
import { useNotificationObserver, usePushRegistration } from '@/lib/notifications';
import { usePurchases } from '@/lib/purchases';
import {
  asyncStoragePersister,
  queryClient,
  queryScopeBuster,
  subscribeQueryRuntime,
} from '@/lib/query';
import { themes } from '@/lib/theme';
import { ThemeControlProvider, useTheme } from '@/lib/useTheme';

initialiseMonitoring();
SplashScreen.preventAutoHideAsync();

const APP_VERSION = Constants.expoConfig?.version ?? 'dev';

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

function QueryRuntimeBridge() {
  useEffect(() => subscribeQueryRuntime(), []);
  return null;
}

function MonitoringRouteBridge() {
  const pathname = usePathname();
  useEffect(() => setMonitoringRoute(pathname), [pathname]);
  return null;
}

function StartupFailure({ message, onRetry }: { message: string; onRetry?: () => void }) {
  function restart() {
    if (__DEV__) DevSettings.reload();
    else void Updates.reloadAsync();
  }

  return (
    <View style={startupStyles.screen}>
      <Text accessibilityRole="header" style={startupStyles.title}>
        QuoteMax could not finish starting
      </Text>
      <Text style={startupStyles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restart QuoteMax"
        onPress={onRetry ?? restart}
        style={({ pressed }) => [startupStyles.button, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={startupStyles.buttonLabel}>Restart QuoteMax</Text>
      </Pressable>
    </View>
  );
}

/**
 * Wait for Clerk before touching persisted server state. This prevents a
 * private cache from hydrating under a temporary signed-out scope during cold
 * start, while the buster keeps account A and account B mutually exclusive.
 */
function ScopedServerStateProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const scope = userId ?? 'signed-out';
  const [activeScope, setActiveScope] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), 12_000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    queryClient.clear();
    setActiveScope(scope);
  }, [isLoaded, scope]);

  useEffect(() => {
    if (isLoaded && activeScope === scope) void SplashScreen.hideAsync();
  }, [activeScope, isLoaded, scope]);

  useEffect(() => {
    if (timedOut && !isLoaded) void SplashScreen.hideAsync();
    if (timedOut && !isLoaded) {
      captureAppError(new Error('Clerk startup timed out'), {
        kind: 'startup',
        operationId: 'startup.auth.load',
        route: '/startup',
      });
    }
  }, [isLoaded, timedOut]);

  if (!isLoaded && !timedOut) return null;
  if (!isLoaded) {
    return <StartupFailure message="Your sign-in state did not load. No account data was opened." />;
  }
  if (activeScope !== scope) return null;

  return (
    <PersistQueryClientProvider
      key={scope}
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: queryScopeBuster(APP_VERSION, userId),
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
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
      <NetworkStatusBanner />
      {/* Overlay, not a route: deep links keep resolving underneath the lock. */}
      <BiometricGate />
      <PushBridge />
      <QueryRuntimeBridge />
      <MonitoringRouteBridge />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Exactly the weights src/lib/theme.ts sanctions — anything else synthesises badly.
  const [fontsLoaded, fontError] = useFonts({
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
    if (fontError) {
      void SplashScreen.hideAsync();
      captureAppError(fontError, {
        kind: 'startup',
        operationId: 'startup.fonts.load',
        route: '/startup',
      });
    }
  }, [fontError]);

  if (fontError) {
    return <StartupFailure message="The app fonts could not be loaded. Restart to try the bundled assets again." />;
  }
  if (!fontsLoaded) return null;

  return (
    // GestureHandlerRootView must wrap everything, or swipes and scroll gestures silently no-op.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Clerk Core 3 requires the key to be passed in: EXPO_PUBLIC_* is not
            inlined inside node_modules in a production build, so Clerk cannot
            read it for itself any more. */}
        <ClerkProvider publishableKey={clerkPublishableKey()} tokenCache={tokenCache}>
          <ScopedServerStateProvider>
            <ThemeControlProvider>
              <ThemedApp />
            </ThemeControlProvider>
          </ScopedServerStateProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void SplashScreen.hideAsync();
    captureAppError(error, { kind: 'route', operationId: 'route.render' });
  }, [error]);
  return (
    <StartupFailure
      message={
        __DEV__
          ? `A screen failed safely: ${error.message}`
          : 'A screen failed safely. Your last server-confirmed work is unchanged.'
      }
      onRetry={retry}
    />
  );
}

const startupStyles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: '#16120F',
  },
  title: { color: '#F6F1EA', fontSize: 24, lineHeight: 32, fontWeight: '800' },
  message: { color: '#C3B8AC', fontSize: 16, lineHeight: 24 },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFC400',
    paddingHorizontal: 20,
  },
  buttonLabel: { color: '#1C1812', fontSize: 16, lineHeight: 24, fontWeight: '700' },
});
