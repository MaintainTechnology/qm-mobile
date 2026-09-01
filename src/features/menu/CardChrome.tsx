/**
 * Shared card chrome for the Menu tab (spec web-parity G1–G2) — a bordered `inkCard` box with a
 * mono title, used plainly for the read-only account card and extended with a Save footer
 * (`RateCard`) for the three pricing editors, which all share the same load → edit → save shape.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export function CardBox({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPri }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function CardHint({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.hint, { color: colors.textSec }]}>{children}</Text>;
}

/** An inline error line + retry tap — for a card whose GET failed outright (poor signal). */
export function RetryLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[styles.error, { color: colors.dangerBright }]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryBtn,
          { borderColor: colors.ctlLine, backgroundColor: pressed ? colors.ink : 'transparent' },
        ]}
      >
        <Text style={[styles.retry, { color: colors.accentText }]}>RETRY</Text>
      </Pressable>
    </View>
  );
}

export function RateCard({
  title,
  hint,
  children,
  onSave,
  saving,
  error,
  saved,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  saved: boolean;
}) {
  const { colors } = useTheme();
  return (
    <CardBox title={title}>
      {hint ? <CardHint>{hint}</CardHint> : null}
      <View style={{ marginTop: spacing.xxl, gap: spacing.xl }}>{children}</View>
      {error ? (
        <Text style={[styles.error, { color: colors.dangerBright }]}>{error}</Text>
      ) : saved && !saving ? (
        <Text style={[styles.ok, { color: colors.successBright }]}>Saved.</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Save ${title.toLowerCase()}`}
        accessibilityState={{ disabled: saving, busy: saving }}
        disabled={saving}
        onPress={onSave}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            borderColor: colors.ctlLine,
            backgroundColor: pressed ? colors.ink : 'transparent',
            opacity: saving ? 0.6 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={colors.textPri} />
        ) : (
          <Text style={[styles.saveLabel, { color: colors.textPri }]}>SAVE {title}</Text>
        )}
      </Pressable>
    </CardBox>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
  },
  title: { fontFamily: fonts.sans.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 },
  hint: { marginTop: spacing.sm, fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  error: { marginTop: spacing.lg, fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  ok: { marginTop: spacing.lg, fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.sm,
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
  },
  retry: { fontFamily: fonts.sans.bold, fontSize: 14, letterSpacing: 0.5 },
  saveBtn: {
    marginTop: spacing.xxl,
    minHeight: touch.minimum,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
