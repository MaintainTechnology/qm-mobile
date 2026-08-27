/**
 * Pins the Estimating editor's pure helpers to the backend contract
 * (web app/api/tenant/estimation/[assemblyId]/route.ts PatchSchema) and to
 * the web's effective-value resolution (lib/estimate/catalogue.ts).
 */
import {
  buildOverridePatch,
  LABOUR_HOURS_MAX,
  MARKUP_PCT_MAX,
  parseLabourHours,
  parseMarkupPct,
  resolveEffective,
} from './estimating-api';

describe('bounds mirror the server PatchSchema', () => {
  it('labour max 40, markup max 200', () => {
    expect(LABOUR_HOURS_MAX).toBe(40);
    expect(MARKUP_PCT_MAX).toBe(200);
  });
});

describe('parseLabourHours', () => {
  it('accepts in-range values, decimals included', () => {
    expect(parseLabourHours('3')).toBe(3);
    expect(parseLabourHours('0.25')).toBe(0.25);
    expect(parseLabourHours('40')).toBe(40);
    expect(parseLabourHours(' 2.5 ')).toBe(2.5);
  });

  it('rejects zero and negatives — the server wants positive()', () => {
    expect(parseLabourHours('0')).toBeNull();
    expect(parseLabourHours('-1')).toBeNull();
  });

  it('rejects values over the 40h cap', () => {
    expect(parseLabourHours('40.5')).toBeNull();
    expect(parseLabourHours('999')).toBeNull();
  });

  it('rejects NaN, junk and empty — never a silent 0', () => {
    expect(parseLabourHours('')).toBeNull();
    expect(parseLabourHours('   ')).toBeNull();
    expect(parseLabourHours('abc')).toBeNull();
    expect(parseLabourHours('4h')).toBeNull();
    expect(parseLabourHours('NaN')).toBeNull();
    expect(parseLabourHours('Infinity')).toBeNull();
  });
});

describe('parseMarkupPct', () => {
  it('accepts the full 0–200 band, endpoints included', () => {
    expect(parseMarkupPct('0')).toBe(0);
    expect(parseMarkupPct('28')).toBe(28);
    expect(parseMarkupPct('200')).toBe(200);
  });

  it('rejects out-of-band values', () => {
    expect(parseMarkupPct('-1')).toBeNull();
    expect(parseMarkupPct('200.5')).toBeNull();
  });

  it('rejects NaN, junk and empty', () => {
    expect(parseMarkupPct('')).toBeNull();
    expect(parseMarkupPct('ten')).toBeNull();
    expect(parseMarkupPct('NaN')).toBeNull();
  });
});

describe('resolveEffective — web local/global badge parity', () => {
  it('a set override wins with source local', () => {
    expect(resolveEffective(3, 5)).toEqual({ value: 5, source: 'local' });
    expect(resolveEffective(28, 0)).toEqual({ value: 0, source: 'local' });
  });

  it('null and undefined fall back to global — an absent override is not a dropped one', () => {
    expect(resolveEffective(3, null)).toEqual({ value: 3, source: 'global' });
    expect(resolveEffective(28, undefined)).toEqual({ value: 28, source: 'global' });
  });

  it('a non-finite override falls back to global rather than rendering NaN', () => {
    expect(resolveEffective(3, Number.NaN)).toEqual({ value: 3, source: 'global' });
  });
});

describe('buildOverridePatch — both fields always present, null clears', () => {
  it('carries both numbers on a full save', () => {
    expect(buildOverridePatch(4, 35)).toEqual({
      labour_hours_override: 4,
      markup_pct_override: 35,
    });
  });

  it('null clears one field without dropping the other', () => {
    expect(buildOverridePatch(null, 35)).toEqual({
      labour_hours_override: null,
      markup_pct_override: 35,
    });
    expect(buildOverridePatch(4, null)).toEqual({
      labour_hours_override: 4,
      markup_pct_override: null,
    });
  });

  it('double-null clears both fields (row removal itself is DELETE)', () => {
    expect(buildOverridePatch(null, null)).toEqual({
      labour_hours_override: null,
      markup_pct_override: null,
    });
  });
});
