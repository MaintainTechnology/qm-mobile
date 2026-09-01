import { isLiveBillingStatus, nativeStorePurchaseGate } from './billing-state';

describe('billing authority', () => {
  it('blocks a duplicate native subscription for an existing Stripe customer', () => {
    expect(nativeStorePurchaseGate({ has_customer: true })).toEqual({
      allowed: false,
      reason: 'duplicate-subscription-risk',
    });
  });

  it('blocks native charging until server receipt reconciliation exists', () => {
    expect(nativeStorePurchaseGate({ has_customer: false })).toEqual({
      allowed: false,
      reason: 'server-reconciliation-missing',
    });
    expect(isLiveBillingStatus('cancelled')).toBe(false);
    expect(isLiveBillingStatus('past_due')).toBe(true);
  });
});
