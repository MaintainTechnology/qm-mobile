import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { safeDestination } from '@/lib/destinations';
import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

export default function ResolveLinkScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { target } = useLocalSearchParams<{ target?: string | string[] }>();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const rawTarget = singleParam(target);
    const destination = rawTarget ? safeDestination(rawTarget) : null;
    if (!destination || destination.audience === 'staff') {
      router.replace('/invalid-link' as Href);
      return;
    }
    if (destination.audience === 'public') { router.replace(destination.href as Href); return; }
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace({ pathname: '/sign-in', params: { intent: destination.href } });
      return;
    }
    router.replace(destination.href as Href);
  }, [isLoaded, isSignedIn, router, target]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep }]}>
      <ActivityIndicator accessibilityLabel="Opening QuoteMax link" color={colors.accent} />
      <Text style={[styles.label, { color: colors.textSec }]}>Opening the right workspace…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  label: { ...type.body, textAlign: 'center' },
});
