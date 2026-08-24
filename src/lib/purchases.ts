/**
 * RevenueCat — the whole payments integration.
 * Docs: https://www.revenuecat.com/docs/welcome/overview
 *
 * react-native-purchases and react-native-purchases-ui are NATIVE-ONLY, so every
 * entry point below loads them lazily and degrades to "purchases unavailable"
 * rather than throwing. Nothing here ever touches a job price — this is the
 * tradie's QuoteMax subscription, not a quote.
 *
 * Three keys, all PUBLIC SDK keys (RevenueCat → Project settings → API keys).
 * Public means configuration, not secrets, so EXPO_PUBLIC_ is correct:
 *   EXPO_PUBLIC_REVENUECAT_IOS_KEY      appl_…  App Store / TestFlight builds
 *   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY  goog_…  Play builds
 *   EXPO_PUBLIC_REVENUECAT_TEST_KEY     test_…  Expo Go only — see below
 */
import { useAuth } from '@clerk/expo';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

type PurchasesModule = typeof import('react-native-purchases').default;
type PaywallUi = typeof import('react-native-purchases-ui').default;

// ── Plans ───────────────────────────────────────────────────────────────────

/**
 * Entitlement identifiers exactly as configured in RevenueCat (Project →
 * Entitlements). Ordered cheapest → dearest: Crew satisfies every check below it.
 * Change these here and in the dashboard together, or gating silently opens up.
 */
export const PLANS = ['starter', 'pro', 'crew'] as const;
export type Plan = (typeof PLANS)[number];

/** The entitlements RevenueCat currently considers active for this customer. */
export function activeEntitlementIds(info: CustomerInfo | null | undefined): string[] {
  return info ? Object.keys(info.entitlements.active) : [];
}

/** Highest plan the tradie actually holds, or null when they hold none. */
export function planFromEntitlementIds(activeIds: readonly string[]): Plan | null {
  for (let i = PLANS.length - 1; i >= 0; i -= 1) {
    const plan = PLANS[i];
    if (plan !== undefined && activeIds.includes(plan)) return plan;
  }
  return null;
}

/** Does the plan they hold cover a feature that needs `required` or better? */
export function planCovers(plan: Plan | null, required: Plan): boolean {
  return plan !== null && PLANS.indexOf(plan) >= PLANS.indexOf(required);
}

// ── Configuration ───────────────────────────────────────────────────────────

const STORE_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

/**
 * Expo Go carries no native billing, so the SDK falls back to its simulated
 * store — which accepts only a Test Store key and rejects appl_/goog_ keys with
 * "Invalid API key. The native store is not available…". Real purchases need a
 * development build. https://rev.cat/sdk-test-store
 *
 * appOwnership is deprecated but it is the only field that separates Expo Go
 * from a dev client: executionEnvironment reports "storeClient" for both.
 */
const IN_EXPO_GO = Constants.appOwnership === 'expo';
const API_KEY = IN_EXPO_GO ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY : STORE_KEY;

let configured: Promise<PurchasesModule | null> | null = null;

function warnUnconfigured(): void {
  if (!__DEV__ || Platform.OS === 'web') return;
  console.warn(
    IN_EXPO_GO
      ? 'RevenueCat: set EXPO_PUBLIC_REVENUECAT_TEST_KEY (a test_… Test Store key) to ' +
          'exercise purchases in Expo Go, or run a development build for the real store.'
      : `RevenueCat: EXPO_PUBLIC_REVENUECAT_${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}` +
          '_KEY is not set — purchases are disabled this run.',
  );
}

/**
 * Configure once, idempotently. Resolves to the Purchases module, or null when
 * purchases are unavailable here. Never rejects: failing to configure *is*
 * "purchases unavailable", and it resets so a later call can retry.
 */
export function configurePurchases(): Promise<PurchasesModule | null> {
  configured ??= (async () => {
    if (!API_KEY) {
      warnUnconfigured();
      return null;
    }
    try {
      const mod = await import('react-native-purchases');
      const purchases = mod.default;
      // Log level must be set before configure, or the configure call is silent.
      if (__DEV__) await purchases.setLogLevel(mod.LOG_LEVEL.DEBUG);
      // No appUserID here: Clerk restores its session asynchronously, so we start
      // anonymous and usePurchases() logs the tradie in the moment Clerk resolves.
      // RevenueCat aliases the anonymous customer onto the real one at that point.
      purchases.configure({ apiKey: API_KEY });
      return purchases;
    } catch (err) {
      console.warn('RevenueCat: configure failed — purchases are unavailable', err);
      configured = null;
      return null;
    }
  })();
  return configured;
}

// ── Customer state ──────────────────────────────────────────────────────────

export const purchasesKeys = {
  customer: ['revenuecat', 'customer'] as const,
};

async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  const purchases = await configurePurchases();
  if (!purchases) return null;
  return purchases.getCustomerInfo();
}

/** Live subscription state. Null means purchases are unavailable, not "unsubscribed". */
export function useCustomerInfo() {
  return useQuery({
    queryKey: purchasesKeys.customer,
    queryFn: fetchCustomerInfo,
    // The SDK caches and pushes updates through addCustomerInfoUpdateListener,
    // so refetching on a roof with two bars buys nothing.
    staleTime: 5 * 60 * 1000,
  });
}

/** The plan this tradie is on, for gating. */
export function usePlan(): { plan: Plan | null; isLoading: boolean } {
  const { data, isLoading } = useCustomerInfo();
  return { plan: planFromEntitlementIds(activeEntitlementIds(data)), isLoading };
}

/** One-off imperative check, for code that is not inside a component. */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  const info = await fetchCustomerInfo();
  return activeEntitlementIds(info).includes(entitlementId);
}

/** Align the RevenueCat customer with the Clerk user (or back to anonymous). */
export async function syncPurchasesIdentity(
  clerkUserId: string | null,
  queryClient: QueryClient,
): Promise<void> {
  const purchases = await configurePurchases();
  if (!purchases) return;
  try {
    if (clerkUserId) {
      const { customerInfo } = await purchases.logIn(clerkUserId);
      queryClient.setQueryData(purchasesKeys.customer, customerInfo);
    } else if (!(await purchases.isAnonymous())) {
      const customerInfo = await purchases.logOut();
      queryClient.setQueryData(purchasesKeys.customer, customerInfo);
    }
  } catch (err) {
    // Identity sync must never take the app down; entitlement checks still work
    // against whichever customer the SDK currently holds.
    console.warn('RevenueCat identity sync failed', err);
  }
}

// ── Purchase flows ──────────────────────────────────────────────────────────

/** True when the tradie came back from the paywall entitled. */
async function runPaywall(present: (ui: PaywallUi) => Promise<string>): Promise<boolean> {
  const purchases = await configurePurchases();
  if (!purchases) return false;
  try {
    const ui = (await import('react-native-purchases-ui')).default;
    const result = await present(ui);
    // PURCHASED and RESTORED mean "they have it now". NOT_PRESENTED means the
    // paywall was skipped because the entitlement is ALREADY active — refusing
    // it would lock paying tradies out of what they pay for. CANCELLED and
    // ERROR mean "they do not have it".
    return result === 'PURCHASED' || result === 'RESTORED' || result === 'NOT_PRESENTED';
  } catch (err) {
    console.warn('RevenueCat paywall failed', err);
    return false;
  }
}

/** Show the paywall configured in the RevenueCat dashboard. */
export function presentPaywall(): Promise<boolean> {
  return runPaywall(ui => ui.presentPaywall());
}

/** Show the paywall only if this entitlement is not already active. */
export function presentPaywallIfNeeded(requiredEntitlementIdentifier: Plan): Promise<boolean> {
  return runPaywall(ui => ui.presentPaywallIfNeeded({ requiredEntitlementIdentifier }));
}

/**
 * RevenueCat's own manage-subscription screen: cancel, change plan, request a
 * refund. Native builds only — it no-ops under Expo Go's preview mode.
 */
export async function presentCustomerCenter(): Promise<void> {
  const purchases = await configurePurchases();
  if (!purchases) return;
  try {
    const ui = (await import('react-native-purchases-ui')).default;
    await ui.presentCustomerCenter();
  } catch (err) {
    console.warn('RevenueCat customer center failed', err);
  }
}

/**
 * Re-grant entitlements bought on another device or before a reinstall. Apple
 * requires an explicit control for this wherever purchases are offered; the
 * RevenueCat paywall ships one, so this is for your own screens.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  const purchases = await configurePurchases();
  if (!purchases) return null;
  return purchases.restorePurchases();
}

// ── Root wiring ─────────────────────────────────────────────────────────────

/**
 * Mount once inside ClerkProvider and QueryClientProvider (done in the root
 * layout): configures the SDK at launch, keeps the RevenueCat customer tied to
 * the Clerk session, and keeps cached entitlements live as purchases land.
 */
export function usePurchases(): void {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();

  const cacheCustomerInfo = useCallback(
    (info: CustomerInfo) => queryClient.setQueryData(purchasesKeys.customer, info),
    [queryClient],
  );

  useEffect(() => {
    let cancelled = false;
    let listening: PurchasesModule | null = null;

    void configurePurchases().then(purchases => {
      if (cancelled || !purchases) return;
      listening = purchases;
      // Fires on renewals, expiries and purchases made outside a paywall, so
      // gating reacts without anyone remembering to refetch.
      purchases.addCustomerInfoUpdateListener(cacheCustomerInfo);
    });

    return () => {
      cancelled = true;
      listening?.removeCustomerInfoUpdateListener(cacheCustomerInfo);
    };
  }, [cacheCustomerInfo]);

  useEffect(() => {
    if (isLoaded) void syncPurchasesIdentity(userId ?? null, queryClient);
  }, [isLoaded, userId, queryClient]);
}
