/**
 * /api/tenant/estimation data layer + the pure pieces behind the hub's
 * Estimating editor (web EstimatingTab, page.tsx:13488-13897).
 *
 * GET returns `{ ok, jobs, catalogue_categories }` with per-job BOM lines and
 * the SERVER-resolved effective labour/markup (`{ value, source }`, source
 * 'local'|'global') — there is no trade param; the web filters client-side and
 * so do we. PATCH /api/tenant/estimation/[assemblyId] upserts
 * `{ labour_hours_override, markup_pct_override }` (null clears a field);
 * DELETE removes the override row entirely (the web's "Reset to default").
 *
 * NOT write-gated: unlike the services/catalogue/bom/tasks writers, the PATCH
 * route validates only that the assembly belongs to a trade the tenant runs
 * (`assembly_trade_not_owned`) — no TRADE_ENUM — so overrides save for every
 * hub trade the tenant holds.
 */
import { z } from 'zod';

import { useApiMutation, useApiQuery } from '@/lib/useApi';

export const ESTIMATION_KEY = ['tenant', 'estimation'] as const;

// ── Server bounds, verbatim from the route's PatchSchema ────────────────────
// labour_hours_override: z.number().positive().max(40)
// markup_pct_override:   z.number().min(0).max(200)
export const LABOUR_HOURS_MAX = 40;
export const MARKUP_PCT_MAX = 200;

// ── GET shape ───────────────────────────────────────────────────────────────

/** Web effectiveAssembly's ResolvedParam. `value` nullable: a NaN from a bad
 *  numeric column serialises to null in JSON, and one bad row must not sink
 *  the whole list. */
const ResolvedParamSchema = z.looseObject({
  value: z.number().nullable(),
  source: z.enum(['local', 'global']),
});

const BomLineSchema = z.looseObject({
  material_category: z.string(),
  quantity: z.number(),
  required: z.boolean(),
  description: z.string().nullish(),
});

export const EstimationJobSchema = z.looseObject({
  assembly_id: z.string(),
  name: z.string(),
  trade: z.string().nullish(),
  /** Dollars per hour on the wire (pricing_book.hourly_rate) — display only. */
  hourly_rate: z.number().nullish(),
  enabled: z.boolean().nullish(),
  bom: z.array(BomLineSchema).default([]),
  recipe_source: z.enum(['tenant', 'shared']).nullish(),
  effective: z.looseObject({
    labour_hours: ResolvedParamSchema,
    markup_pct: ResolvedParamSchema,
    global_labour_hours: z.number().nullable(),
    global_markup_pct: z.number().nullable(),
  }),
});
export type EstimationJob = z.infer<typeof EstimationJobSchema>;

export const EstimationResponseSchema = z.looseObject({
  jobs: z.array(EstimationJobSchema).default([]),
});

export function useEstimation() {
  return useApiQuery(ESTIMATION_KEY, '/api/tenant/estimation', EstimationResponseSchema);
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Labour-hours input → number, or null when unusable. Server bound: > 0 and
 *  ≤ 40. `Number` (not parseFloat) so trailing junk ('4h') is rejected, and a
 *  silent NaN can never reach a PATCH. */
export function parseLabourHours(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > LABOUR_HOURS_MAX) return null;
  return n;
}

/** Markup-% input → number, or null when unusable. Server bound: 0–200. */
export function parseMarkupPct(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > MARKUP_PCT_MAX) return null;
  return n;
}

export type EffectiveSource = 'local' | 'global';

/** Mirror of the web's per-param resolution (lib/estimate/catalogue.ts
 *  effectiveAssembly): a SET, finite override wins with source 'local';
 *  absent / null / non-finite falls back to the global default. */
export function resolveEffective(
  globalValue: number,
  override: number | null | undefined,
): { value: number; source: EffectiveSource } {
  return override != null && Number.isFinite(override)
    ? { value: override, source: 'local' }
    : { value: globalValue, source: 'global' };
}

export type OverridePatch = {
  labour_hours_override: number | null;
  markup_pct_override: number | null;
};

/** PATCH body with BOTH fields always present (web parity — a partial edit
 *  must not leave the other field stale); null clears that field back to the
 *  global default. Clearing the whole row is DELETE, not a double-null PATCH. */
export function buildOverridePatch(
  labourHours: number | null,
  markupPct: number | null,
): OverridePatch {
  return { labour_hours_override: labourHours, markup_pct_override: markupPct };
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** Both write routes answer `{ ok: true }`; pin the literal so a 200-with-
 *  ok:false lands in the error path instead of reading as saved. */
const OkSchema = z.looseObject({ ok: z.literal(true) });
type OkResult = z.infer<typeof OkSchema>;

/** PATCH /api/tenant/estimation/[assemblyId] — save both override fields. */
export function useSaveEstimationOverride() {
  return useApiMutation<{ assembly_id: string } & OverridePatch, OkResult>(
    body => `/api/tenant/estimation/${encodeURIComponent(body.assembly_id)}`,
    OkSchema,
    { method: 'PATCH', invalidates: [ESTIMATION_KEY] },
  );
}

/** DELETE /api/tenant/estimation/[assemblyId] — remove the override row
 *  entirely (the web's "Reset to default"). */
export function useClearEstimationOverride() {
  return useApiMutation<{ assembly_id: string }, OkResult>(
    body => `/api/tenant/estimation/${encodeURIComponent(body.assembly_id)}`,
    OkSchema,
    { method: 'DELETE', invalidates: [ESTIMATION_KEY] },
  );
}
