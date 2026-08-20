/**
 * RevenueCat wiring (per https://www.revenuecat.com/docs/getting-started/quickstart).
 *
 * react-native-purchases is NATIVE-ONLY: importing it in the web bundle (or in
 * Expo Go, or in a dev client that has not been rebuilt since install) throws
 * "`new NativeEventEmitter()` requires a non-null argument". Everything here
 * loads the SDK lazily behind a platform / Expo Go guard so web dev keeps working, and
 * degrades to "purchases unavailable" when the API keys are not set yet.
 *
 * Keys are the PUBLIC per-platform SDK keys from the RevenueCat dashboard
 * (Project Settings → API keys → App specific keys) — configuration, not
 * secrets, so EXPO_PUBLIC_ is correct for them.
 */
import { useAuth } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

type Purchases = typeof import('react-native-purchases').default;

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

// Expo Go ships no RevenueCat native module. appOwnership is deprecated but it
// is the only field that tells Expo Go apart from a dev client —
// executionEnvironment reports 'storeClient' for both. Swap it if expo-constants
// ever ships a replacement.
const IN_EXPO_GO = Constants.appOwnership === 'expo';

let configured: Promise<Purchases | null> | null = null;

/**
 * Configure once, idempotently. Resolves to the Purchases module, or null when
 * purchases are unavailable here (web, or keys not set for this platform).
 */
export function configurePurchases(): Promise<Purchases | null> {
  configured ??= (async () => {
    if (IN_EXPO_GO) {
      if (__DEV__) {
        console.warn(
          'RevenueCat: purchases are disabled in Expo Go — it has no native module ' +
            'for them. Run a development build to test purchases.',
        );
      }
      return null;
    }
    if (!API_KEY) {
      if (__DEV__ && Platform.OS !== 'web') {
        console.warn(
          'RevenueCat: EXPO_PUBLIC_REVENUECAT_' +
            (Platform.OS === 'ios' ? 'IOS' : 'ANDROID') +
            '_KEY is not set — purchases are disabled this run.',
        );
      }
      return null;
    }
    const mod = await import('react-native-purchases');
    const purchases = mod.default;
    if (__DEV__) purchases.setLogLevel(mod.LOG_LEVEL.DEBUG);
    // No appUserID here: Clerk restores its session asynchronously, so we start
    // anonymous and usePurchases() logs the tradie in the moment Clerk resolves.
    purchases.configure({ apiKey: API_KEY });
    return purchases;
  })();
  return configured;
}

/** Align the RevenueCat customer with the Clerk user (or back to anonymous). */
export async function syncPurchasesIdentity(clerkUserId: string | null): Promise<void> {
  const purchases = await configurePurchases();
  if (!purchases) return;
  try {
    if (clerkUserId) {
      await purchases.logIn(clerkUserId);
    } else if (!(await purchases.isAnonymous())) {
      await purchases.logOut();
    }
  } catch (err) {
    // Identity sync must never take the app down; entitlement checks still
    // work against whichever customer the SDK currently holds.
    console.warn('RevenueCat identity sync failed', err);
  }
}

/** Quickstart step 3: is this entitlement active for the current customer? */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  const purchases = await configurePurchases();
  if (!purchases) return false;
  const info = await purchases.getCustomerInfo();
  return info.entitlements.active[entitlementId] !== undefined;
}

/**
 * Mount once inside ClerkProvider (done in the root layout): configures the
 * SDK at launch and keeps the RevenueCat customer tied to the Clerk session.
 */
export function usePurchases(): void {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    void configurePurchases();
  }, []);

  useEffect(() => {
    if (isLoaded) void syncPurchasesIdentity(userId ?? null);
  }, [isLoaded, userId]);
}
