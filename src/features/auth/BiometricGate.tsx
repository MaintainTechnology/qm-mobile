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
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { FaceIdIcon, PrimaryCta } from '@/features/auth/ui';
import {
  authenticate,
  initialLockState,
  isLockAvailable,
  isLockEnabled,
  lockReducer,
} from '@/lib/lock';
import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export function BiometricGate() {
  const { isSignedIn, signOut } = useAuth();
  const queryClient = useQueryClient();
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

  // Same flow as MenuScreen's sign out: end the Clerk session, drop every
  // cached query so the next account never sees this tenant's data, land on welcome.
  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
    } finally {
      router.replace('/welcome');
    }
  }

  if (!armed || state.status === 'unlocked') return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        styles.screen,
        {
          backgroundColor: colors.inkDeep,
          paddingTop: insets.top + 26,
          paddingBottom: insets.bottom + 30,
        },
      ]}
    >
      <View style={styles.logoRow}>
        <BrandMark height={34} body={colors.logoBody} notch={colors.logoNotch} />
        <View>
          <Text style={[styles.wordmark, { color: colors.logoBody }]}>QUOTE</Text>
          <Text style={[styles.wordmark, { color: colors.logoBody }]}>MAX</Text>
        </View>
      </View>

      <View style={styles.centre}>
        <FaceIdIcon color={colors.accentText} size={44} />
        <Text style={[styles.lockedLabel, { color: colors.textDim }]}>LOCKED</Text>
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
        style={[styles.signOut, { opacity: signingOut ? 0.6 : 1 }]}
      >
        <Text style={[styles.signOutLabel, { color: colors.textDim }]}>
          {signingOut ? 'SIGNING OUT…' : 'NOT YOU? SIGN OUT'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 26 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    alignSelf: 'flex-start',
  },
  wordmark: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 21,
    lineHeight: 18, // kit .82 leading; caps-only so no descender clipping
    letterSpacing: -0.42, // -.02em @ 21
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 12,
  },
  lockedLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 1.6, // .16em @ 10
  },
  body: {
    fontFamily: fonts.sans.regular,
    fontSize: 15.5,
    lineHeight: 24,
    textAlign: 'center',
  },
  signOut: {
    marginTop: 18,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
});
