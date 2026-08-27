/**
 * Pins the tool-panel schemas to the web routes' actual payloads
 * (app/api/signage/{sweeps,queue}/route.ts, app/api/{painting,roofing}/save/route.ts)
 * and the pure helpers to the web hub tabs' client-side behaviour.
 */
import {
  flattenRecentRequests,
  formatJobDate,
  formatJobPrice,
  paintJobHref,
  roofJobHref,
  SavedPaintJobSchema,
  SavedPaintJobsResponseSchema,
  SavedRoofJobSchema,
  SavedRoofJobsResponseSchema,
  SignageQueueResponseSchema,
  SignageSweepsResponseSchema,
  signageChip,
} from './tools-api';

// ── Signage sweeps ──────────────────────────────────────────────────────────

const sweepsPayload = {
  ok: true,
  brand: {
    slug: 'f45',
    name: 'F45 Training',
    location_noun: 'studio',
    location_noun_plural: 'studios',
    shots: [],
  },
  brands: [{ slug: 'f45', name: 'F45 Training' }],
  selected: 'f45',
  studios: [{ id: 'st-1', name: 'F45 Newtown', region: 'AU-NSW', state: 'NSW', status: 'open' }],
  sweeps: [
    {
      id: 'sw-2',
      name: 'Q3 refresh',
      created_at: '2026-08-20T01:00:00Z',
      status: 'sent',
      required_shots: ['fascia_day'],
      requests: [
        {
          id: 'r-3',
          studio_name: 'F45 Newtown',
          token: 'tok3',
          link: 'https://quotemax.com.au/studio/tok3/upload',
          state: 'assessed',
          overall: 'pass',
          assessment_id: 'a-9',
          assessment_status: 'hq_review',
        },
        {
          id: 'r-4',
          studio_name: 'F45 Marrickville',
          token: 'tok4',
          link: 'https://quotemax.com.au/studio/tok4/upload',
          state: 'pending',
          overall: null,
          assessment_id: null,
          assessment_status: null,
        },
      ],
    },
    {
      id: 'sw-1',
      name: 'Launch sweep',
      created_at: '2026-07-01T01:00:00Z',
      status: 'sent',
      required_shots: [],
      requests: [
        {
          id: 'r-1',
          studio_name: 'F45 Bondi',
          token: 'tok1',
          link: 'https://quotemax.com.au/studio/tok1/upload',
          state: 'submitted',
          overall: 'fix_needed',
          assessment_id: 'a-2',
          assessment_status: 'hq_review',
        },
      ],
    },
  ],
};

describe('SignageSweepsResponseSchema', () => {
  it('round-trips the sweeps GET payload', () => {
    const parsed = SignageSweepsResponseSchema.parse(sweepsPayload);
    expect(parsed.sweeps).toHaveLength(2);
    expect(parsed.sweeps[0]?.requests[1]?.overall).toBeNull();
    expect(parsed.sweeps[0]?.requests[0]?.assessment_id).toBe('a-9');
  });

  it('rejects ok:false so list errors surface instead of reading as empty', () => {
    expect(SignageSweepsResponseSchema.safeParse({ ok: false, error: 'unauthorized' }).success).toBe(
      false,
    );
  });
});

describe('SignageQueueResponseSchema', () => {
  it('takes the rollup and tolerates fleet/queue alongside', () => {
    const parsed = SignageQueueResponseSchema.parse({
      ok: true,
      rollup: { studios: 12, assessed: 9, pass: 6, fix_needed: 2, needs_review: 1, awaiting: 3 },
      fleet: [{ studio_id: 'st-1', studio_name: 'F45 Newtown' }],
      queue: [],
      brands: [],
      selected: 'f45',
    });
    expect(parsed.rollup.studios).toBe(12);
    expect(parsed.rollup.awaiting).toBe(3);
  });
});

describe('flattenRecentRequests — web recent-first flatten parity', () => {
  it('preserves sweep order and tags each row with its sweep', () => {
    const parsed = SignageSweepsResponseSchema.parse(sweepsPayload);
    const recent = flattenRecentRequests(parsed.sweeps);
    expect(recent.map(r => r.id)).toEqual(['r-3', 'r-4', 'r-1']);
    expect(recent[0]?.sweep_name).toBe('Q3 refresh');
    expect(recent[0]?.sweep_created_at).toBe('2026-08-20T01:00:00Z');
    expect(recent[2]?.sweep_name).toBe('Launch sweep');
  });

  it('is empty for no sweeps', () => {
    expect(flattenRecentRequests([])).toEqual([]);
  });
});

describe('signageChip — web SgChip mapping', () => {
  it('assessment overall wins', () => {
    expect(signageChip('assessed', 'pass')).toEqual({ label: 'Compliant', tone: 'success' });
    expect(signageChip('assessed', 'fix_needed')).toEqual({ label: 'To fix', tone: 'warn' });
    expect(signageChip('submitted', 'needs_review')).toEqual({
      label: 'Needs review',
      tone: 'warn',
    });
  });

  it('falls back to the request state', () => {
    expect(signageChip('submitted', null)).toEqual({ label: 'Scoring…', tone: 'dim' });
    expect(signageChip('pending', null)).toEqual({ label: 'Awaiting', tone: 'dim' });
  });
});

// ── Painting saved jobs ─────────────────────────────────────────────────────

const paintJob = {
  id: 'pj-1',
  address: '12 Wattle St, Newtown NSW',
  postcode: '2042',
  state: 'NSW',
  customer_name: 'Sam',
  source: 'realestate',
  scopes: ['interior', 'trim'],
  floor_area_m2: 140,
  total_area_m2: 412.4,
  confidence: 'medium',
  better_inc_gst: 8642.5,
  routing: 'auto_quote',
  public_token: 'pub-paint-1',
  estimate_token: 'est-paint-1',
  created_at: '2026-08-25T04:30:00Z',
};

const paintInspectionJob = {
  ...paintJob,
  id: 'pj-2',
  scopes: null,
  total_area_m2: null,
  confidence: null,
  better_inc_gst: null,
  routing: 'inspection_required',
  public_token: null,
  estimate_token: null,
};

describe('SavedPaintJobsResponseSchema', () => {
  it('round-trips the GET payload, nulls included', () => {
    const parsed = SavedPaintJobsResponseSchema.parse({
      ok: true,
      jobs: [paintJob, paintInspectionJob],
    });
    expect(parsed.jobs).toHaveLength(2);
    expect(parsed.jobs[0]?.better_inc_gst).toBe(8642.5);
    expect(parsed.jobs[1]?.better_inc_gst).toBeNull();
    expect(parsed.jobs[1]?.scopes).toBeNull();
  });

  it('rejects the 200-with-ok:false list_failed envelope', () => {
    expect(
      SavedPaintJobsResponseSchema.safeParse({ ok: false, error: 'list_failed', detail: 'boom' })
        .success,
    ).toBe(false);
  });
});

describe('paintJobHref', () => {
  it('prefers the tradie estimate results page', () => {
    expect(paintJobHref(SavedPaintJobSchema.parse(paintJob))).toBe('/p/est-paint-1');
  });

  it('falls back to the customer page, then null', () => {
    expect(paintJobHref(SavedPaintJobSchema.parse({ ...paintJob, estimate_token: null }))).toBe(
      '/q/paint/pub-paint-1',
    );
    expect(paintJobHref(SavedPaintJobSchema.parse(paintInspectionJob))).toBeNull();
  });
});

// ── Roofing saved jobs ──────────────────────────────────────────────────────

const roofJob = {
  id: 'rj-1',
  address: '3 Ridge Rd, Annerley QLD',
  postcode: '4103',
  state: 'QLD',
  customer_name: null,
  structure_count: 2,
  combined_area_m2: 238.6,
  combined_better_inc_gst: 21450,
  routing: 'auto_quote',
  public_token: 'pub-roof-1',
  measure_token: 'meas-roof-1',
  created_at: '2026-08-26T22:10:00Z',
};

describe('SavedRoofJobsResponseSchema', () => {
  it('round-trips the GET payload, nulls included', () => {
    const parsed = SavedRoofJobsResponseSchema.parse({
      ok: true,
      jobs: [
        roofJob,
        {
          ...roofJob,
          id: 'rj-2',
          structure_count: null,
          combined_area_m2: null,
          combined_better_inc_gst: null,
          routing: 'inspection_required',
          public_token: null,
          measure_token: null,
        },
      ],
    });
    expect(parsed.jobs).toHaveLength(2);
    expect(parsed.jobs[0]?.combined_better_inc_gst).toBe(21450);
    expect(parsed.jobs[1]?.combined_better_inc_gst).toBeNull();
  });
});

describe('roofJobHref', () => {
  it('prefers the rich ?full=1 measurement view', () => {
    expect(roofJobHref(SavedRoofJobSchema.parse(roofJob))).toBe('/q/roof/pub-roof-1?full=1');
  });

  it('falls back to the measurement results page, then null', () => {
    expect(roofJobHref(SavedRoofJobSchema.parse({ ...roofJob, public_token: null }))).toBe(
      '/m/meas-roof-1',
    );
    expect(
      roofJobHref(SavedRoofJobSchema.parse({ ...roofJob, public_token: null, measure_token: null })),
    ).toBeNull();
  });
});

// ── Display helpers ─────────────────────────────────────────────────────────

describe('formatJobPrice — verbatim API dollars, dash when absent', () => {
  it('formats via the cents boundary', () => {
    expect(formatJobPrice(8642.5)).toBe('A$8,642.50');
    expect(formatJobPrice(0)).toBe('A$0.00');
  });

  it('dashes null/undefined/non-finite instead of inventing a number', () => {
    expect(formatJobPrice(null)).toBe('—');
    expect(formatJobPrice(undefined)).toBe('—');
    expect(formatJobPrice(Number.NaN)).toBe('—');
  });
});

describe('formatJobDate — en-AU short date', () => {
  it('renders day + short month + 2-digit year', () => {
    const out = formatJobDate('2026-08-25T04:30:00Z');
    expect(out).toContain('Aug');
    expect(out).toContain('26');
  });

  it('passes unparseable input through unchanged (web parity)', () => {
    expect(formatJobDate('not-a-date')).toBe('not-a-date');
  });
});
