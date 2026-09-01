import { useNetInfo } from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { netInfoIsOnline, queryClient } from '@/lib/query';
import { fonts, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

function latestCachedAt(): number {
  return queryClient
    .getQueryCache()
    .getAll()
    .reduce((latest, query) => Math.max(latest, query.state.dataUpdatedAt), 0);
}

function subscribeToCache(onChange: () => void): () => void {
  return queryClient.getQueryCache().subscribe(onChange);
}

export function lastUpdatedLabel(updatedAt: number, now = Date.now()): string | null {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return null;
  const elapsedSeconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (elapsedSeconds < 60) return 'last updated just now';
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `last updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `last updated ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `last updated ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function offlineStatusCopy(updatedAt: number, now = Date.now()): string {
  const updated = lastUpdatedLabel(updatedAt, now);
  return updated
    ? `Offline · showing saved server data, ${updated}. Changes need a connection.`
    : 'Offline · no saved server data is available. Changes need a connection.';
}

/**
 * A single app-level truth signal for X-005. Cached reads remain useful, but
 * writes are never described as queued or successful merely because a tap was
 * accepted while the device is offline.
 */
export function NetworkStatusBanner() {
  const network = useNetInfo();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const updatedAt = useSyncExternalStore(subscribeToCache, latestCachedAt, latestCachedAt);

  if (netInfoIsOnline(network)) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      pointerEvents="none"
      style={[
        styles.banner,
        {
          top: insets.top,
          borderColor: colors.warningBright,
          backgroundColor: colors.inkDeep,
        },
      ]}
    >
      <Text style={[styles.copy, { color: colors.warningBright }]}>
        {offlineStatusCopy(updatedAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    zIndex: 1000,
    left: spacing.md,
    right: spacing.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
