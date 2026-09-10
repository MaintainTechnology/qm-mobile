import { OwnedRoofSchema, ROOF_CORRECTIONS, roofCorrectionBody, roofFootprints, roofPromotionBody, roofSelection, type RoofEdits } from './owned-roof';

import { roofFixture } from './roof-test-fixture';

it('validates the owned reader schema including revision and current authority', () => {
  expect(OwnedRoofSchema.parse({ ok:true,measurement:roofFixture() }).measurement.tenant_id).toBe('tenant_A');
  expect(OwnedRoofSchema.safeParse({ ok:true,measurement:{...roofFixture(),revision:'stale'} }).success).toBe(false);
});
it('submits only explicit corrections without silently resending area alongside changed pitch', () => {
  expect(roofCorrectionBody(roofFixture(),{'1':{pitch_degrees:'25'}})).toEqual({expected_revision:'a'.repeat(64),edges:[{index:1,pitch_degrees:25}]});
});
it('keeps an explicitly supplied area in the same correction, preserving server precedence', () => {
  expect(roofCorrectionBody(roofFixture(),{'2':{pitch_degrees:'25',sloped_area_m2:'165.25'}}).edges).toEqual([{index:2,sloped_area_m2:165.25,pitch_degrees:25}]);
});
it('preserves valid zero and literal null removal for counts/accessories', () => {
  expect(roofCorrectionBody(roofFixture(),{'1':{hips:'0',gutter_lm:'',downpipe_count:'0'}}).edges).toEqual([{index:1,hips:0,gutter_lm:null,downpipe_count:0}]);
});
it.each(['','0','-1','1e3','NaN','Infinity','10001'])('rejects invalid or missing area %s', value => {
  expect(() => roofCorrectionBody(roofFixture(),{'1':{sloped_area_m2:value}})).toThrow();
});
it('rejects fractional counts, excessive values and unknown building indices', () => {
  const cases: RoofEdits[] = [{ '1':{hips:'1.5'} },{'1':{downpipe_count:'61'}},{'3':{hips:'1'}}];
  for (const edits of cases) expect(() => roofCorrectionBody(roofFixture(),edits)).toThrow();
  expect(ROOF_CORRECTIONS.some(field => (field.key as string) === 'height')).toBe(false);
});
it('promotes only owned capability and authority, never client money or geometry', () => {
  expect(roofPromotionBody(roofFixture())).toEqual({measure_token:'measure-token-one',expected_pricing_revision:'b'.repeat(64)});
});
it('blocks paid, foreign authority, already promoted, pending and inspection selections', () => {
  const base = roofFixture();
  for (const roof of [ {...base,paid_at:'now'}, {...base,pricing_authority:null}, {...base,promotion_pending:true},
    {...base,promoted_quote_id:'other'}, {...base,pricing_authority:{...base.pricing_authority!,tenant_id:'other'}} ]) expect(roofPromotionBody(roof)).toBeNull();
  base.quote!.structures[0]!.price.routing.decision = 'inspection_required'; expect(roofPromotionBody(base)).toBeNull();
});
it('normalizes valid selections without inventing a price', () => {
  expect(roofSelection({...roofFixture(),included_indices:[2,1,2,99]})).toEqual([1,2]);
  expect(roofSelection({...roofFixture(),included_indices:[]})).toEqual([]);
});
it('uses valid saved polygons only, and rejects non-finite or excessive geometry', () => {
  expect(roofFootprints(roofFixture())).toHaveLength(2);
  const roof = roofFixture(); roof.quote!.structures[0]!.metrics.polygon_geojson = {type:'Polygon',coordinates:[[[Infinity,0],[1,0],[1,1],[0,0]]]};
  expect(roofFootprints(roof)).toHaveLength(1);
});
