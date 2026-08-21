/**
 * Roofing measure — request/response shapes + pure helpers (spec web-parity F1).
 *
 * Ported from the web tool at quotemate-automation/app/dashboard/roofing/measure/page.tsx
 * and lib/roofing/{request-schema,types,selection}.ts. No maps/3D/street-view/solar-detach
 * here (non-goals) — just the measure → include/exclude → save flow's data shapes.
 *
 * Response schemas are loose (H2): the web payload carries far more (polygon geometry,
 * Geoscape attributes, PropRadar context...) than this screen renders.
 */
import { z } from 'zod';

// ── Form option vocabularies (web page.tsx MATERIALS/PITCHES/INTENTS, verbatim) ──

export const ROOF_MATERIALS = [
  ['colorbond_corrugated', 'Colorbond Corrugated'],
  ['colorbond_trimdek', 'Colorbond Trimdek'],
  ['colorbond_spandek', 'Colorbond Spandek'],
  ['colorbond_kliplok', 'Colorbond Klip-Lok 700'],
  ['concrete_tile', 'Concrete tile'],
  ['terracotta_tile', 'Terracotta tile'],
  ['cement_sheet', 'Cement sheet (asbestos-suspect)'],
  ['unknown', 'Unknown — confirm on-site'],
] as const;

export const ROOF_PITCHES = [
  ['shallow', 'Shallow (under 20°)'],
  ['standard', 'Standard (20–25°, the AU norm)'],
  ['steep', 'Steep (26–35°)'],
  ['very_steep', 'Very steep (over 35°) — forces inspection'],
  ['unknown', 'Unknown — forces inspection'],
] as const;

export const ROOF_INTENTS = [
  ['full_reroof', 'Full re-roof'],
  ['patch_repair', 'Patch / spot repair'],
  ['leak_trace', 'Leak trace + minor repair'],
  ['gutter_replace', 'Gutter + downpipe replace'],
  ['ridge_cap', 'Ridge / hip cap rebed'],
  ['flashing_repair', 'Flashing repair'],
] as const;

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;
export type AuState = (typeof AU_STATES)[number];

// ── Response shapes (loose — H2) ──────────────────────────────────────────

const RoofTierSchema = z.looseObject({
  tier: z.enum(['good', 'better', 'best']),
  label: z.string(),
  ex_gst: z.number(),
  inc_gst: z.number(),
  scope: z.string(),
});
export type RoofTier = z.infer<typeof RoofTierSchema>;

const RoofMetricsSchema = z.looseObject({
  footprint_m2: z.number(),
  sloped_area_m2: z.number().nullable(),
  storeys: z.number().nullable(),
  form: z.string(),
  hips: z.number().nullable(),
  valleys: z.number().nullable(),
  ridge_lm: z.number().nullable().optional(),
  polygon_geojson: z.unknown().nullable().optional(),
  capture_date: z.string().nullable().optional(),
});

const RoofInputsSchema = z.looseObject({
  material: z.string(),
  pitch: z.string(),
  intent: z.string(),
  building_year_built: z.number().nullable().optional(),
});

const RoofRoutingSchema = z.looseObject({
  decision: z.enum(['auto_quote', 'tradie_review', 'inspection_required']),
  reason: z.string(),
});

const RoofPriceSchema = z.looseObject({
  area_m2: z.number(),
  effective_rate_per_m2: z.number(),
  tiers: z.tuple([RoofTierSchema, RoofTierSchema, RoofTierSchema]),
  loadings_applied: z.array(z.looseObject({ code: z.string(), pct: z.number(), detail: z.string() })),
  routing: RoofRoutingSchema,
  call_out_minimum_applied: z.boolean().optional(),
});

const RoofStructurePriceSchema = z.looseObject({
  buildingId: z.string().nullable(),
  role: z.enum(['primary', 'secondary']),
  label: z.string(),
  metrics: RoofMetricsSchema,
  inputs: RoofInputsSchema,
  price: RoofPriceSchema,
});
export type RoofStructurePrice = z.infer<typeof RoofStructurePriceSchema>;

export const MultiRoofQuoteSchema = z.looseObject({
  structures: z.array(RoofStructurePriceSchema),
  combined: z.looseObject({
    area_m2: z.number(),
    tiers: z.tuple([RoofTierSchema, RoofTierSchema, RoofTierSchema]),
  }),
  routing: RoofRoutingSchema,
  inspection_structures: z.array(z.string()),
});
export type MultiRoofQuote = z.infer<typeof MultiRoofQuoteSchema>;

/** measure-all always answers 200 — `ok:false` is a measurement failure, not a network error. */
export const MeasureAllResponseSchema = z.union([
  z.looseObject({
    ok: z.literal(true),
    provider: z.enum(['geoscape', 'lidar', 'mock', 'manual']),
    quote: MultiRoofQuoteSchema,
    warnings: z.array(z.string()),
  }),
  z.looseObject({
    ok: z.literal(false),
    code: z.string().optional(),
    detail: z.string().optional(),
    error: z.string().optional(),
  }),
]);
export type MeasureAllResponse = z.infer<typeof MeasureAllResponseSchema>;

export const SaveRoofResponseSchema = z.union([
  z.looseObject({ ok: z.literal(true), id: z.string(), public_token: z.string(), measure_token: z.string() }),
  z.looseObject({ ok: z.literal(false), error: z.string(), detail: z.string().optional() }),
]);
export type SaveRoofResponse = z.infer<typeof SaveRoofResponseSchema>;

export const SaveAsQuoteResponseSchema = z.looseObject({
  ok: z.literal(true),
  quoteId: z.string().nullable().optional(),
  intakeId: z.string().optional(),
  shareToken: z.string(),
  shareUrl: z.string(),
  existing: z.boolean().optional(),
});
export type SaveAsQuoteResponse = z.infer<typeof SaveAsQuoteResponseSchema>;

// ── Requests ───────────────────────────────────────────────────────────────

export type RoofAddress = { address: string; postcode: string; state: AuState };

export type MeasureAllRequest = {
  address: RoofAddress;
  inputs: { material: string; pitch: string; intent: string; building_year_built: number | null };
};

export type SaveRoofRequest = {
  address: RoofAddress;
  provider: string;
  structures: {
    buildingId: string | null;
    role: 'primary' | 'secondary';
    label: string;
    inputs: { material: string; pitch: string; intent: string; building_year_built?: number | null };
  }[];
  quote: unknown;
  included_indices: number[];
};

export type SaveAsQuoteRequest = {
  address: RoofAddress;
  inputs: { material: string; pitch: string; intent: string; building_year_built: number | null };
  metrics: {
    footprint_m2: number;
    sloped_area_m2: number | null;
    storeys: number | null;
    form: string;
    hips: number | null;
    valleys: number | null;
    ridge_lm: number | null;
    polygon_geojson: unknown;
    capture_date: string | null;
  };
  price: {
    area_m2: number;
    effective_rate_per_m2: number;
    tiers: [RoofTier, RoofTier, RoofTier];
    loadings_applied: { code: string; pct: number; detail: string }[];
    routing: { decision: string; reason: string };
  };
};

// ── Pure helpers (structure selection + combined total) ─────────────────────

/** Stable per-structure key — mirrors the web's structureKey (buildingId, falling
 *  back to the list index for sub-polygon/manual entries that have none). */
export function structureKey(s: RoofStructurePrice, i: number): string {
  return s.buildingId ?? `__idx_${i}`;
}

/** Roof-only default: the primary structure starts IN the job, secondary structures
 *  (sheds/garages) start OUT — the tradie opts them in. Matches the web default. */
export function defaultIncluded(quote: MultiRoofQuote): Record<string, boolean> {
  const hasPrimary = quote.structures.some(s => s.role === 'primary');
  const next: Record<string, boolean> = {};
  quote.structures.forEach((s, i) => {
    next[structureKey(s, i)] = hasPrimary ? s.role === 'primary' : i === 0;
  });
  return next;
}

/** 1-based indices of the included structures, in quote.structures order — the shape
 *  /api/roofing/save's `included_indices` expects. */
export function includedIndices1Based(
  quote: MultiRoofQuote,
  included: Record<string, boolean>,
): number[] {
  const out: number[] = [];
  quote.structures.forEach((s, i) => {
    if (included[structureKey(s, i)] !== false) out.push(i + 1);
  });
  return out;
}

type CombinedTotals = {
  count: number;
  /** Sum of included, quotable structures' sloped area — informational only, this is
   *  never a price (display-only area maths are fine; see the money rule below). */
  areaM2: number;
};

/**
 * Area-only summary of the included, quotable structures — informational. Mirrors the
 * web's structure filter for a headline: a structure routed to inspection is shown on
 * its own card but excluded here (never invent a price for a job that needs an on-site
 * visit). This does NOT sum tier prices — no route on the backend can price a combined
 * multi-structure job, so this app never invents that number client-side. See
 * `singleQuotableIncluded` for the one combined figure this screen is allowed to act on.
 */
export function combinedIncludedTotals(
  quote: MultiRoofQuote,
  included: Record<string, boolean>,
): CombinedTotals {
  let areaM2 = 0;
  let count = 0;
  quote.structures.forEach((s, i) => {
    if (included[structureKey(s, i)] === false) return;
    if (s.price.routing.decision === 'inspection_required') return;
    count += 1;
    areaM2 += s.metrics.sloped_area_m2 ?? s.metrics.footprint_m2;
  });
  return { count, areaM2 };
}

/**
 * The single included, quotable structure — the one case 'Save as quote' can promote
 * without any client-side price arithmetic: forward that structure's own
 * server-computed tiers verbatim. There is no backend route that prices a combined
 * multi-structure job, so when zero or several structures are included this returns
 * null and the screen restricts promotion to the web dashboard instead of summing
 * tier prices itself.
 */
export function singleQuotableIncluded(
  quote: MultiRoofQuote,
  included: Record<string, boolean>,
): RoofStructurePrice | null {
  const eligible = quote.structures.filter((s, i) => {
    if (included[structureKey(s, i)] === false) return false;
    return s.price.routing.decision !== 'inspection_required';
  });
  return eligible.length === 1 ? (eligible[0] ?? null) : null;
}

/** Total structures the tradie has toggled in, quotable or not — pairs with
 *  `combinedIncludedTotals`'s quotable-only count so the UI can tell the two apart
 *  (a mixed job must never read as if the site-visit structures are silently priced in). */
export function includedCount(quote: MultiRoofQuote, included: Record<string, boolean>): number {
  return quote.structures.filter((s, i) => included[structureKey(s, i)] !== false).length;
}

/** Included structures routed to the paid on-site visit — the ones 'Save as quote' can
 *  NEVER cover. Used to warn the tradie exactly which structure(s) drop out when a job
 *  is a mix of one quotable and one-or-more inspection-required structures. */
export function includedInspectionStructures(
  quote: MultiRoofQuote,
  included: Record<string, boolean>,
): RoofStructurePrice[] {
  return quote.structures.filter((s, i) => {
    if (included[structureKey(s, i)] === false) return false;
    return s.price.routing.decision === 'inspection_required';
  });
}
