/**
 * The push-notification banner (kit `pushOpen` block): a glass card that drops
 * over the top of home when the bell fires it. Text colours are the kit's
 * hardcoded dark values — like a real iOS notification it stays dark-styled
 * in light theme.
 * ponytail: kit uses backdrop-filter blur(18px); the fill is 94% opaque so the
 * blur is skipped rather than adding expo-blur for a demo banner.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { CloseIcon } from '@/features/home/icons';
import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const DROP_EASE = Easing.bezier(0.22, 1, 0.36, 1);

export function PushBanner({ onDismiss }: { onDismiss: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // qmDrop: translateY -120% → 0 with fade, 0.4s.
  const drop = useSharedValue(0);
  useEffect(() => {
    drop.value = withTiming(1, { duration: 400, easing: DROP_EASE });
  }, [drop]);
  const dropStyle = useAnimatedStyle(() => ({
    opacity: drop.value,
    transform: [{ translateY: (drop.value - 1) * 160 }],
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        { top: insets.top + 8, borderColor: colors.inkLine },
        dropStyle,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.appTile, { backgroundColor: colors.accent }]}>
          <BrandMark height={17} body="#16120F" notch="#2B2422" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Text style={styles.appName}>QuoteMax</Text>
            <Text style={styles.timestamp}>NOW</Text>
          </View>
          <Text style={styles.line1}>Quote drafted · Priya Naidu paid the $99 site visit</Text>
          <Text style={styles.line2}>
            Full reroof — Colorbond · <Text style={styles.amount}>$73,522</Text> ready to release
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        {/* Navigates to the quote-review screen once that screen is built. */}
        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          style={[styles.reviewBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.btnLabel, { color: colors.accentInk }]}>REVIEW</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.releaseBtn}>
          <Text style={[styles.btnLabel, { color: '#F6F1EA' }]}>RELEASE</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          style={styles.closeBtn}
        >
          <CloseIcon color="#C3B8AC" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 50,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(43,36,34,0.94)',
    boxShadow: '0 24px 60px -12px rgba(11,9,7,0.7)',
    padding: 14,
  },
  topRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  appTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  appName: { fontFamily: fonts.sans.bold, fontSize: 12.5, color: '#F6F1EA' },
  timestamp: {
    fontFamily: fonts.mono.medium,
    fontSize: 9,
    letterSpacing: 0.9, // .1em @ 9
    color: '#A2968A',
  },
  line1: {
    marginTop: 5,
    fontFamily: fonts.sans.semiBold,
    fontSize: 13,
    lineHeight: 18, // 1.35
    color: '#F6F1EA',
  },
  line2: {
    marginTop: 3,
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 16, // 1.35
    color: '#C3B8AC',
  },
  amount: {
    fontFamily: fonts.mono.bold,
    color: '#F6F1EA',
  },
  buttons: { marginTop: 12, flexDirection: 'row', gap: 8 },
  reviewBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#3A322C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#3A322C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.66, // .06em @ 11
  },
});
