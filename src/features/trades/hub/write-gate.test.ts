/**
 * Pins the mobile write gate to the backend contract it mirrors
 * (web lib/tenant/update-schema.ts TRADE_ENUM + lib/tenant/recipe-trades.ts).
 */
import { canWritePricingEngine, recipeTradesFor, WRITE_TRADES } from './write-gate';

describe('WRITE_TRADES mirrors the backend TRADE_ENUM', () => {
  it('is exactly the electrical + plumbing pair', () => {
    expect([...WRITE_TRADES]).toEqual(['electrical', 'plumbing']);
  });
});

describe('canWritePricingEngine', () => {
  it('allows the writable pair', () => {
    expect(canWritePricingEngine('electrical')).toBe(true);
    expect(canWritePricingEngine('plumbing')).toBe(true);
  });

  it('blocks the other six hub trades', () => {
    for (const t of ['roofing', 'signage', 'painting', 'commercial_painting', 'aircon', 'solar']) {
      expect(canWritePricingEngine(t)).toBe(false);
    }
  });

  it('is case-insensitive like hubTrades', () => {
    expect(canWritePricingEngine('Electrical')).toBe(true);
  });
});

describe('recipeTradesFor', () => {
  it('narrows an 8-trade tenant to the writable pair', () => {
    const eight = [
      'electrical',
      'plumbing',
      'roofing',
      'signage',
      'painting',
      'commercial_painting',
      'aircon',
      'solar',
    ];
    expect(recipeTradesFor(eight).sort()).toEqual(['electrical', 'plumbing']);
  });

  it('drops unwritable trades without inventing others', () => {
    expect(recipeTradesFor(['aircon', 'electrical'])).toEqual(['electrical']);
  });

  it('returns [] for a tenant with no writable trade — "no jobs", never "no filter"', () => {
    expect(recipeTradesFor(['roofing'])).toEqual([]);
  });

  it('falls back to the writable pair when no trades are recorded', () => {
    expect(recipeTradesFor([]).sort()).toEqual(['electrical', 'plumbing']);
  });
});
