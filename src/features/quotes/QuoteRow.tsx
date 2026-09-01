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
    quote.total_inc_gst == null ? null : formatAud(centsFromApiDollars(quote.total_inc_gst));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${customerLabel(quote)}, ${badge.label}${amount ? `, ${amount}` : ''}`}
      accessibilityHint="Opens the quote for review"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.inkLine,
          backgroundColor: pressed ? colors.ink : colors.inkCard,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: colors.textPri }]} numberOfLines={1}>
          {customerLabel(quote)}
        </Text>
        <View style={styles.right}>
          {amount ? (
            <>
              <Text style={[styles.amount, { color: colors.textPri }]}>{amount}</Text>
              <Text style={[styles.amountMeta, { color: colors.textDim }]}>inc GST</Text>
            </>
          ) : (
            <Text style={[styles.amountMeta, { color: colors.textDim }]}>Price pending</Text>
          )}
        </View>
      </View>
      <Text style={[styles.job, { color: colors.textSec }]} numberOfLines={2} ellipsizeMode="tail">
        {formatJobType(quote.job_type)}
        {quote.suburb ? ` · ${quote.suburb}` : ''}
      </Text>
      <View style={styles.bottomRow}>
        <View style={[styles.chip, { borderColor: tone }]}>
          <Text style={[styles.chipText, { color: tone }]}>{badge.label}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textDim }]}>
          {quote.channel ? `${quote.channel === 'voice' ? 'Voice' : 'SMS'} · ` : ''}
          {quoteAge(quote.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    minHeight: touch.listRow,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.sm },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  name: { flex: 1, minWidth: 120, fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 24 },
  job: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  meta: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  right: { alignItems: 'flex-end', gap: spacing.xs, marginLeft: 'auto', maxWidth: '100%' },
  amount: {
    fontFamily: fonts.mono.bold,
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  amountMeta: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    maxWidth: '100%',
  },
  chipText: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 16, flexShrink: 1 },
});
