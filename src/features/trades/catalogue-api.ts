/**
 * Shared /api/tenant/catalogue data layer. The hub Catalogue section and the job
 * quoter both read this endpoint; they previously cached different shapes under
 * the same react-query key, so whichever fetch landed last poisoned the other's
 * cache. One schema + one key here is the fix. Wire prices are dollars ex-GST
 * (`unit_price_ex_gst`), per the web contract.
 */
import { z } from 'zod';

import { useApiQuery } from '@/lib/useApi';

export const CATALOGUE_KEY = ['tenant', 'catalogue'];

export const CatalogueRowSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  trade: z.string().nullable(),
  brand: z.string().nullable(),
  range_series: z.string().nullable(),
  unit_price_ex_gst: z.union([z.number(), z.string()]).nullable(),
  image_path: z.string().nullable(),
  tier_hint: z.string().nullable(),
  active: z.boolean().nullable(),
});
export type CatalogueRow = z.infer<typeof CatalogueRowSchema>;

export const CatalogueResponseSchema = z.looseObject({
  catalogue: z.array(CatalogueRowSchema).default([]),
});

export function useCatalogue(enabled = true) {
  return useApiQuery(CATALOGUE_KEY, '/api/tenant/catalogue', CatalogueResponseSchema, { enabled });
}
