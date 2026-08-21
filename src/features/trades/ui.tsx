/**
 * Small pieces shared by the trade tools (roofing measure + job quoter, spec
 * web-parity F1–F3). Not in `src/features/auth/ui.tsx` because that file is
 * scoped to the three auth screens (see its own header) — these are new,
 * general-purpose primitives for this feature only.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** The one server-error → copy mapper — re-exported so trade screens keep importing
 *  it from here alongside Card/Notice/PillGroup rather than reaching into `@/lib/api`. */
export { apiErrorMessage } from '@/lib/api';

/** Raised surface, same lift treatment as HomeScreen's cards. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const lift = isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : '0 1px 2px rgba(43,36,34,0.06)';
  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.inkLine, backgroundColor: colors.inkCard, boxShadow: lift },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.accentText }]}>{children}</Text>;
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
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? 'rgba(255,196,0,0.12)' : colors.ink,
          borderColor: selected ? colors.accent : colors.inkLine,
        },
      ]}
    >
      <Text style={[styles.pillLabel, { color: selected ? colors.accentText : colors.textSec }]}>
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
    <View style={styles.pillRow}>
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
    tone === 'danger' ? colors.dangerBright : tone === 'warn' ? colors.warningBright : colors.accentText;
  return (
    <View style={[styles.notice, { borderColor: toneColor, backgroundColor: colors.inkCard }]}>
      <Text style={[styles.noticeLabel, { color: toneColor }]}>{label}</Text>
      {body ? <Text style={[styles.noticeBody, { color: colors.textSec }]}>{body}</Text> : null}
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.noticeRetry} hitSlop={8}>
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
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPri }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        multiline
        numberOfLines={4}
        style={[
          styles.textarea,
          { backgroundColor: colors.ink, borderColor: colors.inkLine, color: colors.textPri },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16 },
  sectionLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: touch.minimum,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: { fontFamily: fonts.mono.bold, fontSize: 12, letterSpacing: 0.6 },
  notice: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  noticeLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  noticeBody: { fontFamily: fonts.sans.regular, fontSize: 13.5, lineHeight: 19 },
  noticeRetry: {
    marginTop: 4,
    alignSelf: 'flex-start',
    minHeight: touch.minimum,
    justifyContent: 'center',
  },
  noticeRetryLabel: { fontFamily: fonts.sans.bold, fontSize: 12, letterSpacing: 0.8 },
  fieldLabel: {
    marginBottom: 8,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  textarea: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
