export type BillingPlan = 'starter' | 'pro' | 'crew';

export const BILLING_PLAN_LABELS: Record<BillingPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  crew: 'Crew',
};

/** Stripe states the backend currently treats as access-bearing. */
export function isLiveBillingStatus(status: string | null | undefined): boolean {
  return status === 'trialing' || status === 'active' || status === 'past_due';
}

export type NativeStorePurchaseGate = {
  allowed: false;
  reason: 'duplicate-subscription-risk' | 'server-reconciliation-missing';
};

/**
 * The repository has no server receipt/webhook reconciliation for RevenueCat
 * yet. Never charge from the client until that contract exists; an existing
 * Stripe customer would additionally risk a duplicate subscription.
 */
export function nativeStorePurchaseGate(
  record:
    | {
        has_customer?: boolean | null;
      }
    | null
    | undefined,
): NativeStorePurchaseGate {
  return {
    allowed: false,
    reason: record?.has_customer ? 'duplicate-subscription-risk' : 'server-reconciliation-missing',
  };
}
