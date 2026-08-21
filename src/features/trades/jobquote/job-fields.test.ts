import {
  deriveTradeFromJobType,
  fieldsForJobType,
  formatJobType,
  jobTypesForTrade,
  JOB_FIELDS,
} from './job-fields';

describe('deriveTradeFromJobType', () => {
  it('classifies plumbing job types', () => {
    expect(deriveTradeFromJobType('hot_water')).toBe('plumbing');
    expect(deriveTradeFromJobType('blocked_drain')).toBe('plumbing');
  });

  it('defaults everything else — including "other" — to electrical', () => {
    expect(deriveTradeFromJobType('downlights')).toBe('electrical');
    expect(deriveTradeFromJobType('other')).toBe('electrical');
    expect(deriveTradeFromJobType('unknown_job_type')).toBe('electrical');
  });
});

describe('jobTypesForTrade', () => {
  it('only offers each trade its own job types (electrical carries the "other" fallback)', () => {
    const electrical = jobTypesForTrade('electrical');
    const plumbing = jobTypesForTrade('plumbing');
    expect(electrical).toContain('downlights');
    expect(electrical).toContain('other');
    expect(electrical).not.toContain('hot_water');
    expect(plumbing).toContain('hot_water');
    expect(plumbing).not.toContain('other');
  });
});

describe('fieldsForJobType', () => {
  it('has a field spec for every job type it offers', () => {
    for (const trade of ['electrical', 'plumbing'] as const) {
      for (const jobType of jobTypesForTrade(trade)) {
        expect(fieldsForJobType(jobType).fields.length).toBeGreaterThan(0);
      }
    }
  });

  it('falls back to the generic room field for an unknown job type', () => {
    const spec = fieldsForJobType('not_a_real_job_type');
    expect(spec.fields).toEqual(JOB_FIELDS.other?.fields);
    expect(spec.usuallyInspection).toBe(true);
  });

  it('carries the recipe-slot fields power_points needs for the price bands to apply', () => {
    const spec = fieldsForJobType('power_points');
    const codes = spec.fields.map(f => f.code);
    expect(codes).toEqual(
      expect.arrayContaining(['count', 'distance_to_existing_power', 'circuit_required']),
    );
  });
});

describe('formatJobType', () => {
  it('title-cases the first word and keeps trade acronyms upper-case', () => {
    expect(formatJobType('blocked_drain')).toBe('Blocked drain');
    expect(formatJobType('ev_charger')).toBe('EV charger');
    expect(formatJobType('cctv_inspection')).toBe('CCTV inspection');
    expect(formatJobType(null)).toBe('Unclassified');
  });
});
