/**
 * G2 — labour rates (hourly / call-out minimum / materials markup %) for electrical/plumbing
 * tenants. `PATCH /api/tenant/me` `pricing_by_trade` — bounds match `PricingFields` in
 * quotemate-automation/lib/tenant/update-schema.ts, the schema that actually validates this
 * write: hourly_rate positive, call_out_minimum ≥ 0, default_markup_pct 0–100. All three are
 * required per trade — each labour trade gets its own section below, seeded from its own
 * `pricing_books` row.
 *
 * A tenant can hold two labour trades (electrical + plumbing) on two independent `pricing_books`
 * rows. Save only PATCHes the trades whose fields the tradie actually edited, each with that
 * trade's own numbers — editing one trade's call-out minimum must never rewrite the other trade's
 * hourly rate.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Field } from '@/features/auth/ui';
import { apiErrorMessage } from '@/lib/api';
import { apiDollarsFromCents } from '@/lib/money';
import type { TenantMe } from '@/lib/tenant';
import { fonts, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { rateToInput, useSaveLabourRates } from './api';
import { RateCard } from './CardChrome';
import { parsePercent, parseRateCents } from './validation';

type TradeValues = { hourly: string; callOut: string; markup: string };

const BLANK: TradeValues = { hourly: '', callOut: '', markup: '' };

export const LABOUR_RATE_LABELS = {
  hourly: 'Hourly rate (ex GST)',
  callOut: 'Call-out minimum (ex GST)',
} as const;

function tradeLabel(trade: string): string {
  return trade.charAt(0).toUpperCase() + trade.slice(1);
}

/** Seeded once per trade, from that trade's own `pricing_books` row — never shared across trades. */
function seedValues(
  trades: string[],
  pricingBooks: TenantMe['pricing_books'],
): Record<string, TradeValues> {
  return Object.fromEntries(
    trades.map(t => {
      const row = pricingBooks?.find(r => r.trade === t) ?? null;
      const values: TradeValues = {
        hourly: rateToInput(row?.hourly_rate),
        callOut: rateToInput(row?.call_out_minimum),
        markup: rateToInput(row?.default_markup_pct),
      };
      return [t, values] as const;
    }),
  );
}

export function LabourRatesCard({
  trades,
  pricingBooks,
}: {
  trades: string[];
  pricingBooks: TenantMe['pricing_books'];
}) {
  const { colors } = useTheme();

  // A later refetch (e.g. after a save) must not clobber whatever the tradie is mid-typing
  // elsewhere, so this seeds once from the first render rather than tracking pricingBooks.
  const [seed] = useState(() => seedValues(trades, pricingBooks));
  const [values, setValues] = useState<Record<string, TradeValues>>(() => seed);
  const [fieldErrors, setFieldErrors] = useState<Record<string, Partial<TradeValues>>>({});
  // Only for the "nothing changed" shortcut below, which never calls the mutation — a real save's
  // success/failure is read straight off `save.data?.ok` so a false 2xx can't show "Saved.".
  const [noopSaved, setNoopSaved] = useState(false);
  const save = useSaveLabourRates();

  function setField(trade: string, key: keyof TradeValues, value: string) {
    setValues(prev => ({ ...prev, [trade]: { ...(prev[trade] ?? BLANK), [key]: value } }));
  }

  function onSave() {
    setNoopSaved(false);
    const nextErrors: Record<string, Partial<TradeValues>> = {};
    const patch: Record<
      string,
      { hourly_rate: number; call_out_minimum: number; default_markup_pct: number }
    > = {};
    let ok = true;

    for (const trade of trades) {
      const v = values[trade] ?? BLANK;
      const hourlyResult = parseRateCents(v.hourly, { positive: true });
      const callOutResult = parseRateCents(v.callOut, {});
      const markupResult = parsePercent(v.markup);
      const errors: Partial<TradeValues> = {};
      if (hourlyResult.error) errors.hourly = hourlyResult.error;
      if (callOutResult.error) errors.callOut = callOutResult.error;
      if (markupResult.error) errors.markup = markupResult.error;
      if (Object.keys(errors).length > 0) {
        nextErrors[trade] = errors;
        ok = false;
        continue;
      }
      if (hourlyResult.cents == null || callOutResult.cents == null || markupResult.value == null) {
        continue;
      }

      const s = seed[trade] ?? BLANK;
      const changed =
        v.hourly.trim() !== s.hourly.trim() ||
        v.callOut.trim() !== s.callOut.trim() ||
        v.markup.trim() !== s.markup.trim();
      if (!changed) continue;

      patch[trade] = {
        hourly_rate: apiDollarsFromCents(hourlyResult.cents),
        call_out_minimum: apiDollarsFromCents(callOutResult.cents),
        default_markup_pct: markupResult.value,
      };
    }

    setFieldErrors(nextErrors);
    if (!ok) return;
    if (Object.keys(patch).length === 0) {
      setNoopSaved(true);
      return;
    }
    save.mutate({ pricing_by_trade: patch });
  }

  return (
    <RateCard
      title="LABOUR RATES"
      hint={trades.length > 1 ? 'Each trade keeps its own rates.' : undefined}
      onSave={onSave}
      saving={save.isPending}
      error={
        save.isError
          ? apiErrorMessage(
              save.error,
              'Couldn’t reach QuoteMax — check your connection and try again.',
            )
          : save.data?.ok === false
            ? 'That didn’t save — try again.'
            : null
      }
      saved={noopSaved || save.data?.ok === true}
    >
      {trades.map(trade => {
        const v = values[trade] ?? BLANK;
        const errors = fieldErrors[trade] ?? {};
        return (
          <View key={trade} style={styles.section}>
            {trades.length > 1 ? (
              <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
                {tradeLabel(trade)}
              </Text>
            ) : null}
            <Field
              label={LABOUR_RATE_LABELS.hourly}
              value={v.hourly}
              onChangeText={t => setField(trade, 'hourly', t)}
              prefix="A$"
              suffix="/ hr"
              keyboardType="decimal-pad"
              error={errors.hourly}
            />
            <Field
              label={LABOUR_RATE_LABELS.callOut}
              value={v.callOut}
              onChangeText={t => setField(trade, 'callOut', t)}
              prefix="A$"
              keyboardType="decimal-pad"
              error={errors.callOut}
            />
            <Field
              label="Materials markup"
              value={v.markup}
              onChangeText={t => setField(trade, 'markup', t)}
              suffix="%"
              keyboardType="decimal-pad"
              error={errors.markup}
            />
          </View>
        );
      })}
    </RateCard>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.05,
    textTransform: 'uppercase',
  },
});
