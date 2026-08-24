/**
 * Auth-screen primitives, lifted value-for-value from the design kit
 * (design-system/design-kit, screens `welcome` / `signin` / `onboard`).
 *
 * Sizes here intentionally follow the kit rather than the generic component
 * specs in DESIGN.md — auth CTAs are 58px, inputs 52–54px, radius 8 — because
 * the kit is the pixel authority for these three screens. Letter-spacing is
 * the kit's em value multiplied out to dp at each font size.
 */
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** Screen gutter on all three auth screens. */
export const AUTH_GUTTER = 26;

/** Required-field asterisk — a fixed kit colour, deliberately not a theme token. */
const REQUIRED_PINK = '#F43F5E';

// ── Icons (kit inline SVGs, 24×24 viewBox) ─────────────────────────────────

export function ArrowRightIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 5l7 7-7 7" stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m14 6-6 6 6 6" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EyeIcon({ color, size = 17 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
        stroke={color}
        strokeWidth={1.75}
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

export function FaceIdIcon({ color, size = 17 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 10v1M15 10v1M9.5 15a3.5 3.5 0 0 0 5 0"
        stroke={color}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────

/** 58px accent CTA with the trailing arrow. One per screen. */
export function PrimaryCta({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryCta,
        { backgroundColor: pressed ? colors.accentPress : colors.accent },
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.accentInk} />
      ) : (
        <>
          <Text style={[styles.primaryCtaLabel, { color: colors.accentInk }]}>{label}</Text>
          <ArrowRightIcon color={colors.accentInk} />
        </>
      )}
    </Pressable>
  );
}

/** Hairline-bordered secondary button (welcome 52px, sign-in Face ID 58px). */
export function GhostButton({
  label,
  onPress,
  height = 52,
  icon,
}: {
  label: string;
  onPress: () => void;
  height?: number;
  icon?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghost,
        { height, borderColor: pressed ? colors.accent : colors.inkLine },
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.ghostLabel, { color: colors.textPri }]}>{label}</Text>
    </Pressable>
  );
}

/** 38×38 bordered back chevron used in the sign-in and onboarding headers. */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.back,
        { borderColor: pressed ? colors.accent : colors.inkLine },
      ]}
    >
      <ChevronLeftIcon color={colors.textSec} />
    </Pressable>
  );
}

/** The 52px hairline-bottomed header bar on sign-in and onboarding. */
export function AuthHeader({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>{children}</View>;
}

/** The "or" divider on sign-in. */
export function OrDivider() {
  const { colors } = useTheme();
  return (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: colors.inkLine }]} />
      <Text style={[styles.dividerLabel, { color: colors.textDim }]}>OR</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.inkLine }]} />
    </View>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────

export type FieldProps = {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  required?: boolean;
  /** Right-aligned mono hint in the label row, e.g. "Min 8 characters". */
  hint?: string;
  /** 52 on sign-in, 54 on onboarding — both exact kit values. */
  height?: 52 | 54;
  /** Secure entry with either the sign-in eye icon or the sign-up "Show" text toggle. */
  secure?: 'eye' | 'show';
  /** Right-aligned mono suffix inside the field, e.g. "/ hr", "AU". */
  suffix?: string;
  /** Non-editable leading adornment, e.g. "$" on money fields. */
  prefix?: string;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: 'email' | 'password' | 'new-password' | 'name' | 'tel' | 'off';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  /** Error line below the field (DESIGN.md pattern; the kit ships no error state). */
  error?: string | null;
};

export function Field({
  label,
  value,
  onChangeText,
  required = false,
  hint,
  height = 52,
  secure,
  suffix,
  prefix,
  keyboardType,
  autoComplete,
  autoCapitalize = 'none',
  error,
}: FieldProps) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hideText = secure !== undefined && !revealed;

  // The kit's exact focus treatment: accent border + 2px soft-yellow ring.
  // On paper the ring falls back to ink at the same alpha (accentSoft rule).
  const ring = isDark ? 'rgba(255,210,61,0.35)' : 'rgba(43,36,34,0.35)';
  const borderColor = error ? colors.dangerBright : focused ? colors.accent : colors.inkLine;

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textPri }]}>
          {label.toUpperCase()}
          {required ? <Text style={{ color: REQUIRED_PINK }}> *</Text> : null}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: colors.textDim }]}>{hint.toUpperCase()}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.inputBox,
          {
            height,
            backgroundColor: colors.ink,
            borderColor,
            boxShadow: focused ? `0 0 0 2px ${ring}` : undefined,
          },
        ]}
      >
        {prefix ? (
          <Text style={[styles.inputText, { color: colors.textDim, marginRight: 6 }]}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hideText}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[
            styles.inputText,
            { flex: 1, color: colors.textPri },
            // Masked entry renders in the kit's wide-tracked mono dots.
            hideText && value.length > 0 && styles.maskedText,
          ]}
        />
        {secure === 'eye' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed(v => !v)}
            hitSlop={10}
          >
            <EyeIcon color={revealed ? colors.accentText : colors.textDim} />
          </Pressable>
        ) : null}
        {secure === 'show' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed(v => !v)}
            hitSlop={10}
          >
            <Text style={[styles.suffix, { color: colors.textDim }]}>
              {revealed ? 'HIDE' : 'SHOW'}
            </Text>
          </Pressable>
        ) : null}
        {suffix ? <Text style={[styles.suffix, { color: colors.textDim }]}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.dangerBright }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryCta: {
    height: 58,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryCtaLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    letterSpacing: 0.84, // .06em @ 14
    textTransform: 'uppercase',
  },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
  ghost: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  ghostLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 13,
    letterSpacing: 0.78, // .06em @ 13
    textTransform: 'uppercase',
  },
  back: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  divider: {
    marginVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 9.5,
    letterSpacing: 1.52, // .16em @ 9.5
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.47, // .14em @ 10.5
  },
  hint: {
    fontFamily: fonts.mono.regular,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  inputText: {
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    paddingVertical: 0,
  },
  maskedText: {
    fontFamily: fonts.mono.regular,
    fontSize: 18,
    letterSpacing: 3.6, // .2em @ 18
  },
  suffix: {
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    letterSpacing: 1, // .1em @ 10
    textTransform: 'uppercase',
  },
  errorText: {
    marginTop: 6,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
