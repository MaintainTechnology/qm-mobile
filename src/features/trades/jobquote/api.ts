/**
 * Job quoter data layer (spec web-parity F2). Catalogue is fetched only when the
 * selected job type calls for item selection (KEY POINTS) — callers pass `enabled`.
 */
import { TENANT_ME_KEY } from '@/lib/tenant';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

import {
  CatalogueResponseSchema,
  JobQuoteResponseSchema,
  type JobQuoteRequest,
  type JobQuoteResponse,
} from './schema';

export function useJobQuote() {
  return useApiMutation<JobQuoteRequest, JobQuoteResponse>(
    '/api/tenant/job-quote',
    JobQuoteResponseSchema,
    {
      // A drafted quote must show up on Home/Quotes immediately, not on the next stale-time refetch.
      invalidates: [TENANT_ME_KEY],
      // The route runs an LLM draft — the 15s default aborts a slow-but-succeeding call client-side.
      timeoutMs: 90000,
    },
  );
}

export function useCatalogue(enabled: boolean) {
  return useApiQuery(['tenant', 'catalogue'], '/api/tenant/catalogue', CatalogueResponseSchema, {
    enabled,
  });
}
