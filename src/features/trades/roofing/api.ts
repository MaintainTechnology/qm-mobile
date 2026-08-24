/**
 * Roofing measure mutations (spec web-parity F1). Thin useApiMutation wrappers —
 * see src/lib/useApi.ts for the Clerk-authed fetch + zod-parse plumbing.
 */
import { TENANT_ME_KEY } from '@/lib/tenant';
import { useApiMutation } from '@/lib/useApi';

import {
  MeasureAllResponseSchema,
  SaveAsQuoteResponseSchema,
  SaveRoofResponseSchema,
  type MeasureAllRequest,
  type MeasureAllResponse,
  type SaveAsQuoteRequest,
  type SaveAsQuoteResponse,
  type SaveRoofRequest,
  type SaveRoofResponse,
} from './schema';

export function useMeasureRoof() {
  return useApiMutation<MeasureAllRequest, MeasureAllResponse>(
    '/api/roofing/measure-all',
    MeasureAllResponseSchema,
    // Measures every structure on the property against the provider — the 15s default
    // aborts a slow-but-succeeding call client-side.
    { timeoutMs: 120000 },
  );
}

export function useSaveRoof() {
  return useApiMutation<SaveRoofRequest, SaveRoofResponse>(
    '/api/roofing/save',
    SaveRoofResponseSchema,
  );
}

export function useSaveRoofAsQuote() {
  return useApiMutation<SaveAsQuoteRequest, SaveAsQuoteResponse>(
    '/api/roofing/save-as-quote',
    SaveAsQuoteResponseSchema,
    // A promoted measurement is a real quote — the Home/Quotes tabs must see it too.
    { invalidates: [TENANT_ME_KEY] },
  );
}
