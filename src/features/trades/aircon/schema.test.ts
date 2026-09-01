/**
 * Pure-helper coverage for the aircon recommender — form → request building
 * (the client mirror of the server's RecommendRequestSchema), the plan-file
 * guard, result label helpers, and — critically — that the loose response
 * schema passes unknown fields through, so the recommendation POSTed back to
 * /api/aircon/pdf is byte-for-byte what the engine returned.
 */
import {
  acceptsAirconRun,
  airconRunFingerprint,
  buildRecommendRequest,
  buildAirconPdfRequest,
  DEFAULT_FORM,
  MAX_PLAN_BYTES,
  newAirconRequestId,
  parseCount,
  parseOptionalPositive,
  pdfAddress,
  planFileProblem,
  RecommendRequestSchema,
  RecommendResponseSchema,
  roomLabels,
  type AirconForm,
} from './schema';

const filledForm: AirconForm = {
  ...DEFAULT_FORM,
  address: '27 Smith Street, Penrith',
  postcode: '2750',
  state: 'NSW',
};

describe('buildRecommendRequest', () => {
  it('builds a server-valid body from the default form', () => {
    const built = buildRecommendRequest(filledForm);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.body.address).toEqual({
      address: '27 Smith Street, Penrith',
      postcode: '2750',
      state: 'NSW',
    });
    expect(built.body.inputs).toEqual({
      bedrooms: 3,
      bathrooms: 2,
      living_spaces: 2,
      storeys: 1,
      floor_area_m2: null,
      ceiling_height: 'standard',
      insulation: 'average',
      current_situation: 'replacing',
      budget: null,
    });
    // Belt-and-braces: the exact schema the server validates against.
    expect(RecommendRequestSchema.safeParse(built.body).success).toBe(true);
  });

  it('carries entered floor area and budget through as numbers', () => {
    const built = buildRecommendRequest({ ...filledForm, floorArea: '250', budget: '12000' });
    expect(built).toMatchObject({
      ok: true,
      body: { inputs: { floor_area_m2: 250, budget: 12000 } },
    });
  });

  const rejections: [Partial<AirconForm>, string][] = [
    [{ address: 'ab' }, 'Enter the property address.'],
    [{ postcode: '27' }, 'Postcode must be 4 digits.'],
    [{ bedrooms: 'two' }, 'Bedrooms must be a whole number from 0 to 20.'],
    [{ bathrooms: '-1' }, 'Bathrooms must be a whole number from 0 to 20.'],
    [{ livingSpaces: '21' }, 'Living spaces must be a whole number from 0 to 20.'],
    // Server refine copy, verbatim.
    [{ bedrooms: '0', livingSpaces: '0' }, 'Enter at least one bedroom or living space'],
    [{ floorArea: 'big' }, 'Floor area must be a number up to 2000 m² — or leave it blank.'],
    [{ floorArea: '2001' }, 'Floor area must be a number up to 2000 m² — or leave it blank.'],
    [{ budget: '200001' }, 'Budget must be a number up to $200,000 — or leave it blank.'],
  ];
  it.each(rejections)('rejects %j with tradie copy', (patch, error) => {
    expect(buildRecommendRequest({ ...filledForm, ...patch })).toEqual({ ok: false, error });
  });
});

describe('parse helpers', () => {
  it('parseCount takes whole numbers 0–20 only', () => {
    expect(parseCount('0')).toBe(0);
    expect(parseCount(' 20 ')).toBe(20);
    expect(parseCount('3.5')).toBeNull();
    expect(parseCount('21')).toBeNull();
    expect(parseCount('')).toBeNull();
  });

  it('parseOptionalPositive treats blank as "send null" and junk as unusable', () => {
    expect(parseOptionalPositive('', 2000)).toEqual({ value: null });
    expect(parseOptionalPositive('184.2', 2000)).toEqual({ value: 184.2 });
    expect(parseOptionalPositive('0', 2000)).toBeNull();
    expect(parseOptionalPositive('2001', 2000)).toBeNull();
    expect(parseOptionalPositive('abc', 2000)).toBeNull();
  });
});

describe('planFileProblem', () => {
  const pdf = { uri: 'file:///plan.pdf', name: 'plan.pdf', type: 'application/pdf', size: 1024 };

  it('accepts the route media types under the cap', () => {
    expect(planFileProblem(pdf)).toBeNull();
    expect(planFileProblem({ ...pdf, type: 'image/webp' })).toBeNull();
  });

  it('passes an unknown size — the server still enforces the cap', () => {
    expect(planFileProblem({ ...pdf, size: undefined })).toBeNull();
  });

  it('rejects the wrong type and oversize files with copy', () => {
    expect(planFileProblem({ ...pdf, type: 'image/heic' })).toMatch(/PDF or a PNG/);
    expect(planFileProblem({ ...pdf, size: MAX_PLAN_BYTES + 1 })).toMatch(/over 32 MB/);
  });
});

describe('result helpers', () => {
  it('roomLabels prefers plan names, else numbers bedrooms/living separately', () => {
    expect(
      roomLabels([
        { room_type: 'bedroom', area_m2: 12, volume_m3: 29, kw: 1.2 },
        { room_type: 'living', name: 'FAMILY', area_m2: 30, volume_m3: 72, kw: 3 },
        { room_type: 'bedroom', area_m2: 10, volume_m3: 24, kw: 1 },
        { room_type: 'living', area_m2: 20, volume_m3: 48, kw: 2 },
      ]),
    ).toEqual(['Bed 1', 'FAMILY', 'Bed 2', 'Living 1']);
  });
});

// ── Response schema ─────────────────────────────────────────────────────────

const responseFixture = {
  ok: true,
  request_id: 'ac_request_1234',
  climate_zone: 'subtropical',
  climate_note: 'Postcode 2750 sits in the subtropical band.',
  location: {
    geocode: { ok: true, formatted_address: '27 Smith St, Penrith NSW 2750', lat: -33.7, lng: 150.7 },
    weather: { ok: false, code: 'config_missing', detail: 'no key' },
    building: { ok: false, code: 'skipped', detail: 'no geocode' },
    notes: ['Geocoded by Google.'],
  },
  recommendation: {
    pricing_status: 'priced',
    pricing_authority: {
      source: 'tenant_pricing_book',
      tenant_id: 'tenant-1',
      pricing_book_id: 'book-1',
      revision: 'a'.repeat(64),
    },
    sizing: {
      rooms: [{ room_type: 'bedroom', area_m2: 12, volume_m3: 28.8, kw: 1.3 }],
      conditioned_zones: 1,
      total_floor_area_m2: 12,
      floor_area_source: 'entered',
      total_volume_m3: 28.8,
      ceiling_height_m: 2.4,
      storeys: 1,
      volumetric_factor_kw_m3: 0.045,
      connected_kw: 1.3,
      // Not declared in the mobile schema — must survive the round trip.
      connected_kw_low: 1.1,
      connected_kw_high: 1.6,
      ducted_kw: 1.1,
      confidence: 'high',
      notes: [],
      warnings: [],
    },
    options: [
      {
        system_type: 'split',
        capacity_kw: 2.5,
        price: { low: 1800, high: 2400 },
        pricing: {
          point_estimate_ex_gst: 1900,
          point_estimate_inc_gst: 2090,
          confidence_band_pct: 12,
          gst_registered: true,
          formula: 'heads × band rate',
          band_reason: 'High confidence — entered floor area.',
          components: [
            { label: '1 × 2.5 kW head', quantity: 1, unit: 'head', rate_ex_gst: 1900, total_ex_gst: 1900 },
          ],
          adjustments: [],
        },
        best_fit: true,
        pros: ['Cheapest to run'],
        // Not declared in the mobile schema — must survive the round trip.
        cons: ['One head per room'],
      },
    ],
    routing: { decision: 'book_assessment', reason: 'Every result needs a site assessment.' },
    confidence: 'high',
  },
  saved: { id: 'recommendation-1', public_token: 'public-token-1' },
};

describe('RecommendResponseSchema', () => {
  it('parses a recommend response (no plan block) and keeps unknown fields verbatim', () => {
    const parsed = RecommendResponseSchema.safeParse(responseFixture);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // looseObject passthrough: the PDF POST needs the engine's full shape.
    expect(parsed.data.recommendation.sizing).toMatchObject({
      connected_kw_low: 1.1,
      ducted_kw: 1.1,
    });
    expect(parsed.data.recommendation.pricing_status).toBe('priced');
    expect(parsed.data.saved).toEqual({ id: 'recommendation-1', public_token: 'public-token-1' });
    if (parsed.data.recommendation.pricing_status !== 'priced') return;
    const option = parsed.data.recommendation.options[0]!;
    expect(option).toMatchObject({ cons: ['One head per room'] });
    expect(parsed.data.plan == null).toBe(true);
  });

  it('rejects ok:false envelopes outright', () => {
    expect(RecommendResponseSchema.safeParse({ ...responseFixture, ok: false }).success).toBe(
      false,
    );
  });

  it('requires the server persistence result used to authorize PDF generation', () => {
    const { saved: _saved, ...withoutSaved } = responseFixture;
    expect(RecommendResponseSchema.safeParse(withoutSaved).success).toBe(false);
  });

  it('parses a tenant-pricing-required response with no monetary options', () => {
    const recommendation = responseFixture.recommendation;
    const parsed = RecommendResponseSchema.safeParse({
      ...responseFixture,
      recommendation: {
        pricing_status: 'tenant_pricing_required',
        sizing: recommendation.sizing,
        routing: recommendation.routing,
        confidence: 'high',
        pricing_setup_reason: 'Complete the air-conditioning rate card.',
      },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.recommendation.pricing_status).toBe('tenant_pricing_required');
    expect('options' in parsed.data.recommendation).toBe(false);
  });

  it.each([true, false])('preserves priced GST registration state %s', gstRegistered => {
    const parsed = RecommendResponseSchema.parse({
      ...responseFixture,
      recommendation: {
        ...responseFixture.recommendation,
        options: responseFixture.recommendation.options.map(option => ({
          ...option,
          pricing: { ...option.pricing, gst_registered: gstRegistered },
        })),
      },
    });
    expect(parsed.recommendation.pricing_status).toBe('priced');
    if (parsed.recommendation.pricing_status !== 'priced') return;
    expect(parsed.recommendation.options[0]!.pricing.gst_registered).toBe(gstRegistered);
  });

  it.each([
    ['zero band', { path: ['recommendation', 'options', 0, 'price', 'low'], value: 0 }],
    ['null estimate', { path: ['recommendation', 'options', 0, 'pricing', 'point_estimate_ex_gst'], value: null }],
    ['non-finite estimate', { path: ['recommendation', 'options', 0, 'pricing', 'point_estimate_inc_gst'], value: Infinity }],
  ])('rejects priced output with %s', (_label, change) => {
    const candidate = structuredClone(responseFixture) as Record<string, unknown>;
    let cursor = candidate as Record<string | number, unknown>;
    const path = change.path as (string | number)[];
    for (const key of path.slice(0, -1)) cursor = cursor[key] as Record<string | number, unknown>;
    cursor[path[path.length - 1]!] = change.value;
    expect(RecommendResponseSchema.safeParse(candidate).success).toBe(false);
  });

  it('rejects missing authority or a priced result that was not persisted', () => {
    const noAuthority = structuredClone(responseFixture);
    delete (noAuthority.recommendation as { pricing_authority?: unknown }).pricing_authority;
    expect(RecommendResponseSchema.safeParse(noAuthority).success).toBe(false);
    expect(RecommendResponseSchema.safeParse({ ...responseFixture, saved: null }).success).toBe(false);
  });
});

describe('aircon run fencing and retry identity', () => {
  it('reuses an explicit request id and creates deterministic test ids', () => {
    const first = buildRecommendRequest(filledForm, 'ac_retry_1234');
    const retry = buildRecommendRequest(filledForm, 'ac_retry_1234');
    expect(first).toEqual(retry);
    expect(newAirconRequestId(() => 1234, () => 0.5)).toBe('ac_ya_i');
  });

  it('accepts only the mounted current run and rejects late, switched, or remounted responses', () => {
    const fingerprint = airconRunFingerprint(filledForm, null);
    const current = {
      mounted: true,
      activeRequestId: 'ac_request_1234',
      activeFingerprint: fingerprint,
      responseRequestId: 'ac_request_1234',
      currentFingerprint: fingerprint,
    };
    expect(acceptsAirconRun(current)).toBe(true);
    expect(acceptsAirconRun({ ...current, responseRequestId: 'ac_late_9999' })).toBe(false);
    expect(
      acceptsAirconRun({
        ...current,
        currentFingerprint: airconRunFingerprint({ ...filledForm, postcode: '4000' }, null),
      }),
    ).toBe(false);
    expect(acceptsAirconRun({ ...current, mounted: false })).toBe(false);
  });
});

describe('buildAirconPdfRequest', () => {
  it('sends only the server-owned recommendation identifier', () => {
    expect(buildAirconPdfRequest(' recommendation-1 ')).toEqual({
      recommendationId: 'recommendation-1',
    });
  });
});

describe('pdfAddress', () => {
  it('uses the geocoded address when it resolved, else the typed one', () => {
    const parsed = RecommendResponseSchema.parse(responseFixture);
    expect(pdfAddress(parsed, 'typed address')).toBe('27 Smith St, Penrith NSW 2750');
    const unresolved = RecommendResponseSchema.parse({
      ...responseFixture,
      location: { ...responseFixture.location, geocode: { ok: false, code: 'not_found', detail: 'x' } },
    });
    expect(pdfAddress(unresolved, 'typed address')).toBe('typed address');
  });
});
