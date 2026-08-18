/**
 * Server-state cache. Defaults are tuned for a tradie on a roof with two bars, not a desk.
 */
import { QueryClient } from '@tanstack/react-query';

import { ApiError, ApiSchemaError } from '@/lib/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data stays usable while the network is unreachable.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        // A 4xx or a schema mismatch will fail identically every time — don't burn battery.
        if (error instanceof ApiSchemaError) return false;
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Approving a quote must not silently double-fire on a flaky connection.
      retry: false,
    },
  },
});
