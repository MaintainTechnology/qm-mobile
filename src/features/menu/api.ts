/**
 * Menu-tab data layer (spec web-parity G1–G3).
 *
 * Labour rates go through `PATCH /api/tenant/me` (`pricing_by_trade`) — matches
 * quotemate-automation/lib/tenant/update-schema.ts `PricingFields` exactly: `hourly_rate`,
 * `call_out_minimum`, `default_markup_pct` are real columns on the `pricing_book` row that
 * schema validates.
 *
 * ponytail: roofing/painting rates deliberately do NOT PATCH `/api/tenant/me`, even though the
 * task brief named that endpoint. Traced the actual backend: the 7 roofing materials and the
 * painting $/unit rates live in `pricing_book.overlays.{roofing,painting}_rate_card` (jsonb),
 * edited only by the dedicated `/api/tenant/roofing-rates` and `/api/tenant/painting-rates`
 * routes (quotemate-automation app/api/tenant/{roofing,painting}-rates/route.ts).
 * `/api/tenant/me`'s `UpdateSchema` has no matching fields — `pricing`/`pricing_by_trade` validate
 * against `PricingFields`, which silently strips unknown keys, so a PATCH there would return
 * `{ok:true}` while persisting nothing. A false "Saved" on a money field is worse than deviating
 * from the literal instruction, so this file targets the routes that actually persist the write.
 * Both routes REPLACE the whole overlay object per request, so every save here round-trips the
 * currently-loaded `overrides` and only changes the keys the tradie touched — otherwise a mobile
 * save would silently wipe loadings/multipliers/take-off knobs the tradie set from the web
 * dashboard. `OverlayRatesCard` owns that merge; see its header.
 */
import { z } from 'zod';

import { TENANT_ME_KEY } from '@/lib/tenant';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

// ── Labour rates — PATCH /api/tenant/me (pricing_by_trade) ─────────────────

/** A `number | string | null | undefined` pricing field (Postgres numeric columns often arrive as
 *  strings) as a display string for a `Field`. */
export function rateToInput(value: number | string | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

const TenantMePatchResultSchema = z.looseObject({ ok: z.boolean() });

export type LabourPricingFields = {
  hourly_rate: number;
  call_out_minimum: number;
  default_markup_pct: number;
};

export function useSaveLabourRates() {
  return useApiMutation<
    { pricing_by_trade: Record<string, LabourPricingFields> },
    z.infer<typeof TenantMePatchResultSchema>
  >('/api/tenant/me', TenantMePatchResultSchema, { method: 'PATCH', invalidates: [TENANT_ME_KEY] });
}

// ── Roofing/painting rates — /api/tenant/{roofing,painting}-rates ──────────
// Same response envelope on both GET and PATCH, so one pair of schemas covers both routes.

const OverlayGetSchema = z.looseObject({
  ok: z.boolean(),
  overrides: z.record(z.string(), z.unknown()).nullish(),
  has_pricing_book: z.boolean().nullish(),
});
export type OverlayGet = z.infer<typeof OverlayGetSchema>;

const OverlayPatchResultSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().nullish(),
  issues: z.array(z.looseObject({ field: z.string(), message: z.string() })).nullish(),
});
export type OverlayPatchResult = z.infer<typeof OverlayPatchResultSchema>;

const ROOFING_RATES_KEY = ['tenant', 'roofing-rates'] as const;

/** The web dashboard's 7 editable roofing materials (RoofRatesEditor.tsx `MATERIALS`). */
export const ROOF_MATERIALS = [
  ['colorbond_corrugated', 'Colorbond Corrugated'],
  ['colorbond_trimdek', 'Colorbond Trimdek'],
  ['colorbond_spandek', 'Colorbond Spandek'],
  ['colorbond_kliplok', 'Colorbond Klip-Lok 700'],
  ['concrete_tile', 'Concrete tile'],
  ['terracotta_tile', 'Terracotta tile'],
  ['cement_sheet', 'Cement sheet'],
] as const;
export type RoofMaterial = (typeof ROOF_MATERIALS)[number][0];

export function useRoofingRates() {
  return useApiQuery(ROOFING_RATES_KEY, '/api/tenant/roofing-rates', OverlayGetSchema);
}

/** PATCH — body must be the full overlay (round-tripped `overrides` + the changed keys); see the
 *  file header for why this can't be a partial diff. */
export function useSaveRoofingRates() {
  return useApiMutation<Record<string, unknown>, OverlayPatchResult>(
    '/api/tenant/roofing-rates',
    OverlayPatchResultSchema,
    { method: 'PATCH', invalidates: [ROOFING_RATES_KEY] },
  );
}

const PAINTING_RATES_KEY = ['tenant', 'painting-rates'] as const;

/** The web dashboard's 4 editable painting scopes (PaintRatesEditor.tsx `SCOPES`). */
export const PAINT_SCOPES = [
  ['walls', 'Interior walls', 'm²'],
  ['ceilings', 'Ceilings', 'm²'],
  ['trim', 'Trim', 'lm'],
  ['exterior', 'Exterior', 'm²'],
] as const;
export type PaintScope = (typeof PAINT_SCOPES)[number][0];

export function usePaintingRates() {
  return useApiQuery(PAINTING_RATES_KEY, '/api/tenant/painting-rates', OverlayGetSchema);
}

export function useSavePaintingRates() {
  return useApiMutation<Record<string, unknown>, OverlayPatchResult>(
    '/api/tenant/painting-rates',
    OverlayPatchResultSchema,
    { method: 'PATCH', invalidates: [PAINTING_RATES_KEY] },
  );
}

const SOLAR_RATES_KEY = ['tenant', 'solar-rates'] as const;

/** GET — same `{ ok, overrides, has_pricing_book }` envelope as roofing/painting
 *  (plus a `defaults` block the card doesn't read). Scalar overrides come back
 *  as `null` (not absent) when unset; `install_rate_per_kw` is a nested map. */
export function useSolarRates() {
  return useApiQuery(SOLAR_RATES_KEY, '/api/tenant/solar-rates', OverlayGetSchema);
}

/**
 * PATCH — unlike roofing/painting there is NO overlay round-trip merge: the
 * route rebuilds the whole `solar_rate_card` from the body's fixed field set
 * (buildSolarOverlayFromInputs, lib/solar/rate-card-overlay.ts), so the body
 * must carry EVERY editable field each save — a value to override, `null` to
 * clear back to the default. Omitting a field wipes its override.
 */
export function useSaveSolarRates() {
  return useApiMutation<Record<string, unknown>, OverlayPatchResult>(
    '/api/tenant/solar-rates',
    OverlayPatchResultSchema,
    { method: 'PATCH', invalidates: [SOLAR_RATES_KEY] },
  );
}
