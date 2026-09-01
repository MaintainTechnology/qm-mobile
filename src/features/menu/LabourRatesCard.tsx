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
import { useEffect, useReducer, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Field } from '@/features/auth/ui';
import { apiErrorMessage } from '@/lib/api';
import type { TenantMe } from '@/lib/tenant';
import { fonts, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { useSaveLabourRates } from './api';
import { RateCard } from './CardChrome';
import {
  BLANK_TRADE_VALUES,
  buildLabourSavePlan,
  labourEditorReducer,
  seedLabourValues,
  type TradeValues,
} from './labour-rates-state';

export const LABOUR_RATE_LABELS = {
  hourly: 'Hourly rate (ex GST)',
  callOut: 'Call-out minimum (ex GST)',
} as const;

function tradeLabel(trade: string): string {
  return trade.charAt(0).toUpperCase() + trade.slice(1);
}

export function LabourRatesCard({
  trades,
  pricingBooks,
}: {
  trades: string[];
  pricingBooks: TenantMe['pricing_books'];
}) {
  const { colors } = useTheme();

  const remoteSignature = JSON.stringify(seedLabourValues(trades, pricingBooks));
  const [editor, dispatchEditor] = useReducer(labourEditorReducer, undefined, () => {
    const initial = JSON.parse(remoteSignature) as Record<string, TradeValues>;
    return { baseline: initial, values: initial };
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, Partial<TradeValues>>>({});
  // Only for the "nothing changed" shortcut below, which never calls the mutation — a real save's
  // success/failure is read straight off `save.data?.ok` so a false 2xx can't show "Saved.".
  const [noopSaved, setNoopSaved] = useState(false);
  const save = useSaveLabourRates();

  useEffect(() => {
    dispatchEditor({
      type: 'REMOTE',
      incoming: JSON.parse(remoteSignature) as Record<string, TradeValues>,
    });
  }, [remoteSignature]);

  function setField(trade: string, key: keyof TradeValues, value: string) {
    setNoopSaved(false);
    save.reset();
    dispatchEditor({ type: 'EDIT', trade, field: key, value });
  }

  function onSave() {
    setNoopSaved(false);
    const plan = buildLabourSavePlan(trades, editor.values, editor.baseline);
    setFieldErrors(plan.errors);
    if (!plan.valid) return;
    const patchedTrades = Object.keys(plan.patch);
    if (patchedTrades.length === 0) {
      setNoopSaved(true);
      return;
    }
    const submitted = editor.values;
    save.mutate(
      { pricing_by_trade: plan.patch },
      {
        onSuccess: result => {
          if (result.ok) dispatchEditor({ type: 'ACK', trades: patchedTrades, submitted });
        },
      },
    );
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
        const v = editor.values[trade] ?? BLANK_TRADE_VALUES;
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
  section: { gap: spacing.xl },
  sectionLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
