/**
 * Small pieces shared by the trade tools (roofing measure + job quoter, spec
 * web-parity F1–F3), using the same design tokens as the shared form controls.
 */
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** The one server-error → copy mapper — re-exported so trade screens keep importing
 *  it from here alongside Card/Notice/PillGroup rather than reaching into `@/lib/api`. */
export { apiErrorMessage } from '@/lib/api';

/** A quiet surface separated by the design system's warm hairline. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }, style]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.sectionLabel, { color: colors.textPri }]}>
      {children}
    </Text>
  );
}

/** One radio-style pill — for single-select option rows (state, material, pitch...). */
export function PillOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected || pressed ? colors.inkCard : colors.ink,
          borderColor: selected ? colors.accentSoft : colors.ctlLine,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[styles.pillLabel, { color: selected ? colors.textPri : colors.textSec }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A row of PillOptions bound to a single value — `options` are `[value, label]` tuples,
 *  matching the web tool's option arrays so labels stay word-for-word identical. */
export function PillGroup({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [string, string])[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.pillRow}>
      {options.map(([v, label]) => (
        <PillOption key={v} label={label} selected={value === v} onPress={() => onChange(v)} />
      ))}
    </View>
  );
}

/** Loading / error(+retry) / info banner — every fetch surface needs one (poor-signal rule). */
export function Notice({
  tone,
  label,
  body,
  onRetry,
}: {
  tone: 'accent' | 'warn' | 'danger';
  label: string;
  body?: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const toneColor =
    tone === 'danger'
      ? colors.dangerBright
      : tone === 'warn'
        ? colors.warningBright
        : colors.textPri;
  return (
    <View
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
      style={[
        styles.notice,
        {
          borderColor: tone === 'accent' ? colors.inkLine : toneColor,
          backgroundColor: colors.ink,
        },
      ]}
    >
      <Text style={[styles.noticeLabel, { color: toneColor }]}>{label}</Text>
      {body ? <Text style={[styles.noticeBody, { color: colors.textSec }]}>{body}</Text> : null}
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.noticeRetry, { opacity: pressed ? 0.65 : 1 }]}
          hitSlop={8}
        >
          <Text style={[styles.noticeRetryLabel, { color: toneColor }]}>TRY AGAIN</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Multi-line notes box — Field (auth/ui) is single-line only. */
export function MultilineField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPri }]}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        selectionColor={colors.accentSoft}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        numberOfLines={4}
        style={[
          styles.textarea,
          {
            backgroundColor: colors.ink,
            borderColor: focused ? colors.accentSoft : colors.ctlLine,
            color: colors.textPri,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 0, borderWidth: 1, borderRadius: radius.card, padding: spacing.xl },
  sectionLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    minHeight: touch.minimum,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  notice: { borderWidth: 1, borderRadius: radius.control, padding: spacing.lg, gap: spacing.sm },
  noticeLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeBody: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  noticeRetry: {
    marginTop: 4,
    alignSelf: 'flex-start',
    minHeight: touch.minimum,
    minWidth: touch.minimum,
    paddingRight: spacing.lg,
    justifyContent: 'center',
  },
  noticeRetryLabel: { fontFamily: fonts.sans.bold, fontSize: 14, letterSpacing: 0.6 },
  fieldLabel: {
    marginBottom: 8,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.2,
  },
  textarea: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.lg,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});
