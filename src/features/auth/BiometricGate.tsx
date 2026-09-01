/**
 * Full-screen privacy overlay above the router Stack — deliberately NOT a
 * route, so deep links resolve underneath and land correctly once unlocked.
 *
 * Armed only when the tradie is signed in, has opted in (Account → Security)
 * and the device can actually authenticate; anything less fails open, because
 * the Clerk session is the real security boundary (src/lib/lock.ts). The
 * escape hatch is the same sign-out flow MenuScreen runs, for a tradie whose
 * face/finger suddenly won't scan and who needs to hand the phone back.
 */
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
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

export function BiometricGate() {
  const { isSignedIn, signOut, getToken } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [state, dispatch] = useReducer(lockReducer, initialLockState);
  const [armed, setArmed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Re-checked on every foreground so an Account → Security toggle (or a
  // deleted enrolment) takes effect without a relaunch.
  const refreshArmed = useCallback(async () => {
    const on = isSignedIn === true && (await isLockEnabled()) && (await isLockAvailable());
    setArmed(on);
  }, [isSignedIn]);

  useEffect(() => {
    void refreshArmed();
  }, [refreshArmed]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        dispatch({ type: 'foregrounded', at: Date.now() });
        void refreshArmed();
      } else if (next === 'background') {
        dispatch({ type: 'backgrounded', at: Date.now() });
      }
    });
    return () => sub.remove();
  }, [refreshArmed]);

  const unlock = useCallback(async () => {
    dispatch({ type: 'authStarted' });
    dispatch((await authenticate()) ? { type: 'authSucceeded' } : { type: 'authFailed' });
  }, []);

  // One automatic prompt per lock; after a failure the Unlock button retries,
  // rather than the OS sheet re-opening itself in a loop.
  const prompted = useRef(false);
  useEffect(() => {
    if (state.status === 'unlocked') prompted.current = false;
    if (armed && state.status === 'locked' && !prompted.current) {
      prompted.current = true;
      void unlock();
    }
  }, [armed, state.status, unlock]);

  // Same shared flow as MenuScreen: retire push while Clerk can still mint a
  // token, then clear tenant cache and land on welcome.
  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOutWithCleanup({
      unregisterPush: () => unregisterPushToken(getToken),
      clerkSignOut: signOut,
      clearLocalState: clearAccountScopedState,
      navigateToWelcome: () => router.replace('/welcome'),
    });
  }

  if (!armed || state.status === 'unlocked') return null;

  return (
    <View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFillObject, styles.screen, { backgroundColor: colors.inkDeep }]}
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
            UNLOCK QUOTEMAX
          </Text>
          <Text style={[styles.body, { color: colors.textSec }]}>
            Unlock with Face ID or fingerprint to get back to your quotes.
          </Text>
        </View>

        <PrimaryCta
          label="Unlock"
          onPress={() => void unlock()}
          loading={state.status === 'authenticating'}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={signingOut}
          onPress={() => void onSignOut()}
          style={({ pressed }) => [styles.signOut, { opacity: signingOut || pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.signOutLabel, { color: colors.textDim }]}>
            {signingOut ? 'SIGNING OUT…' : 'NOT YOU? SIGN OUT'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
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
