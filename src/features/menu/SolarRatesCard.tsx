/**
 * Solar rate card — mobile twin of the web SolarRatesEditor
 * (app/dashboard/_components/SolarRatesEditor.tsx), targeting
 * `/api/tenant/solar-rates`. Bounds mirror lib/solar/rate-card-overlay.ts:
 * $/kW rates positive max A$5,000, loadings 0–100% (fractions 0–1 on the
 * wire — enter 20 for 20%, exactly like the web), job minimum A$0–20,000,
 * STC price A$1–60, deposit 1–50%. Blank is the deliberate "use the default"
 * state on every field.
 *
 * Not built on OverlayRatesCard: the solar PATCH is a fixed field set the
 * route rebuilds wholesale (see api.ts's useSaveSolarRates header), the
 * loadings need a percent↔fraction conversion, and gst_registered is a
 * three-state boolean — none of which fit that card's dollars-only config.
 * The load → seed-once → edit → save shape is the same.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/features/auth/ui';
import { PillGroup } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { apiDollarsFromCents } from '@/lib/money';
import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { useSaveSolarRates, useSolarRates } from './api';
import { CardBox, CardHint, RateCard, RetryLine } from './CardChrome';
import { parseOptionalPercent, parseRateCents } from './validation';

// Server bounds, verbatim from lib/solar/rate-card-overlay.ts.
const MAX_RATE_PER_KW_DOLLARS = 5000;
const MAX_CALL_OUT_DOLLARS = 20000;
const MIN_STC_DOLLARS = 1;
const MAX_STC_DOLLARS = 60;
const MIN_DEPOSIT_PCT = 1;
const MAX_DEPOSIT_PCT = 50;

type Values = {
  standard: string;
  premium: string;
  multiStorey: string;
  complexRoof: string;
  callOut: string;
  stc: string;
  deposit: string;
};

const BLANK: Values = {
  standard: '',
  premium: '',
  multiStorey: '',
  complexRoof: '',
  callOut: '',
  stc: '',
  deposit: '',
};

/** '' = use the default (the web editor's three-state GST select). */
type GstMode = '' | 'true' | 'false';

const GST_OPTIONS = [
  ['', 'Default'],
  ['true', 'Yes — add 10% GST'],
  ['false', 'No — no GST added'],
] as const;

function numberAt(container: unknown, key: string): number | undefined {
  if (container == null || typeof container !== 'object') return undefined;
  const v = (container as Record<string, unknown>)[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

const toInput = (v: number | undefined): string => (v === undefined ? '' : String(v));

/** Wire fraction → percent display string, the web's own rounding (pct()). */
const toPercentInput = (v: number | undefined): string =>
  v === undefined ? '' : String(Math.round(v * 1000) / 10);

export function SolarRatesCard() {
  const { colors } = useTheme();
  const rates = useSolarRates();
  const save = useSaveSolarRates();

  const [values, setValues] = useState<Values>(BLANK);
  const [gstMode, setGstMode] = useState<GstMode>('');
  const [seeded, setSeeded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Values>>({});

  // Seed once the current overrides arrive — a later refetch (e.g. after a
  // save) must not clobber whatever the tradie is mid-typing.
  useEffect(() => {
    if (!rates.data || seeded) return;
    const overrides = rates.data.overrides ?? {};
    const perKw = overrides['install_rate_per_kw'];
    setValues({
      standard: toInput(numberAt(perKw, 'standard_panels')),
      premium: toInput(numberAt(perKw, 'premium_panels')),
      multiStorey: toPercentInput(numberAt(overrides, 'multi_storey_loading_pct')),
      complexRoof: toPercentInput(numberAt(overrides, 'complex_roof_loading_pct')),
      callOut: toInput(numberAt(overrides, 'call_out_minimum_ex_gst')),
      stc: toInput(numberAt(overrides, 'stc_price_aud')),
      deposit: toInput(numberAt(overrides, 'deposit_pct')),
    });
    const gst = overrides['gst_registered'];
    setGstMode(gst === true ? 'true' : gst === false ? 'false' : '');
    setSeeded(true);
  }, [rates.data, seeded]);

  if (rates.isPending) {
    return (
      <CardBox title="SOLAR RATES">
        <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
      </CardBox>
    );
  }
  if (rates.isError) {
    return (
      <CardBox title="SOLAR RATES">
        <RetryLine message="Couldn’t load your solar rates." onRetry={() => rates.refetch()} />
      </CardBox>
    );
  }
  if (rates.data.has_pricing_book === false) {
    return (
      <CardBox title="SOLAR RATES">
        <CardHint>
          Finish onboarding for your primary trade first — solar rates live on the pricing book row.
        </CardHint>
      </CardBox>
    );
  }

  function setField(key: keyof Values, value: string) {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function onSave() {
    const standard = parseRateCents(values.standard, {
      positive: true,
      maxDollars: MAX_RATE_PER_KW_DOLLARS,
      required: false,
    });
    const premium = parseRateCents(values.premium, {
      positive: true,
      maxDollars: MAX_RATE_PER_KW_DOLLARS,
      required: false,
    });
    const multiStorey = parseOptionalPercent(values.multiStorey);
    const complexRoof = parseOptionalPercent(values.complexRoof);
    const callOut = parseRateCents(values.callOut, {
      maxDollars: MAX_CALL_OUT_DOLLARS,
      required: false,
    });
    const stc = parseRateCents(values.stc, {
      minDollars: MIN_STC_DOLLARS,
      maxDollars: MAX_STC_DOLLARS,
      required: false,
    });
    const deposit = parseOptionalPercent(values.deposit, {
      min: MIN_DEPOSIT_PCT,
      max: MAX_DEPOSIT_PCT,
    });

    const nextErrors: Partial<Values> = {};
    if (standard.error) nextErrors.standard = standard.error;
    if (premium.error) nextErrors.premium = premium.error;
    if (multiStorey.error) nextErrors.multiStorey = multiStorey.error;
    if (complexRoof.error) nextErrors.complexRoof = complexRoof.error;
    if (callOut.error) nextErrors.callOut = callOut.error;
    if (stc.error) nextErrors.stc = stc.error;
    if (deposit.error) nextErrors.deposit = deposit.error;
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // The web editor's exact body shape: every field every save, null = clear
    // the override. Loadings go over as 0–1 fractions (percent ÷ 100 — not
    // money, so money.ts's cents rule doesn't apply).
    save.mutate({
      install_rate_per_kw: {
        standard_panels:
          standard.provided && standard.cents != null ? apiDollarsFromCents(standard.cents) : null,
        premium_panels:
          premium.provided && premium.cents != null ? apiDollarsFromCents(premium.cents) : null,
      },
      multi_storey_loading_pct: multiStorey.value == null ? null : multiStorey.value / 100,
      complex_roof_loading_pct: complexRoof.value == null ? null : complexRoof.value / 100,
      call_out_minimum_ex_gst:
        callOut.provided && callOut.cents != null ? apiDollarsFromCents(callOut.cents) : null,
      stc_price_aud: stc.provided && stc.cents != null ? apiDollarsFromCents(stc.cents) : null,
      deposit_pct: deposit.value,
      gst_registered: gstMode === '' ? null : gstMode === 'true',
    });
  }

  return (
    <RateCard
      title="SOLAR RATES"
      hint="All-in supply + install rate per kW DC, ex GST. Loadings are percentages — enter 20 for 20%. Leave a field blank to use the default rate."
      onSave={onSave}
      saving={save.isPending}
      error={
        save.isError
          ? apiErrorMessage(
              save.error,
              'Couldn’t reach QuoteMax — check your connection and try again.',
            )
          : save.data?.ok === false
            ? (save.data.error ??
              save.data.issues?.map(i => i.message).join(' · ') ??
              'That didn’t save — try again.')
            : null
      }
      saved={save.data?.ok === true}
    >
      <Field
        label="Standard panels"
        value={values.standard}
        onChangeText={t => setField('standard', t)}
        prefix="A$"
        suffix="/ kW"
        keyboardType="decimal-pad"
        error={fieldErrors.standard}
      />
      <Field
        label="Premium panels"
        value={values.premium}
        onChangeText={t => setField('premium', t)}
        prefix="A$"
        suffix="/ kW"
        keyboardType="decimal-pad"
        error={fieldErrors.premium}
      />
      <Field
        label="Multi-storey access loading"
        value={values.multiStorey}
        onChangeText={t => setField('multiStorey', t)}
        suffix="%"
        keyboardType="decimal-pad"
        error={fieldErrors.multiStorey}
      />
      <Field
        label="Complex / steep roof loading"
        value={values.complexRoof}
        onChangeText={t => setField('complexRoof', t)}
        suffix="%"
        keyboardType="decimal-pad"
        error={fieldErrors.complexRoof}
      />
      <Field
        label="Job minimum"
        value={values.callOut}
        onChangeText={t => setField('callOut', t)}
        prefix="A$"
        keyboardType="decimal-pad"
        error={fieldErrors.callOut}
      />
      <Field
        label="STC price"
        value={values.stc}
        onChangeText={t => setField('stc', t)}
        prefix="A$"
        suffix="/ cert"
        keyboardType="decimal-pad"
        error={fieldErrors.stc}
      />
      <Field
        label="Deposit"
        value={values.deposit}
        onChangeText={t => setField('deposit', t)}
        suffix="%"
        keyboardType="decimal-pad"
        error={fieldErrors.deposit}
      />
      <View style={styles.gstBlock}>
        <Text style={[styles.gstLabel, { color: colors.textPri }]}>GST REGISTERED</Text>
        <PillGroup
          options={GST_OPTIONS}
          value={gstMode}
          onChange={v => setGstMode(v === 'true' ? 'true' : v === 'false' ? 'false' : '')}
        />
      </View>
    </RateCard>
  );
}

const styles = StyleSheet.create({
  gstBlock: { gap: 8 },
  gstLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.05,
  },
});
