/**
 * Data layer for the hub tool panels: signage compliance and the painting /
 * roofing saved-jobs histories.
 *
 * Contracts, verbatim from the web:
 * - GET /api/signage/sweeps        (app/api/signage/sweeps/route.ts)  → { ok, sweeps[…requests] }
 * - GET /api/signage/queue?status=all (app/api/signage/queue/route.ts) → { ok, rollup, fleet, queue }
 * - GET /api/painting/save         (app/api/painting/save/route.ts)   → { ok, jobs }
 * - GET /api/roofing/save          (app/api/roofing/save/route.ts)    → { ok, jobs }
 *
 * `ok` is pinned to literal true so a 200-with-ok:false (the save routes'
 * `list_failed` envelope) fails the parse and lands in the query's error path
 * instead of rendering as an empty history.
 *
 * Money fields (`better_inc_gst`, `combined_better_inc_gst`) are INC-GST
 * dollars, denormalised server-side — rendered verbatim via
 * centsFromApiDollars + formatAud, never recomputed here.
 */
import { z } from 'zod';

import { centsFromApiDollars, formatAud } from '@/lib/money';
import { useApiQuery } from '@/lib/useApi';

export const SIGNAGE_SWEEPS_KEY = ['signage', 'sweeps'] as const;
export const SIGNAGE_QUEUE_KEY = ['signage', 'queue'] as const;
export const PAINTING_SAVED_KEY = ['painting', 'saved'] as const;
export const ROOFING_SAVED_KEY = ['roofing', 'saved'] as const;

// ── Signage: sweeps + requests (web SgSweep/SgRequest, page.tsx:16223-16232) ──

export const SignageRequestSchema = z.looseObject({
  id: z.string(),
  studio_name: z.string(),
  token: z.string(),
  link: z.string(),
  state: z.string(),
  overall: z.string().nullable(),
  assessment_id: z.string().nullable(),
});
export type SignageRequest = z.infer<typeof SignageRequestSchema>;

export const SignageSweepSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  status: z.string(),
  requests: z.array(SignageRequestSchema).default([]),
});
export type SignageSweep = z.infer<typeof SignageSweepSchema>;

export const SignageSweepsResponseSchema = z.looseObject({
  ok: z.literal(true),
  sweeps: z.array(SignageSweepSchema).default([]),
});

export function useSignageSweeps() {
  return useApiQuery(SIGNAGE_SWEEPS_KEY, '/api/signage/sweeps', SignageSweepsResponseSchema);
}

// ── Signage: fleet rollup (web SgRollup, computed server-side in queue/route.ts) ──

export const SignageRollupSchema = z.looseObject({
  studios: z.number(),
  assessed: z.number(),
  pass: z.number(),
  fix_needed: z.number(),
  needs_review: z.number(),
  awaiting: z.number(),
});
export type SignageRollup = z.infer<typeof SignageRollupSchema>;

/** The route also returns fleet + queue; this panel only renders the rollup. */
export const SignageQueueResponseSchema = z.looseObject({
  ok: z.literal(true),
  rollup: SignageRollupSchema,
});

export function useSignageQueue() {
  return useApiQuery(SIGNAGE_QUEUE_KEY, '/api/signage/queue?status=all', SignageQueueResponseSchema);
}

// ── Painting saved jobs (web SavedPaintJob, page.tsx:16470-16486) ──────────

export const SavedPaintJobSchema = z.looseObject({
  id: z.string(),
  address: z.string().nullable(),
  postcode: z.string().nullable(),
  state: z.string().nullable(),
  customer_name: z.string().nullable(),
  source: z.string().nullable(),
  scopes: z.array(z.string()).nullable(),
  floor_area_m2: z.number().nullable(),
  total_area_m2: z.number().nullable(),
  confidence: z.string().nullable(),
  /** INC-GST dollars, denormalised server-side. Display only. */
  better_inc_gst: z.number().nullable(),
  routing: z.string().nullable(),
  public_token: z.string().nullable(),
  estimate_token: z.string().nullable(),
  created_at: z.string(),
});
export type SavedPaintJob = z.infer<typeof SavedPaintJobSchema>;

export const SavedPaintJobsResponseSchema = z.looseObject({
  ok: z.literal(true),
  jobs: z.array(SavedPaintJobSchema).default([]),
});

export function usePaintingSavedJobs() {
  return useApiQuery(PAINTING_SAVED_KEY, '/api/painting/save', SavedPaintJobsResponseSchema);
}

// ── Roofing saved jobs (web SavedRoofJob, page.tsx:16684-16697) ────────────

export const SavedRoofJobSchema = z.looseObject({
  id: z.string(),
  address: z.string().nullable(),
  postcode: z.string().nullable(),
  state: z.string().nullable(),
  customer_name: z.string().nullable(),
  structure_count: z.number().nullable(),
  combined_area_m2: z.number().nullable(),
  /** INC-GST dollars for the included selection, denormalised server-side. Display only. */
  combined_better_inc_gst: z.number().nullable(),
  routing: z.string().nullable(),
  public_token: z.string().nullable(),
  measure_token: z.string().nullable(),
  created_at: z.string(),
});
export type SavedRoofJob = z.infer<typeof SavedRoofJobSchema>;

export const SavedRoofJobsResponseSchema = z.looseObject({
  ok: z.literal(true),
  jobs: z.array(SavedRoofJobSchema).default([]),
});

export function useRoofingSavedJobs() {
  return useApiQuery(ROOFING_SAVED_KEY, '/api/roofing/save', SavedRoofJobsResponseSchema);
}

// ── Pure helpers (the only client-side maths the web tabs do) ──────────────

export type RecentSignageRequest = SignageRequest & {
  sweep_name: string;
  sweep_created_at: string;
};

/**
 * Web SignageHubTab parity (page.tsx:16293-16298): flatten every sweep's
 * requests into one recent-first history list. Sweeps come back newest-first
 * from the API, so plain order-preserving flattening keeps recency. Each row
 * carries its sweep's name + created_at for the meta line.
 */
export function flattenRecentRequests(sweeps: readonly SignageSweep[]): RecentSignageRequest[] {
  const out: RecentSignageRequest[] = [];
  for (const sw of sweeps) {
    for (const r of sw.requests) {
      out.push({ ...r, sweep_name: sw.name, sweep_created_at: sw.created_at });
    }
  }
  return out;
}

export type SignageChipTone = 'success' | 'warn' | 'dim';

/** Web SgChip mapping, verbatim (page.tsx:16449-16461): the latest assessment's
 *  overall wins; otherwise the request state decides. */
export function signageChip(
  state: string,
  overall: string | null,
): { label: string; tone: SignageChipTone } {
  if (overall === 'pass') return { label: 'Compliant', tone: 'success' };
  if (overall === 'fix_needed') return { label: 'To fix', tone: 'warn' };
  if (overall === 'needs_review') return { label: 'Needs review', tone: 'warn' };
  if (state === 'submitted') return { label: 'Scoring…', tone: 'dim' };
  return { label: 'Awaiting', tone: 'dim' };
}

/** Web formatDate parity (page.tsx:16192-16203): en-AU "28 Aug 26"; unparseable
 *  input falls through unchanged. */
export function formatJobDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
}

/** API dollars → "A$1,234.50", or an em dash when the row has no price (web
 *  fmtAUD's null/non-finite guard). Formatting only — never arithmetic. */
export function formatJobPrice(dollars: number | null | undefined): string {
  if (dollars == null || !Number.isFinite(dollars)) return '—';
  return formatAud(centsFromApiDollars(dollars));
}

/** The paint job's web page for a tradie tap-through: the tradie estimate
 *  results (/p/…) first, else the customer quote page — the same links the web
 *  hub row offers (page.tsx:16627-16643). */
export function paintJobHref(job: SavedPaintJob): string | null {
  if (job.estimate_token) return `/p/${job.estimate_token}`;
  if (job.public_token) return `/q/paint/${job.public_token}`;
  return null;
}

/** The roof job's web page: the rich measurement view (?full=1 — web
 *  page.tsx:16851-16857) first, else the tradie measurement results page. */
export function roofJobHref(job: SavedRoofJob): string | null {
  if (job.public_token) return `/q/roof/${job.public_token}?full=1`;
  if (job.measure_token) return `/m/${job.measure_token}`;
  return null;
}
