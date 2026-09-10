import {
  deriveTradeFromJobType,
  fieldsForJobType,
  formatJobType,
  jobTypesForTrade,
  JOB_FIELDS,
  allowsPinnedCatalogueProduct,
  productAfterAnswerChange,
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
  it('carries the exact five EV questions and server-recognised option strings', () => {
    expect(fieldsForJobType('ev_charger').fields).toEqual([
      {
        code: 'vehicle',
        label: 'What car is the charger for?',
        type: 'select',
        options: ['Tesla', 'BYD', 'another EV', 'not sure'],
      },
      {
        code: 'charger_supply',
        label: 'Who supplies the charger unit?',
        type: 'select',
        options: ['customer already has the charger', 'we supply the charger', 'not sure'],
      },
      {
        code: 'room',
        label: 'Where is the charger going (garage, carport, external wall)?',
        type: 'text',
      },
      {
        code: 'switchboard_distance',
        label: 'Roughly how far is the switchboard from the charger spot?',
        type: 'select',
        options: ['under 5 m', '5–10 m', 'over 10 m', 'not sure'],
      },
      {
        code: 'phase',
        label: 'Single phase or three phase?',
        type: 'select',
        options: ['single phase', 'three phase (on-site inspection)', 'not sure'],
      },
    ]);
  });

  it.each(['customer already has the charger', 'not sure', '', 'We supply the charger'])(
    'does not pin an EV unit for the non-tradie-supply answer %s',
    value => {
      expect(allowsPinnedCatalogueProduct('ev_charger', { charger_supply: value })).toBe(false);
      expect(productAfterAnswerChange('ev_charger', 'charger_supply', value, 'product1')).toBe('');
    },
  );

  it('preserves the existing non-EV product picker and the explicit tradie-supply pin', () => {
    expect(allowsPinnedCatalogueProduct('downlights', {})).toBe(true);
    expect(
      allowsPinnedCatalogueProduct('ev_charger', { charger_supply: 'we supply the charger' }),
    ).toBe(true);
    expect(productAfterAnswerChange('ev_charger', 'phase', 'not sure', 'product1')).toBe(
      'product1',
    );
  });
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
