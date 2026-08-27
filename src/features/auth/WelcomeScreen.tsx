/**
 * `welcome` — the boot/marketing screen (design kit screen 1).
 *
 * Bottom-anchored pitch over the brand lockup, with the kit's qmHeart logo
 * heartbeat and qmBreathe wordmark pulse, and the soft accent radial glow
 * behind the headline.
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BrandMark } from '@/components/BrandMark';
import { FaceIdIcon, GhostButton, PrimaryCta } from '@/features/auth/ui';
import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const ease = Easing.inOut(Easing.ease);

export function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // qmHeart: scale 1 → 1.07 (10%) → 1 (20%) → 1.05 (30%) → 1 (40%), rest to 2.6s.
  const heart = useSharedValue(1);
  // qmBreathe: opacity .35 → 1 → .35 over 2.6s.
  const breathe = useSharedValue(0.35);

  useEffect(() => {
    heart.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 260, easing: ease }),
        withTiming(1, { duration: 260, easing: ease }),
        withTiming(1.05, { duration: 260, easing: ease }),
        withTiming(1, { duration: 260, easing: ease }),
        withTiming(1, { duration: 1560 }),
      ),
      -1,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1300, easing: ease }),
        withTiming(0.35, { duration: 1300, easing: ease }),
      ),
      -1,
    );
  }, [heart, breathe]);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));
  const breatheStyle = useAnimatedStyle(() => ({ opacity: breathe.value }));

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.inkDeep,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 30,
        },
      ]}
    >
      {/* Accent radial glow behind the headline (kit: rgba(255,196,0,.10) at 50%). */}
      <Svg style={styles.glow} pointerEvents="none">
        <Defs>
          <RadialGradient id="welcomeGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#FFC400" stopOpacity={0.1} />
            <Stop offset="70%" stopColor="#FFC400" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#welcomeGlow)" opacity={0.5} />
      </Svg>

      <Animated.View style={[styles.logoRow, heartStyle]}>
        <BrandMark height={34} body={colors.logoBody} notch={colors.logoNotch} />
        <Animated.View style={breatheStyle}>
          <Text style={[styles.wordmark, { color: colors.logoBody }]}>QUOTE</Text>
          <Text style={[styles.wordmark, { color: colors.logoBody }]}>MAX</Text>
        </Animated.View>
      </Animated.View>

      <View style={{ flex: 1 }} />

      <View style={[styles.badge, { borderColor: colors.inkLine }]}>
        <View style={[styles.badgeDot, { backgroundColor: colors.successBright }]} />
        <Text style={[styles.badgeText, { color: colors.textSec }]}>
          BUILT FOR AUSTRALIAN TRADIES
        </Text>
      </View>

      <Text style={[styles.h1, { color: colors.textPri }]}>
        NEVER QUOTE ON A{' '}
        <Text
          style={{
            color: colors.accentText,
            textDecorationLine: 'underline',
            textDecorationColor: colors.accentUnder,
          }}
        >
          SUNDAY NIGHT
        </Text>{' '}
        AGAIN.
      </Text>

      <Text style={[styles.body, { color: colors.textSec }]}>
        Your AI receptionist answers the call, asks the right questions and drafts the quote off
        your own pricing book. You review it in the ute and send.
      </Text>

      <View style={styles.buttons}>
        <PrimaryCta label="Get my QuoteMax" onPress={() => router.push('/sign-up')} />
        <GhostButton
          label="I already have an account"
          onPress={() => router.push('/sign-in')}
          height={52}
        />
      </View>

      {/* The real Face ID unlock shipped as BiometricGate (features/auth/BiometricGate.tsx),
          opted into under Account → Security — it overlays signed-in sessions, so it never
          reaches this signed-out screen. This row stays display-only, per the kit layout. */}
      <View style={styles.faceIdRow}>
        <FaceIdIcon color={colors.accentText} size={17} />
        <Text style={[styles.faceIdText, { color: colors.textDim }]}>
          FACE ID ENABLED · TAP TO UNLOCK
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 26 },
  glow: {
    position: 'absolute',
    left: -120,
    right: -120,
    top: 120,
    height: 340,
  },
  logoRow: {
    paddingTop: 26,
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
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 1.6, // .16em @ 10
  },
  h1: {
    marginTop: 20,
    fontFamily: fonts.sans.extraBold,
    fontSize: 40,
    lineHeight: 42, // kit .93 clips in RN; DESIGN.md floors display leading at 1.05
    letterSpacing: -1.6, // -.04em @ 40
  },
  body: {
    marginTop: 16,
    fontFamily: fonts.sans.regular,
    fontSize: 15.5,
    lineHeight: 24, // 1.55
  },
  buttons: { marginTop: 26, gap: 11 },
  faceIdRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: 6,
  },
  faceIdText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 1.6, // .16em @ 10
  },
});
