/**
 * Aircon recommender contracts + pure helpers — the native port of the web
 * tool's data layer (quotemate-automation app/dashboard/aircon/page.tsx +
 * lib/aircon/request-schema.ts).
 *
 * Request field names/enums are copied VERBATIM from the web request schema.
 * The web does no client-side climate-zone/postcode mapping — the server's
 * climateZoneForPostcode owns it — so none exists here either. Every number
 * in a result (kW, m², prices) renders exactly as returned; nothing here may
 * compute or adjust a price.
 */
import { z } from 'zod';

import type { PickedFile } from '@/lib/media';

// ── Request (lib/aircon/request-schema.ts, verbatim) ────────────────────────

export const AUS_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;
export type AusState = (typeof AUS_STATES)[number];

export const AcAddressSchema = z.object({
  address: z.string().min(3).max(300),
  postcode: z.string().regex(/^\d{4}$/, 'AU postcode is 4 digits'),
  state: z.enum(AUS_STATES),
});

export const AcInputsSchema = z
  .object({
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().int().min(0).max(20),
    living_spaces: z.number().int().min(0).max(20),
    /** 1, 2, or 3 (3 = "3 or more"). Optional for older clients. */
    storeys: z.number().int().min(1).max(3).optional(),
    floor_area_m2: z.number().positive().max(2000).optional().nullable(),
    ceiling_height: z.enum(['standard', 'high', 'raked']),
    insulation: z.enum(['good', 'average', 'poor', 'unknown']),
    current_situation: z.enum(['none', 'replacing', 'adding']),
    budget: z.number().positive().max(200000).optional().nullable(),
  })
  .refine(d => d.bedrooms + d.living_spaces >= 1, {
    message: 'Enter at least one bedroom or living space',
    path: ['living_spaces'],
  });

export const RecommendRequestSchema = z.object({
  address: AcAddressSchema,
  inputs: AcInputsSchema,
});
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

export type CeilingHeight = RecommendRequest['inputs']['ceiling_height'];
export type Insulation = RecommendRequest['inputs']['insulation'];
export type CurrentSituation = RecommendRequest['inputs']['current_situation'];

// ── Form options (web page.tsx labels, word-for-word) ───────────────────────

export const CEILINGS: readonly (readonly [CeilingHeight, string])[] = [
  ['standard', 'Standard (~2.4 m)'],
  ['high', 'High (~2.7 m)'],
  ['raked', 'Raked / cathedral'],
];
export const INSULATIONS: readonly (readonly [Insulation, string])[] = [
  ['good', 'Good'],
  ['average', 'Average'],
  ['poor', 'Poor'],
  ['unknown', 'Unknown'],
];
export const SITUATIONS: readonly (readonly [CurrentSituation, string])[] = [
  ['none', 'No system yet'],
  ['replacing', 'Replacing a system'],
  ['adding', 'Adding to existing'],
];
/** String values so the tuples plug straight into PillGroup. */
export const STOREY_OPTIONS: readonly (readonly [string, string])[] = [
  ['1', 'Single storey'],
  ['2', 'Two storey'],
  ['3', '3+ levels'],
];

/** What the tradie types — strings until buildRecommendRequest parses them. */
export type AirconForm = {
  address: string;
  postcode: string;
  state: AusState;
  bedrooms: string;
  bathrooms: string;
  livingSpaces: string;
  storeys: string;
  floorArea: string;
  ceiling: CeilingHeight;
  insulation: Insulation;
  situation: CurrentSituation;
  budget: string;
};

/** Web defaults: 3 bed / 2 bath / 2 living, single storey, QLD, replacing. */
export const DEFAULT_FORM: AirconForm = {
  address: '',
  postcode: '',
  state: 'QLD',
  bedrooms: '3',
  bathrooms: '2',
  livingSpaces: '2',
  storeys: '1',
  floorArea: '',
  ceiling: 'standard',
  insulation: 'average',
  situation: 'replacing',
  budget: '',
};

// ── Pure form parsing ───────────────────────────────────────────────────────

/** Whole number 0–20 (the server's count bound), or null when unusable. */
export function parseCount(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0 || n > 20) return null;
  return n;
}

/**
 * Optional positive number up to `max`. `{ value: null }` means "left blank —
 * send null" (web parity: blank floor area lets the satellite estimate stand);
 * a null RETURN means the text is unusable.
 */
export function parseOptionalPositive(
  input: string,
  max: number,
): { value: number | null } | null {
  const trimmed = input.trim();
  if (trimmed === '') return { value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  return { value: n };
}

export type BuiltRequest = { ok: true; body: RecommendRequest } | { ok: false; error: string };

/**
 * Form → POST body, with tradie-facing copy for anything the server would
 * bounce. The final safeParse is the belt-and-braces gate: a body that fails
 * the server's own schema must never leave the phone.
 */
export function buildRecommendRequest(form: AirconForm): BuiltRequest {
  if (form.address.trim().length < 3) {
    return { ok: false, error: 'Enter the property address.' };
  }
  if (!/^\d{4}$/.test(form.postcode.trim())) {
    return { ok: false, error: 'Postcode must be 4 digits.' };
  }
  const bedrooms = parseCount(form.bedrooms);
  if (bedrooms == null) {
    return { ok: false, error: 'Bedrooms must be a whole number from 0 to 20.' };
  }
  const bathrooms = parseCount(form.bathrooms);
  if (bathrooms == null) {
    return { ok: false, error: 'Bathrooms must be a whole number from 0 to 20.' };
  }
  const livingSpaces = parseCount(form.livingSpaces);
  if (livingSpaces == null) {
    return { ok: false, error: 'Living spaces must be a whole number from 0 to 20.' };
  }
  if (bedrooms + livingSpaces < 1) {
    // Server refine copy, verbatim.
    return { ok: false, error: 'Enter at least one bedroom or living space' };
  }
  const floorArea = parseOptionalPositive(form.floorArea, 2000);
  if (floorArea == null) {
    return { ok: false, error: 'Floor area must be a number up to 2000 m² — or leave it blank.' };
  }
  const budget = parseOptionalPositive(form.budget, 200000);
  if (budget == null) {
    return { ok: false, error: 'Budget must be a number up to $200,000 — or leave it blank.' };
  }
  const body: RecommendRequest = {
    address: {
      address: form.address.trim(),
      postcode: form.postcode.trim(),
      state: form.state,
    },
    inputs: {
      bedrooms,
      bathrooms,
      living_spaces: livingSpaces,
      storeys: Number(form.storeys),
      floor_area_m2: floorArea.value,
      ceiling_height: form.ceiling,
      insulation: form.insulation,
      current_situation: form.situation,
      budget: budget.value,
    },
  };
  const parsed = RecommendRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: 'Check the form and try again.' };
  return { ok: true, body: parsed.data };
}

// ── Floor-plan file guard (server parity: /api/aircon/plan) ─────────────────

export const MAX_PLAN_BYTES = 32 * 1024 * 1024;

/** Route PLAN_MEDIA_TYPES, verbatim. */
export const PLAN_MEDIA_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

/** Client mirror of the plan route's file checks — copy for its 400s. */
export function planFileProblem(file: PickedFile): string | null {
  if (!(PLAN_MEDIA_TYPES as readonly string[]).includes(file.type.toLowerCase())) {
    return 'Plans must be a PDF or a PNG, JPEG or WebP photo.';
  }
  if (file.size != null && file.size > MAX_PLAN_BYTES) {
    return 'That plan is over 32 MB. Choose a smaller file and try again.';
  }
  return null;
}

// ── Response (routes recommend/plan — rendered verbatim, never computed) ────

const RoomLoadSchema = z.looseObject({
  room_type: z.enum(['bedroom', 'living']),
  /** Plan room name (e.g. "Bed 2") when sizing came from a floor plan. */
  name: z.string().nullish(),
  area_m2: z.number(),
  volume_m3: z.number(),
  kw: z.number(),
});
export type RoomLoad = z.infer<typeof RoomLoadSchema>;

export const FLOOR_AREA_SOURCES = [
  'entered',
  'typical_room_mix',
  'solar_footprint',
  'floor_plan',
] as const;

/** Web FLOOR_AREA_SOURCE_LABEL, verbatim. */
export const FLOOR_AREA_SOURCE_LABEL: Record<(typeof FLOOR_AREA_SOURCES)[number], string> = {
  entered: 'Floor area · entered by hand',
  solar_footprint: 'Floor area · Google Solar satellite footprint',
  typical_room_mix: 'Floor area · AU typical room mix (estimate)',
  floor_plan: 'Floor area · read from the uploaded floor plan',
};

const SizingSchema = z.looseObject({
  rooms: z.array(RoomLoadSchema).default([]),
  conditioned_zones: z.number(),
  total_floor_area_m2: z.number(),
  floor_area_source: z.enum(FLOOR_AREA_SOURCES),
  total_volume_m3: z.number(),
  ceiling_height_m: z.number(),
  storeys: z.number(),
  volumetric_factor_kw_m3: z.number(),
  connected_kw: z.number(),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type AcSizing = z.infer<typeof SizingSchema>;

const PriceComponentSchema = z.looseObject({
  label: z.string(),
  quantity: z.number(),
  unit: z.string(),
  /** Dollars ex-GST on the wire — display via centsFromApiDollars + formatAud. */
  rate_ex_gst: z.number(),
  total_ex_gst: z.number(),
  note: z.string().nullish(),
});
export type AcPriceComponent = z.infer<typeof PriceComponentSchema>;

const PricingSchema = z.looseObject({
  point_estimate_ex_gst: z.number(),
  point_estimate_inc_gst: z.number(),
  confidence_band_pct: z.number(),
  gst_registered: z.boolean(),
  formula: z.string(),
  band_reason: z.string(),
  components: z.array(PriceComponentSchema).default([]),
  adjustments: z.array(PriceComponentSchema).default([]),
});

const OptionSchema = z.looseObject({
  system_type: z.enum(['ducted', 'split']),
  capacity_kw: z.number(),
  /** Indicative INC-GST band (lib/aircon/types.ts AcPriceRange). */
  price: z.looseObject({ low: z.number(), high: z.number() }),
  pricing: PricingSchema,
  best_fit: z.boolean(),
  pros: z.array(z.string()).default([]),
});
export type AcOption = z.infer<typeof OptionSchema>;

const PricedRecommendationSchema = z.looseObject({
  pricing_status: z.literal('priced'),
  sizing: SizingSchema,
  options: z.array(OptionSchema),
  routing: z.looseObject({ reason: z.string() }),
  confidence: z.enum(['high', 'medium', 'low']),
});

const UnpricedRecommendationSchema = z.looseObject({
  pricing_status: z.literal('tenant_pricing_required'),
  sizing: SizingSchema,
  routing: z.looseObject({ reason: z.string() }),
  confidence: z.enum(['high', 'medium', 'low']),
  pricing_setup_reason: z.string(),
});

const RecommendationSchema = z.discriminatedUnion('pricing_status', [
  PricedRecommendationSchema,
  UnpricedRecommendationSchema,
]);

// Location evidence: every branch of the web unions carries `ok`; the success
// fields are nullish here so a failure branch parses too. Display only.
const LocationSchema = z.looseObject({
  geocode: z.looseObject({ ok: z.boolean(), formatted_address: z.string().nullish() }),
  weather: z.looseObject({
    ok: z.boolean(),
    condition: z.string().nullish(),
    temperature_c: z.number().nullish(),
    feels_like_c: z.number().nullish(),
    humidity_pct: z.number().nullish(),
  }),
  building: z.looseObject({
    ok: z.boolean(),
    footprint_m2: z.number().nullish(),
    estimated_floor_area_m2: z.number().nullish(),
    storeys_assumed: z.number().nullish(),
  }),
  notes: z.array(z.string()).default([]),
});

/** Web AREA_SOURCE_LABEL, verbatim. */
export const AREA_SOURCE_LABEL: Record<'dimensions' | 'stated_total_apportioned' | 'scale_inferred', string> = {
  dimensions: 'printed dimensions',
  stated_total_apportioned: 'apportioned from total',
  scale_inferred: 'plan scale',
};

const ResolvedRoomSchema = z.looseObject({
  name: z.string(),
  room_type: z.string(),
  /** Conditioned rooms map to a load type; bathrooms/halls/etc. do not. */
  load_type: z.enum(['bedroom', 'living']).nullish(),
  area_m2: z.number(),
  area_source: z.enum(['dimensions', 'stated_total_apportioned', 'scale_inferred']),
});
export type AcResolvedRoom = z.infer<typeof ResolvedRoomSchema>;

const PlanReadoutSchema = z.looseObject({
  filename: z.string(),
  page: z.number(),
  rooms: z.array(ResolvedRoomSchema).default([]),
  dimensioned: z.boolean(),
  total_area_m2: z.number(),
  stated_total_area_m2: z.number().nullish(),
  overall_note: z.string().nullish(),
  notes: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

/**
 * One schema for both routes — /api/aircon/plan adds `plan` (and `design`,
 * which stays web-only: the overlay SVG needs the uploaded page rendered).
 * The persistence result is required because PDF generation is authorized by
 * the server-owned recommendation id, never by the on-screen money payload.
 */
export const RecommendResponseSchema = z.looseObject({
  ok: z.literal(true),
  climate_zone: z.enum(['cool', 'temperate', 'subtropical', 'tropical']),
  climate_note: z.string(),
  location: LocationSchema,
  recommendation: RecommendationSchema,
  saved: z.object({ id: z.string().min(1), public_token: z.string().min(1) }).nullable(),
  plan: PlanReadoutSchema.nullish(),
});
export type AirconResult = z.infer<typeof RecommendResponseSchema>;

export function buildAirconPdfRequest(recommendationId: string): { recommendationId: string } {
  return { recommendationId: recommendationId.trim() };
}

// ── Result display helpers (pure) ───────────────────────────────────────────

/** Web roomLabels, verbatim: plan names win, else "Bed n" / "Living n". */
export function roomLabels(rooms: RoomLoad[]): string[] {
  let bed = 0;
  let liv = 0;
  return rooms.map(r => r.name ?? (r.room_type === 'bedroom' ? `Bed ${++bed}` : `Living ${++liv}`));
}

/** Web parity: the PDF is addressed to the geocoded address when it resolved. */
export function pdfAddress(result: AirconResult, typedAddress: string): string {
  const g = result.location.geocode;
  return g.ok && g.formatted_address ? g.formatted_address : typedAddress;
}
