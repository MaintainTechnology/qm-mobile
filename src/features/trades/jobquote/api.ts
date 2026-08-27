/**
 * Job quoter data layer (spec web-parity F2). The catalogue query lives in
 * ../catalogue-api (shared with the hub's Catalogue section).
 */
import { TENANT_ME_KEY } from '@/lib/tenant';
import { useApiMutation } from '@/lib/useApi';

import {
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
