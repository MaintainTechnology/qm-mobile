import { activeEntitlementIds, planCovers, planFromEntitlementIds } from '@/lib/purchases';

// The plan helpers are pure; pulling Clerk in for them leaks a worker and prints
// its deprecation banner on every run. babel-jest hoists this above the import.
jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ isLoaded: false, userId: null }) }));

describe('planFromEntitlementIds', () => {
  it('returns null when the tradie holds nothing', () => {
    expect(planFromEntitlementIds([])).toBeNull();
  });

  it('reads the plan they hold', () => {
    expect(planFromEntitlementIds(['starter'])).toBe('starter');
    expect(planFromEntitlementIds(['pro'])).toBe('pro');
  });

  it('takes the dearest when several are active mid-upgrade', () => {
    expect(planFromEntitlementIds(['starter', 'crew', 'pro'])).toBe('crew');
  });

  it('ignores entitlements that are not plans', () => {
    expect(planFromEntitlementIds(['roof_estimator'])).toBeNull();
  });
});

describe('planCovers', () => {
  it('lets a dearer plan through a cheaper gate', () => {
    expect(planCovers('crew', 'starter')).toBe(true);
    expect(planCovers('pro', 'pro')).toBe(true);
  });

  it('holds a cheaper plan back from a dearer gate', () => {
    expect(planCovers('starter', 'pro')).toBe(false);
  });

  it('never opens a gate for a tradie with no plan', () => {
    expect(planCovers(null, 'starter')).toBe(false);
  });
});

describe('activeEntitlementIds', () => {
  it('treats missing customer info as no entitlements, not as an error', () => {
    expect(activeEntitlementIds(null)).toEqual([]);
    expect(activeEntitlementIds(undefined)).toEqual([]);
  });

  it('reads the active map RevenueCat returns', () => {
    const info = { entitlements: { active: { pro: {} } } } as never;
    expect(activeEntitlementIds(info)).toEqual(['pro']);
  });
});
