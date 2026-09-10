/**
 * Resolve the opt-in privacy lock before mounting signed-in screens. Once
 * opened, keep screen state mounted under the overlay for a subsequent lock.
 *
 * Armed only when the tradie is signed in, has opted in (Account → Security)
 * and the device can actually authenticate. Known disabled/unavailable states
 * bypass this local gate; unreadable settings offer retry. Clerk remains the
 * server security boundary (src/lib/lock.ts). The
 * escape hatch is the same sign-out flow MenuScreen runs, for a tradie whose
 * face/finger suddenly won't scan and who needs to hand the phone back.
 */
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { AUTH_GUTTER, FaceIdIcon, PrimaryCta } from '@/features/auth/ui';
import { clearAccountScopedState } from '@/lib/account-storage';
import {
  authenticate,
  initialLockState,
  isLockAvailable,
  isLockEnabled,
  lockReducer,
} from '@/lib/lock';
import { fonts, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { unregisterPushToken } from '@/lib/notifications';
import { signOutWithCleanup } from '@/lib/sign-out';

export function BiometricGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, sessionId } = useAuth();
  // A new account/session must not inherit an earlier local unlock or request.
  return (
    <SessionPrivacyGate
      key={`${isLoaded}:${userId ?? ''}:${sessionId ?? ''}:${isSignedIn}`}
      signedIn={isLoaded && isSignedIn === true}
      signedOut={isLoaded && isSignedIn === false}
    >
      {children}
    </SessionPrivacyGate>
  );
}

const LOCK_CHECK_TIMEOUT_MS = 10_000;
type LockMode = 'checking' | 'disabled' | 'armed' | 'error';

function SessionPrivacyGate({
  children,
  signedIn,
  signedOut,
}: {
  children: ReactNode;
  signedIn: boolean;
  signedOut: boolean;
}) {
  const { signOut, getToken } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [state, dispatch] = useReducer(lockReducer, initialLockState);
  const [mode, setMode] = useState<LockMode>('checking');
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const mounted = useRef(false);
  const probe = useRef(0);
  const attempt = useRef(0);
  const authenticating = useRef(false);
  const leaving = useRef(false);
  const appState = useRef(AppState.currentState);
  const opened = useRef(false);

  // Re-checked on every foreground so an Account → Security toggle (or a
  // deleted enrolment) takes effect without a relaunch.
  const refreshArmed = useCallback(async () => {
    if (!signedIn || leaving.current) return;
    const currentProbe = ++probe.current;
    setMode('checking');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const on = await Promise.race([
        (async () => (await isLockEnabled()) && (await isLockAvailable()))(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Lock check timed out')),
            LOCK_CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      if (mounted.current && probe.current === currentProbe && !leaving.current) {
        setMode(on ? 'armed' : 'disabled');
      }
    } catch {
      // Unavailable hardware is an explicit false. An unreadable preference is
      // unknown: keep customer content covered and offer retry/sign-out.
      if (mounted.current && probe.current === currentProbe && !leaving.current) setMode('error');
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }, [signedIn]);

  useEffect(() => {
    mounted.current = true;
    void refreshArmed();
    return () => {
      mounted.current = false;
      probe.current += 1;
      attempt.current += 1;
    };
  }, [refreshArmed]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      const previous = appState.current;
      appState.current = next;
      setActive(next === 'active');
      if (next === 'active') {
        dispatch({ type: 'foregrounded', at: Date.now() });
        // A biometric sheet itself can briefly make iOS inactive.
        if (!authenticating.current) void refreshArmed();
      } else if (previous === 'active') {
        dispatch({ type: 'backgrounded', at: Date.now() });
      }
      if (next === 'background' && authenticating.current) {
        attempt.current += 1;
        authenticating.current = false;
        dispatch({ type: 'authFailed' });
      }
    });
    return () => sub.remove();
  }, [refreshArmed]);

  const unlock = useCallback(async () => {
    if (
      !mounted.current ||
      authenticating.current ||
      leaving.current ||
      appState.current !== 'active'
    )
      return;
    authenticating.current = true;
    const currentAttempt = ++attempt.current;
    dispatch({ type: 'authStarted' });
    let success = false;
    try {
      success = await authenticate();
    } catch {
      /* Retry stays available. */
    }
    if (!mounted.current || attempt.current !== currentAttempt || leaving.current) return;
    authenticating.current = false;
    dispatch(success ? { type: 'authSucceeded' } : { type: 'authFailed' });
    if (success && appState.current !== 'active')
      dispatch({ type: 'backgrounded', at: Date.now() });
  }, []);

  // One automatic prompt per lock; after a failure the Unlock button retries,
  // rather than the OS sheet re-opening itself in a loop.
  const prompted = useRef(false);
  useEffect(() => {
    if (state.status === 'unlocked') prompted.current = false;
    if (
      mode === 'armed' &&
      active &&
      state.status === 'locked' &&
      !prompted.current &&
      !signingOut
    ) {
      prompted.current = true;
      void unlock();
    }
  }, [mode, active, signingOut, state.status, unlock]);

  // Same shared flow as MenuScreen: retire push while Clerk can still mint a
  // token, then clear tenant cache and land on welcome.
  async function onSignOut() {
    if (leaving.current) return;
    leaving.current = true;
    attempt.current += 1;
    probe.current += 1;
    setSigningOut(true);
    setSignOutError(false);
    let startedClerkSignOut = false;
    try {
      await signOutWithCleanup({
        unregisterPush: () => unregisterPushToken(getToken),
        clerkSignOut: async () => {
          if (mounted.current) {
            startedClerkSignOut = true;
            await signOut();
          }
        },
        // Clerk can unmount this session gate immediately on success; account
        // cleanup must still finish after that transition. A stale attempt
        // which never reached Clerk must not clear a new account's drafts.
        clearLocalState: async () => {
          if (startedClerkSignOut) await clearAccountScopedState();
        },
        navigateToWelcome: () => {
          if (mounted.current) router.replace('/welcome');
        },
      });
    } catch {
      if (mounted.current) setSignOutError(true);
    } finally {
      if (mounted.current) {
        leaving.current = false;
        authenticating.current = false;
        setSigningOut(false);
        dispatch({ type: 'coldStart' });
      }
    }
  }

  const mayOpen =
    signedOut ||
    (signedIn &&
      active &&
      !signingOut &&
      !signOutError &&
      (mode === 'disabled' || (mode === 'armed' && state.status === 'unlocked')));
  if (mayOpen) opened.current = true;
  const covered = !mayOpen;

  return (
    <>
      {signedOut || opened.current ? (
        <View
          style={styles.screen}
          pointerEvents={covered ? 'none' : 'auto'}
          accessibilityElementsHidden={covered}
          importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
        >
          {children}
        </View>
      ) : null}
      {covered ? (
        <View
          accessibilityViewIsModal
          style={[
            StyleSheet.absoluteFillObject,
            styles.screen,
            { backgroundColor: colors.inkDeep },
          ]}
        >
          <ScrollView
            style={styles.screen}
            contentContainerStyle={[
              styles.content,
              { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
            ]}
          >
            <View style={styles.logoRow}>
              <BrandMark height={34} body={colors.logoBody} notch={colors.logoNotch} />
              <Text style={[styles.wordmark, { color: colors.logoBody }]}>QUOTEMAX</Text>
            </View>

            <View style={styles.centre}>
              <FaceIdIcon color={colors.textSec} size={40} />
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={1.4}
                style={[styles.lockedLabel, { color: colors.textPri }]}
              >
                {mode === 'checking'
                  ? 'CHECKING APP LOCK'
                  : mode === 'error'
                    ? 'APP LOCK UNAVAILABLE'
                    : 'UNLOCK QUOTEMAX'}
              </Text>
              <Text style={[styles.body, { color: colors.textSec }]}>
                {mode === 'checking'
                  ? 'Checking your saved privacy setting before opening your quotes.'
                  : mode === 'error'
                    ? 'Your privacy setting could not be checked. Try again or sign out.'
                    : 'Unlock with Face ID, fingerprint or your device passcode to get back to your quotes.'}
              </Text>
              {signOutError ? (
                <Text accessibilityRole="alert" style={[styles.body, { color: colors.textSec }]}>
                  Sign out could not be confirmed. Your quotes remain covered. Try signing out
                  again.
                </Text>
              ) : null}
            </View>

            <PrimaryCta
              label={mode === 'checking' ? 'Checking' : mode === 'error' ? 'Try again' : 'Unlock'}
              onPress={() => {
                if (mode === 'error') void refreshArmed();
                else void unlock();
              }}
              disabled={!active || !signedIn || signingOut}
              loading={mode === 'checking' || state.status === 'authenticating'}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              disabled={signingOut}
              onPress={() => void onSignOut()}
              style={({ pressed }) => [
                styles.signOut,
                { opacity: signingOut || pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.signOutLabel, { color: colors.textDim }]}>
                {signingOut ? 'SIGNING OUT…' : 'NOT YOU? SIGN OUT'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: AUTH_GUTTER },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'flex-start',
  },
  wordmark: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  centre: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.section,
  },
  lockedLabel: {
    ...type.headline,
  },
  body: {
    ...type.body,
  },
  signOut: {
    marginTop: spacing.md,
    minHeight: touch.minimum,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: {
    ...type.bodySm,
    fontFamily: fonts.sans.semiBold,
    textAlign: 'center',
  },
});
