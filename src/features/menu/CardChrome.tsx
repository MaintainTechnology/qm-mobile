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
      <Text style={[styles.title, { color: colors.textDim }]}>{title}</Text>
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
        hitSlop={8}
        style={styles.retryBtn}
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
      <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>{children}</View>
      {error ? (
        <Text style={[styles.error, { color: colors.dangerBright }]}>{error}</Text>
      ) : saved && !saving ? (
        <Text style={[styles.ok, { color: colors.successBright }]}>Saved.</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Save ${title.toLowerCase()}`}
        disabled={saving}
        onPress={onSave}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: pressed ? colors.accentPress : colors.accent,
            opacity: saving ? 0.6 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={colors.accentInk} />
        ) : (
          <Text style={[styles.saveLabel, { color: colors.accentInk }]}>SAVE</Text>
        )}
      </Pressable>
    </CardBox>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  title: { fontFamily: fonts.sans.semiBold, fontSize: 10.5, letterSpacing: 1.05 },
  hint: { marginTop: 6, fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 19 },
  error: { marginTop: spacing.lg, fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 18 },
  ok: { marginTop: spacing.lg, fontFamily: fonts.sans.semiBold, fontSize: 13 },
  retryBtn: {
    marginTop: spacing.sm,
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  retry: { fontFamily: fonts.sans.bold, fontSize: 11, letterSpacing: 0.9 },
  saveBtn: {
    marginTop: spacing.lg,
    height: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { fontFamily: fonts.sans.bold, fontSize: 12.5, letterSpacing: 0.75 },
});
