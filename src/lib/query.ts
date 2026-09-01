/**
 * Server-state cache. Defaults are tuned for a tradie on a roof with two bars, not a desk.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { ApiError, ApiSchemaError } from '@/lib/api';

/**
 * Cold-start persistence: PersistQueryClientProvider (src/app/_layout.tsx) rehydrates
 * this cache from AsyncStorage, so an offline relaunch on site still shows the last-known
 * quotes instead of an empty app. Its maxAge matches gcTime below.
 */
export const asyncStoragePersister = createAsyncStoragePersister({ storage: AsyncStorage });

/**
 * A persisted cache is valid only for the Clerk identity that created it.  The
 * version remains part of the buster so an OTA/store schema change also drops
 * old data.  Keep this pure: account-switch and cold-start behaviour is covered
 * without mounting Clerk or AsyncStorage in unit tests.
 */
export function queryScopeBuster(appVersion: string, clerkUserId: string | null): string {
  return `${appVersion}:clerk:${clerkUserId ?? 'signed-out'}`;
}

/** `null` reachability means "not measured", not offline. */
export function netInfoIsOnline(
  state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>,
): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/**
 * React Query's browser focus/online defaults do not observe React Native.
 * Mount this once at the app root so stale reads revalidate after a provider
 * hand-off, foregrounding, or network recovery. React Query deduplicates active
 * observers; mutations still never retry automatically.
 */
export function subscribeQueryRuntime(): () => void {
  const unsubscribeNetwork = NetInfo.addEventListener(state => {
    onlineManager.setOnline(netInfoIsOnline(state));
  });

  const appStateSubscription =
    Platform.OS === 'web'
      ? null
      : AppState.addEventListener('change', status => {
          focusManager.setFocused(status === 'active');
        });

  return () => {
    unsubscribeNetwork();
    appStateSubscription?.remove();
    // Restore the managers' platform defaults if Fast Refresh remounts the root.
    focusManager.setFocused(undefined);
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      // `failureCount` is 0-based here, so `< 2` means 3 attempts total.
      retry: (failureCount, error) => {
        // A 4xx or a schema mismatch will fail identically every time — don't burn battery.
        if (error instanceof ApiSchemaError) return false;
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      // react-query's default backoff is 1s/2s/4s — seven seconds of dead air on a dead
      // socket, where every attempt fails instantly anyway. A tradie re-checking a job on
      // two bars needs the verdict fast, not a maximally polite retry ladder.
      retryDelay: failureCount => Math.min(400 * 2 ** failureCount, 3000),
      // A query that already failed this session must not silently run a whole fresh retry
      // ladder every time a screen remounts — the screens all offer an explicit Retry.
      retryOnMount: false,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Approving a quote must not silently double-fire on a flaky connection.
      retry: false,
    },
  },
});
