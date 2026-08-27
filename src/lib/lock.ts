/**
 * Biometric unlock gate — the opt-in flag, the device round-trip, and the pure
 * lock-state machine BiometricGate drives.
 *
 * This is a PRIVACY SCREEN, not a security boundary: the Clerk session is the
 * real gate on data. Everything here therefore fails OPEN — a tradie with a
 * broken sensor or no enrolment must never be locked out of their quotes.
 * The flag lives in the keychain like the session token (see session.ts);
 * web degrades to "off" rather than crashing the bundler.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const LOCK_KEY = 'quotemax.biometric-lock';

/** Has the tradie opted in (Account → Security)? */
export async function isLockEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await SecureStore.getItemAsync(LOCK_KEY)) === 'true';
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  if (enabled) await SecureStore.setItemAsync(LOCK_KEY, 'true');
  else await SecureStore.deleteItemAsync(LOCK_KEY);
}

/** Hardware present AND a face/fingerprint enrolled — both, or the gate stays off. */
export async function isLockAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (
    (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())
  );
}

/**
 * One biometric round-trip. Device-passcode fallback stays enabled on purpose:
 * a rained-on Face ID must not strand the tradie. Unavailable hardware fails
 * open (true) per the module contract above.
 */
export async function authenticate(): Promise<boolean> {
  if (!(await isLockAvailable())) return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock QuoteMax',
  });
  return result.success;
}

/**
 * A quick app switch (checking a text, a supplier's site) must not re-prompt;
 * only an absence longer than this re-locks.
 */
export const LOCK_GRACE_MS = 30_000;

export type LockStatus = 'locked' | 'authenticating' | 'unlocked';

export interface LockState {
  status: LockStatus;
  /** When the app last left the foreground while unlocked, or null in front. */
  backgroundedAt: number | null;
}

export type LockEvent =
  | { type: 'coldStart' }
  | { type: 'backgrounded'; at: number }
  | { type: 'foregrounded'; at: number }
  | { type: 'authStarted' }
  | { type: 'authSucceeded' }
  | { type: 'authFailed' };

export const initialLockState: LockState = { status: 'locked', backgroundedAt: null };

/** Pure so the grace-window arithmetic is unit-testable without AppState. */
export function lockReducer(state: LockState, event: LockEvent): LockState {
  switch (event.type) {
    case 'coldStart':
      return initialLockState;
    case 'backgrounded':
      // Only an unlocked session earns the grace window; locked stays locked.
      return state.status === 'unlocked' ? { ...state, backgroundedAt: event.at } : state;
    case 'foregrounded': {
      if (state.status !== 'unlocked' || state.backgroundedAt === null) return state;
      const away = event.at - state.backgroundedAt;
      return away > LOCK_GRACE_MS
        ? { status: 'locked', backgroundedAt: null }
        : { ...state, backgroundedAt: null };
    }
    case 'authStarted':
      return state.status === 'locked' ? { ...state, status: 'authenticating' } : state;
    case 'authSucceeded':
      return { status: 'unlocked', backgroundedAt: null };
    case 'authFailed':
      // Back to locked, never signed out — the Unlock button retries.
      return state.status === 'authenticating' ? { ...state, status: 'locked' } : state;
  }
}
