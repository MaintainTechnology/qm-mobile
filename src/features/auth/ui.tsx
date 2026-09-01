/**
 * Shared form controls used by auth, settings and trade workflows.
 * DESIGN.md owns the colour, typography, corner and touch-size tokens.
 * Minimum heights let controls grow with the system text size.
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
  type TextInputProps,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useReducedMotion } from 'react-native-reanimated';

import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** Screen gutter on all three auth screens. */
export const AUTH_GUTTER = spacing.xl;

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

/** The primary action, with a 56dp floor. One per screen. */
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
  const reduceMotion = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryCta,
        { backgroundColor: pressed ? colors.accentPress : colors.accent },
        pressed && !reduceMotion && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.accentInk} /> : null}
      <Text style={[styles.primaryCtaLabel, { color: colors.accentInk }]}>{label}</Text>
      {!loading ? <ArrowRightIcon color={colors.accentInk} /> : null}
    </Pressable>
  );
}

/** A secondary action with the same states and touch floor as other controls. */
export function GhostButton({
  label,
  onPress,
  height = touch.minimum,
  icon,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  height?: number;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.ghost,
        {
          minHeight: Math.max(height, touch.minimum),
          borderColor: pressed ? colors.accentSoft : colors.ctlLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
        },
        pressed && !reduceMotion && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.textPri} /> : icon}
      <Text style={[styles.ghostLabel, { color: colors.textPri }]}>{label}</Text>
    </Pressable>
  );
}

/** A full 48dp back target, rather than a small icon relying on hit slop. */
export function BackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={({ pressed }) => [
        styles.back,
        {
          borderColor: pressed ? colors.accentSoft : colors.inkLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
        },
      ]}
    >
      <ChevronLeftIcon color={colors.textSec} />
    </Pressable>
  );
}

/** A shared header with room for the back target and larger system text. */
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
  autoComplete?: TextInputProps['autoComplete'];
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
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hideText = secure !== undefined && !revealed;

  const borderColor = error ? colors.dangerBright : focused ? colors.accentSoft : colors.ctlLine;

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textPri }]}>
          {label.toUpperCase()}
          {required ? <Text style={{ color: colors.dangerBright }}> *</Text> : null}
        </Text>
        {hint ? <Text style={[styles.hint, { color: colors.textDim }]}>{hint}</Text> : null}
      </View>
      <View
        style={[
          styles.inputBox,
          {
            minHeight: height,
            backgroundColor: colors.ink,
            borderColor,
            boxShadow: focused ? `0 0 0 2px ${colors.accentSoft}` : undefined,
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
          accessibilityHint={error ?? hint}
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
            { flex: 1, minWidth: 0, color: colors.textPri },
            prefix ? styles.moneyText : null,
            // Masked entry renders in the kit's wide-tracked mono dots.
            hideText && value.length > 0 && styles.maskedText,
          ]}
        />
        {secure === 'eye' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed(v => !v)}
            style={styles.revealButton}
          >
            <EyeIcon color={revealed ? colors.accentText : colors.textDim} />
          </Pressable>
        ) : null}
        {secure === 'show' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed(v => !v)}
            style={styles.revealButton}
          >
            <Text style={[styles.suffix, { color: colors.textDim }]}>
              {revealed ? 'HIDE' : 'SHOW'}
            </Text>
          </Pressable>
        ) : null}
        {suffix ? <Text style={[styles.suffix, { color: colors.textDim }]}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.errorText, { color: colors.dangerBright }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryCta: {
    minHeight: touch.primaryCta,
    borderRadius: radius.control,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryCtaLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    textAlign: 'center',
    letterSpacing: 0.84, // .06em @ 14
    textTransform: 'uppercase',
  },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
  ghost: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ghostLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    textAlign: 'center',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  back: {
    width: touch.minimum,
    height: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  divider: {
    marginVertical: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
  },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    rowGap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    ...type.label,
    letterSpacing: 1,
    flexShrink: 1,
  },
  hint: {
    ...type.bodySm,
    flexShrink: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  inputText: {
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  moneyText: { fontFamily: fonts.mono.regular, fontVariant: ['tabular-nums'] },
  revealButton: {
    minWidth: touch.minimum,
    minHeight: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.md,
    marginLeft: spacing.xs,
  },
  maskedText: {
    fontFamily: fonts.mono.regular,
    fontSize: 18,
    letterSpacing: 3.6, // .2em @ 18
  },
  suffix: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  errorText: {
    marginTop: 6,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
