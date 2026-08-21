import {
  combinedIncludedTotals,
  defaultIncluded,
  includedCount,
  includedIndices1Based,
  includedInspectionStructures,
  singleQuotableIncluded,
  type MultiRoofQuote,
  type RoofStructurePrice,
  type RoofTier,
} from './schema';

const NO_COMBINED_TIERS = [] as unknown as [RoofTier, RoofTier, RoofTier];

function structure(overrides: Partial<RoofStructurePrice>): RoofStructurePrice {
  return {
    buildingId: null,
    role: 'secondary',
    label: 'Structure',
    metrics: {
      footprint_m2: 100,
      sloped_area_m2: 120,
      storeys: 1,
      form: 'gable',
      hips: 0,
      valleys: 0,
    },
    inputs: { material: 'colorbond_corrugated', pitch: 'standard', intent: 'full_reroof' },
    price: {
      area_m2: 120,
      effective_rate_per_m2: 50,
      tiers: [
        { tier: 'good', label: 'Good', ex_gst: 6000, inc_gst: 6600, scope: 'Patch' },
        { tier: 'better', label: 'Better', ex_gst: 8000, inc_gst: 8800, scope: 'Match' },
        { tier: 'best', label: 'Best', ex_gst: 10000, inc_gst: 11000, scope: 'Upgrade' },
      ],
      loadings_applied: [],
      routing: { decision: 'auto_quote', reason: 'Straightforward' },
    },
    ...overrides,
  };
}

describe('defaultIncluded', () => {
  it('starts the primary structure in and secondaries out', () => {
    const quote: MultiRoofQuote = {
      structures: [
        structure({ buildingId: 'a', role: 'primary' }),
        structure({ buildingId: 'b', role: 'secondary' }),
      ],
      combined: { area_m2: 240, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'auto_quote', reason: '' },
      inspection_structures: [],
    };
    expect(defaultIncluded(quote)).toEqual({ a: true, b: false });
  });
});

describe('combinedIncludedTotals', () => {
  it('sums only included, quotable structures — inspection-routed ones are excluded', () => {
    const quote: MultiRoofQuote = {
      structures: [
        structure({ buildingId: 'a', role: 'primary' }),
        structure({ buildingId: 'b', role: 'secondary' }),
        structure({
          buildingId: 'c',
          role: 'secondary',
          price: {
            ...structure({}).price,
            routing: { decision: 'inspection_required', reason: 'Complex form' },
          },
        }),
      ],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'tradie_review', reason: '' },
      inspection_structures: ['c'],
    };
    // a included (default), b explicitly included, c included but inspection-routed.
    const included = { a: true, b: true, c: true };
    const totals = combinedIncludedTotals(quote, included);
    expect(totals.count).toBe(2);
    expect(totals.areaM2).toBe(240);
    // Area-only — no client-side tier price summation (roof-save-as-quote-client-summed-price).
    expect(totals).toEqual({ count: 2, areaM2: 240 });
  });

  it('excludes a structure toggled out', () => {
    const quote: MultiRoofQuote = {
      structures: [structure({ buildingId: 'a', role: 'primary' }), structure({ buildingId: 'b' })],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'auto_quote', reason: '' },
      inspection_structures: [],
    };
    const totals = combinedIncludedTotals(quote, { a: true, b: false });
    expect(totals.count).toBe(1);
    expect(totals.areaM2).toBe(120);
  });
});

describe('includedIndices1Based', () => {
  it('returns 1-based indices for included structures only', () => {
    const quote: MultiRoofQuote = {
      structures: [structure({ buildingId: 'a' }), structure({ buildingId: 'b' }), structure({ buildingId: 'c' })],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'auto_quote', reason: '' },
      inspection_structures: [],
    };
    expect(includedIndices1Based(quote, { a: true, b: false, c: true })).toEqual([1, 3]);
  });
});

describe('singleQuotableIncluded', () => {
  it('returns the one included, quotable structure', () => {
    const a = structure({ buildingId: 'a', role: 'primary' });
    const b = structure({ buildingId: 'b', role: 'secondary' });
    const quote: MultiRoofQuote = {
      structures: [a, b],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'auto_quote', reason: '' },
      inspection_structures: [],
    };
    expect(singleQuotableIncluded(quote, { a: true, b: false })).toBe(a);
  });

  it('returns null when several structures are included — no client price summation', () => {
    const quote: MultiRoofQuote = {
      structures: [structure({ buildingId: 'a', role: 'primary' }), structure({ buildingId: 'b' })],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'auto_quote', reason: '' },
      inspection_structures: [],
    };
    expect(singleQuotableIncluded(quote, { a: true, b: true })).toBeNull();
  });

  it('returns null when zero structures are included or quotable', () => {
    const quote: MultiRoofQuote = {
      structures: [
        structure({
          buildingId: 'a',
          role: 'primary',
          price: { ...structure({}).price, routing: { decision: 'inspection_required', reason: 'Complex form' } },
        }),
      ],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'inspection_required', reason: '' },
      inspection_structures: ['a'],
    };
    expect(singleQuotableIncluded(quote, { a: true })).toBeNull();
  });
});

describe('includedCount and includedInspectionStructures', () => {
  it('counts every included structure, quotable or not, and names the inspection-routed ones', () => {
    const a = structure({ buildingId: 'a', role: 'primary', label: 'Main dwelling' });
    const b = structure({
      buildingId: 'b',
      role: 'secondary',
      label: 'Rear garage',
      price: { ...structure({}).price, routing: { decision: 'inspection_required', reason: 'Complex form' } },
    });
    const quote: MultiRoofQuote = {
      structures: [a, b],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'tradie_review', reason: '' },
      inspection_structures: ['b'],
    };
    const included = { a: true, b: true };

    // Mixed job: 2 included total, but only 1 quotable — the two counts must disagree here.
    expect(includedCount(quote, included)).toBe(2);
    expect(combinedIncludedTotals(quote, included).count).toBe(1);
    expect(includedInspectionStructures(quote, included)).toEqual([b]);
  });

  it('excludes a toggled-out structure from both the total and the inspection list', () => {
    const a = structure({ buildingId: 'a', role: 'primary' });
    const b = structure({
      buildingId: 'b',
      price: { ...structure({}).price, routing: { decision: 'inspection_required', reason: 'Complex form' } },
    });
    const quote: MultiRoofQuote = {
      structures: [a, b],
      combined: { area_m2: 0, tiers: NO_COMBINED_TIERS },
      routing: { decision: 'auto_quote', reason: '' },
      inspection_structures: ['b'],
    };
    expect(includedCount(quote, { a: true, b: false })).toBe(1);
    expect(includedInspectionStructures(quote, { a: true, b: false })).toEqual([]);
  });
});
