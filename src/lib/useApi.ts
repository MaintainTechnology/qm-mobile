/**
 * Authed data layer (spec web-parity H1). Every `/api/tenant/*` route on the QuoteMax backend
 * expects a Clerk Bearer token; these hooks mint one per request via `useAuth().getToken()` and
 * route through the zod-validated `apiRequest`, cached by react-query's offline-tolerant defaults.
 *
 * Retry policy lives ONLY in src/lib/query.ts (no per-call overrides — 4xx never retries there
 * already, and per-endpoint knobs erode the central policy one query at a time).
 */
import { useAuth } from '@clerk/expo';
import {
  useMutation,
  type UseMutationOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { z } from 'zod';

import { apiRequest } from '@/lib/api';

export function useApiQuery<T>(
  key: readonly unknown[],
  path: string,
  schema: z.ZodType<T>,
  opts: { enabled?: boolean } = {},
) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      apiRequest(path, schema, { signal, token: (await getToken()) ?? undefined }),
    ...opts,
  });
}

type ApiMutationOptions<TBody, TResult> = Omit<
  UseMutationOptions<TResult, unknown, TBody, unknown>,
  'mutationFn'
> & {
  method?: 'POST' | 'PATCH' | 'DELETE';
  invalidates?: readonly (readonly unknown[])[];
  /** Budget for slow non-idempotent calls (activation, LLM drafts) — see apiRequest.timeoutMs. */
  timeoutMs?: number;
};

export function useApiMutation<TBody, TResult>(
  path: string | ((body: TBody) => string),
  schema: z.ZodType<TResult>,
  {
    method = 'POST',
    invalidates = [],
    timeoutMs,
    onSuccess,
    ...mutationOptions
  }: ApiMutationOptions<TBody, TResult> = {},
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TBody) =>
      apiRequest(typeof path === 'function' ? path(body) : path, schema, {
        method,
        body,
        timeoutMs,
        token: (await getToken()) ?? undefined,
      }),
    ...mutationOptions,
    onSuccess: (data, variables, context, mutation) => {
      for (const key of invalidates) void queryClient.invalidateQueries({ queryKey: [...key] });
      return onSuccess?.(data, variables, context, mutation);
    },
  });
}
