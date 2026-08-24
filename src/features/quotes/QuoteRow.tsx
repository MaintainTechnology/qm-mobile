/**
 * One row in the Quotes tab list (spec D1): customer, job + suburb, channel · age, amount and a
 * single status chip. Visual language lifted from the home dashboard's own quote row
 * (`src/features/home/HomeScreen.tsx` `RECENT_QUOTES` block) so the two lists read as one design.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { centsFromApiDollars, formatAud } from '@/lib/money';
import type { QuoteRow as QuoteRowData } from '@/lib/tenant';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { customerLabel, formatJobType, quoteAge, quoteBadge, type QuoteTone } from './status';

export function QuoteRow({ quote, onPress }: { quote: QuoteRowData; onPress: () => void }) {
  const { colors } = useTheme();
  const badge = quoteBadge(quote);
  const toneColor: Record<QuoteTone, string> = {
    ok: colors.successBright,
    warn: colors.warningBright,
    dim: colors.textDim,
  };
  const tone = toneColor[badge.tone];
  const amount =
    quote.total_inc_gst == null ? '—' : formatAud(centsFromApiDollars(quote.total_inc_gst));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${customerLabel(quote)}, ${badge.label}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.inkLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
        },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.name, { color: colors.textPri }]} numberOfLines={1}>
          {customerLabel(quote)}
        </Text>
        <Text
          style={[styles.job, { color: colors.textSec }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formatJobType(quote.job_type)}
          {quote.suburb ? ` · ${quote.suburb}` : ''}
        </Text>
        <Text style={[styles.meta, { color: colors.textDim }]}>
          {quote.channel ? `${quote.channel === 'voice' ? 'Voice' : 'SMS'} · ` : ''}
          {quoteAge(quote.created_at)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.textPri }]}>{amount}</Text>
        {quote.total_inc_gst != null ? (
          <Text style={[styles.amountMeta, { color: colors.textDim }]}>inc GST</Text>
        ) : null}
        <View style={[styles.chip, { borderColor: tone }]}>
          <View style={[styles.chipDot, { backgroundColor: tone }]} />
          <Text style={[styles.chipText, { color: tone }]} numberOfLines={1}>
            {badge.label.toUpperCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.listRow,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  name: { fontFamily: fonts.sans.bold, fontSize: 14.5, lineHeight: 18 },
  job: { marginTop: 3, fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 17 },
  meta: {
    marginTop: 4,
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  right: { alignItems: 'flex-end', gap: 7 },
  amount: { fontFamily: fonts.mono.bold, fontSize: 14.5, fontVariant: ['tabular-nums'] },
  amountMeta: { fontFamily: fonts.mono.medium, fontSize: 12, letterSpacing: 0.6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: 4,
    paddingHorizontal: 7,
    maxWidth: 160,
  },
  chipDot: { width: 4, height: 4, borderRadius: 2 },
  chipText: { fontFamily: fonts.mono.bold, fontSize: 12, letterSpacing: 0.4 },
});
