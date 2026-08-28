import { missingRequiredPriceCategories } from './bom-readiness';

describe('BOM readiness authority', () => {
  it('uses only the selected trade and unconditionally required lines', () => {
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

    expect(missingRequiredPriceCategories(lines, byTrade, 'electrical')).toEqual(['downlight']);
    expect(missingRequiredPriceCategories(lines, byTrade, 'plumbing')).toEqual(['empty_condition']);
  });
});
