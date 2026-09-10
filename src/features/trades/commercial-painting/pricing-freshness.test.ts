import { repriceAndProveFreshBom } from './pricing-freshness';
import { paintInputKey } from './pricing-contract';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
const review = { pricingProof: 'a'.repeat(64), pricedAt: '2026-09-09T00:00:00.123456Z' };
const bom = { lines: [{ surface: 'walls', quantity: 10, labourExGst: 80, materialExGst: 20, lineExGst: 100 }],
  unmatched: [], excluded: [], labour: { hours: 1, ratePerHr: 80, costExGst: 80 }, materials: [], materialsExGst: 20,
  equipment: [], equipmentExGst: 0, subtotalExGst: 100, gst: 10, totalIncGst: 110, gstRegistered: true, assumptions: [], exclusions: [] };
const price = () => ({ ok: true, bom, ...review, gst_registered: true, usesSeedDefaults: false, rateRows: 3, labourBasis: { mode: 'tenant', ratePerHr: null } });
const extraction = () => ({ id: 'extract-1', priced_bom: bom, priced_at: '2026-09-09T00:00:00.123456+00:00', pricing_review: review });

it('accepts the identical owned proof, microsecond generation and BOM after successful persistence', async () => {
  const result = await repriceAndProveFreshBom(async () => price(), async () => ({ data: { extraction: extraction() } }), 'extract-1');
  expect(result).toMatchObject({ ok: true, review, bom });
});
it.each([
  { pricing_review: { ...review, pricingProof: 'b'.repeat(64) } },
  { pricing_review: { ...review, pricedAt: '2026-09-09T00:00:00.123457Z' } },
  { priced_bom: { ...bom, totalIncGst: 111 } },
  { priced_at: '2026-09-09T00:00:00.123457+00:00' },
  { id: 'extract-2' },
])('rejects a concurrent replacement of the reviewed proof or BOM %j', async patch => {
  const result = await repriceAndProveFreshBom(async () => price(), async () => ({ data: { extraction: { ...extraction(), ...patch } } }), 'extract-1');
  expect(result.ok).toBe(false);
});
it.each([
  { usesSeedDefaults: true }, { labourBasis: undefined }, { rateRows: 0 }, { pricingProof: undefined },
  { gst_registered: false }, { bom: { ...bom, lines: [] } },
])('keeps incomplete or contradictory pricing authority closed %j', async patch => {
  const response = { ...price(), ...patch };
  const result = await repriceAndProveFreshBom(async () => response, async () => ({ data: { extraction: { ...extraction(), priced_bom: response.bom } } }), 'extract-1');
  expect(result.ok).toBe(false);
});
it('requires explicit override provenance and its exact reviewed value', async () => {
  const overrideBom = { ...bom, labour: { ...bom.labour, ratePerHr: 95.25 } };
  const response = { ...price(), bom: overrideBom, labourBasis: { mode: 'override', ratePerHr: 95.25 } };
  const fetch = async () => ({ data: { extraction: { ...extraction(), priced_bom: overrideBom } } });
  expect((await repriceAndProveFreshBom(async () => response, fetch, 'extract-1', 95.25)).ok).toBe(true);
  expect((await repriceAndProveFreshBom(async () => response, fetch, 'extract-1')).ok).toBe(false);
  expect((await repriceAndProveFreshBom(async () => response, fetch, 'extract-1', 95.26)).ok).toBe(false);
  expect((await repriceAndProveFreshBom(async () => ({ ...response, bom }), async () => ({ data: { extraction: extraction() } }), 'extract-1', 95.25)).ok).toBe(false);
});
it('compares unordered object fields without changing row order or values', () => {
  expect(paintInputKey({ a: 1, b: { d: 4, c: 3 } })).toBe(paintInputKey({ b: { c: 3, d: 4 }, a: 1 }));
  expect(paintInputKey([1, 2])).not.toBe(paintInputKey([2, 1]));
});
