/**
 * Server-state cache. Defaults are tuned for a tradie on a roof with two bars, not a desk.
 */
import { QueryClient } from '@tanstack/react-query';

import { ApiError, ApiSchemaError } from '@/lib/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // In-memory only: there is no persister, so this keeps data alive for the running
      // process, NOT across a cold start. Offline relaunch still starts empty.
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
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Approving a quote must not silently double-fire on a flaky connection.
      retry: false,
    },
  },
});
