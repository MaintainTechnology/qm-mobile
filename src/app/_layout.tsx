import '@/polyfills';

import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
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
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePurchases } from '@/lib/purchases';
import { queryClient } from '@/lib/query';
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

/** Inside ThemeControlProvider so the in-app toggle restyles navigation too. */
function ThemedApp() {
  const { isDark } = useTheme();
  // RevenueCat: configure at launch, keep the customer tied to the Clerk session.
  usePurchases();
  return (
    <ThemeProvider value={isDark ? navDark : navLight}>
      <Stack screenOptions={{ headerShown: false }} />
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
        {/* Publishable key comes from EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY; Clerk
            throws its own descriptive error when it is missing. */}
        <ClerkProvider tokenCache={tokenCache}>
          <QueryClientProvider client={queryClient}>
            <ThemeControlProvider>
              <ThemedApp />
            </ThemeControlProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
