import { z } from 'zod';

import { MultiRoofQuoteSchema, RoofPricingAuthoritySchema } from './schema';

const revision = z.string().regex(/^[a-f0-9]{64}$/);
export const OwnedRoofSchema = z.object({
  ok: z.literal(true),
  measurement: z.object({
    id: z.string().uuid(), tenant_id: z.string().min(1),
    measure_token: z.string().min(8), public_token: z.string().min(8).nullable(),
    revision, address: z.string().nullable(), postcode: z.string().nullable(),
    state: z.string().nullable(), provider: z.string().nullable(),
    customer_name: z.string().nullable(), customer_phone: z.string().nullable(),
    quote: MultiRoofQuoteSchema.nullable(), included_indices: z.array(z.number().int().positive()).nullable(),
    created_at: z.string().nullable(), released_at: z.string().nullable(), paid_at: z.string().nullable(),
    pricing_authority: RoofPricingAuthoritySchema.nullable(),
    promoted_quote_id: z.string().uuid().nullable(), promotion_pending: z.boolean(),
  }),
});
export type OwnedRoof = z.infer<typeof OwnedRoofSchema>['measurement'];
export const ReviseRoofSchema = z.object({
  ok: z.literal(true), measureToken: z.string().min(8), successor: z.boolean(),
});

// These are the current owned PATCH fields. Blank clears an accessory/count;
// an absent measurement correction keeps its stored value. No height field is
// offered because the server does not support an owner height correction.
export const ROOF_CORRECTIONS = [
  { key: 'sloped_area_m2', label: 'Sloped roof area (m²)', min: 1, max: 10000 },
  { key: 'pitch_degrees', label: 'Measured pitch (degrees)', min: 1, max: 75 },
  { key: 'storeys', label: 'Storeys', min: 1, max: 10, integer: true },
  { key: 'hips', label: 'Hip count', min: 0, max: 50, integer: true },
  { key: 'valleys', label: 'Valley count', min: 0, max: 50, integer: true },
  { key: 'box_gutter_lm', label: 'Box gutter (m)', min: 0, max: 500 },
  { key: 'gutter_lm', label: 'Gutter replacement (m)', min: 0, max: 1000 },
  { key: 'downpipe_count', label: 'Downpipes', min: 0, max: 60, integer: true },
  { key: 'fascia_lm', label: 'Fascia replacement (m)', min: 0, max: 1000 },
  { key: 'soffit_lm', label: 'Soffit replacement (m)', min: 0, max: 1000 },
] as const;
export const ROOF_FORMS = ['gable', 'hip', 'skillion', 'gable_hip', 'complex', 'unknown'] as const;
export type RoofCorrectionKey = (typeof ROOF_CORRECTIONS)[number]['key'] | 'form';
export type RoofEdits = Record<string, Partial<Record<RoofCorrectionKey, string>>>;

export function roofCorrectionBody(roof: OwnedRoof, edits: RoofEdits) {
  const edges: { index: number; [key: string]: string | number | null }[] = [];
  for (const [key, changes] of Object.entries(edits)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 1 || !roof.quote?.structures[index - 1]) {
      throw new Error('A changed building is no longer in this measurement. Reload the saved job.');
    }
    const edge: (typeof edges)[number] = { index };
    for (const field of ROOF_CORRECTIONS) {
      if (changes[field.key] === undefined) continue;
      const text = changes[field.key]!.trim();
      if (!text) {
        if (field.min > 0) throw new Error(`${field.label} needs a value, or discard that correction.`);
        edge[field.key] = null;
        continue;
      }
      const value = Number(text);
      if (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(value) || value < field.min || value > field.max ||
          ('integer' in field && field.integer && !Number.isInteger(value))) {
        throw new Error(`${field.label} must be ${'integer' in field ? 'a whole number ' : ''}from ${field.min} to ${field.max}.`);
      }
      edge[field.key] = value;
    }
    if (changes.form !== undefined) {
      if (!(ROOF_FORMS as readonly string[]).includes(changes.form)) throw new Error('Choose a supported roof form.');
      edge.form = changes.form;
    }
    if (Object.keys(edge).length > 1) edges.push(edge);
  }
  if (!edges.length) throw new Error('Change a measurement before saving corrections.');
  return { expected_revision: roof.revision, edges };
}

export function roofSelection(roof: OwnedRoof): number[] {
  const count = roof.quote?.structures.length ?? 0;
  return (roof.included_indices ?? Array.from({ length: count }, (_, i) => i + 1))
    .filter((index, i, all) => index <= count && all.indexOf(index) === i).sort((a, b) => a - b);
}

/** Customer quote promotion consumes only the owned capability + current rate
 * revision. Saved geometry/selection/money are reconstructed on the server. */
export function roofPromotionBody(roof: OwnedRoof) {
  if (roof.paid_at || !roof.quote || roof.promoted_quote_id || roof.promotion_pending ||
      !roof.pricing_authority || roof.pricing_authority.tenant_id !== roof.tenant_id) return null;
  const indices = roofSelection(roof);
  if (!indices.length || indices.some(i => roof.quote!.structures[i - 1]?.price.routing.decision === 'inspection_required')) return null;
  return { measure_token: roof.measure_token, expected_pricing_revision: roof.pricing_authority.revision };
}

/** Geometry is a labelled footprint preview, never new measured scope. Invalid
 * or excessive coordinates are excluded instead of producing misleading paths. */
export function roofFootprints(roof: Pick<OwnedRoof, 'quote'>) {
  const rings: { index: number; coordinates: number[][] }[] = [];
  roof.quote?.structures.forEach((structure, i) => {
    const parsed = z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(z.tuple([
      z.number().finite().min(-180).max(180), z.number().finite().min(-85).max(85),
    ])).min(4).max(2000)).min(1).max(100) }).safeParse(structure.metrics.polygon_geojson);
    if (parsed.success) rings.push({ index: i + 1, coordinates: parsed.data.coordinates[0]! });
  });
  const points = rings.flatMap(ring => ring.coordinates);
  if (!points.length) return [];
  const xs = points.map(p => p[0]!); const ys = points.map(p => p[1]!);
  const minX = Math.min(...xs); const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX; const height = Math.max(...ys) - minY;
  if (width <= 0 || height <= 0 || width > 1 || height > 1) return [];
  const scale = 260 / Math.max(width, height);
  return rings.map(ring => ({ index: ring.index, points: ring.coordinates.map(point =>
    `${20 + (point[0]! - minX) * scale},${280 - (point[1]! - minY) * scale}`).join(' ') }));
}
