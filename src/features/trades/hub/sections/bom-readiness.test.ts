import {
  assessRecipePriceReadiness,
  evaluateRecipeCondition,
  missingRequiredPriceCategories,
} from './bom-readiness';

describe('BOM readiness authority', () => {
  it('keeps required unknown conditions fail-closed and reports their need for product context', () => {
    const lines = [
      { material_category: 'downlight', required: true, include_when: null },
      { material_category: 'optional_sensor', required: false, include_when: null },
      { material_category: 'conditional_fan', required: true, include_when: { room: 'bathroom' } },
      { material_category: 'empty_condition', required: true, include_when: {} },
    ];
    const byTrade = {
      electrical: ['empty_condition'],
      plumbing: ['downlight', 'optional_sensor', 'conditional_fan'],
    };

    expect(missingRequiredPriceCategories(lines, byTrade, 'electrical')).toEqual([
      'downlight',
      'conditional_fan',
    ]);
    expect(missingRequiredPriceCategories(lines, byTrade, 'plumbing')).toEqual(['empty_condition']);
    expect(
      assessRecipePriceReadiness(lines, byTrade, 'electrical').conditionalContextCategories,
    ).toEqual(['conditional_fan']);
  });

  it('uses headline-product properties for known matches and mismatches', () => {
    const conditional = [
      {
        material_category: 'driver',
        required: true,
        include_when: { integrated_driver: false },
      },
    ];
    const byTrade = { electrical: [] };

    expect(
      missingRequiredPriceCategories(conditional, byTrade, 'electrical', {
        integrated_driver: false,
      }),
    ).toEqual(['driver']);
    expect(
      missingRequiredPriceCategories(conditional, byTrade, 'electrical', {
        integrated_driver: true,
      }),
    ).toEqual([]);
    // An accessory's properties are deliberately not an input to this helper.
    expect(missingRequiredPriceCategories(conditional, byTrade, 'electrical')).toEqual(['driver']);
  });

  it('excludes optional unknown conditions but retains required unknown conditions', () => {
    expect(evaluateRecipeCondition({ smart: true }, null)).toBe('unknown');
    const lines = [
      { material_category: 'required_pairing', required: true, include_when: { smart: true } },
      { material_category: 'optional_dimmer', required: false, include_when: { smart: true } },
    ];
    expect(missingRequiredPriceCategories(lines, { electrical: [] }, 'electrical')).toEqual([
      'required_pairing',
    ]);
  });

  it.each([
    [true, 'yes'],
    ['YES', 1],
    ['1', true],
    [false, 'no'],
    ['N', 0],
    ['0', false],
    ['Premium', 'premium'],
  ])('normalises attribute equality for %p and %p', (actual, wanted) => {
    expect(evaluateRecipeCondition({ feature: wanted }, { feature: actual })).toBe('include');
  });

  it('requires every known comparison to match and lets a known mismatch beat another unknown key', () => {
    expect(
      evaluateRecipeCondition({ smart: true, colour: 'white' }, { smart: 'yes', colour: 'WHITE' }),
    ).toBe('include');
    expect(evaluateRecipeCondition({ smart: true, colour: 'white' }, { smart: 'no' })).toBe(
      'exclude',
    );
  });

  it('treats null and empty conditions as unconditional', () => {
    expect(evaluateRecipeCondition(null, null)).toBe('include');
    expect(evaluateRecipeCondition({}, null)).toBe('include');
  });
});
