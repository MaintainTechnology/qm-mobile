/**
 * Hub Pricing section — the native EDITOR mirroring the web PricingTab in hub
 * mode (page.tsx:5683-5837): the trade's hourly pricing book, the per-trade
 * quote tier mode (mig 142), the matching rate-card editor for
 * roofing/painting/solar, and the pricing-wizard link card. Tenant-wide cards
 * (early-bird, display, review, follow-up, calibration) stay on the web's
 * General pricing tab, hub parity.
 *
 * NOT write-gated: PATCH /api/tenant/me validates `pricing_by_trade` and
 * `quote_tier_mode_by_trade` against HUB_TRADE_ENUM — all 8 hub trades — and
 * the rate-card routes carry no trade gate at all (lib/tenant/update-schema.ts).
 *
 * The hourly book is hidden for rate-card trades (roofing/painting/signage/
 * aircon): their pricing_book row exists but its hourly_rate is INERT — the
 * estimators price off the rate card (lib/dashboard/pricing-visibility.ts
 * NO_BOOK_HUB_TRADES; surfacing it made new roofing accounts look
 * hourly-priced).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { LabourRatesCard } from '@/features/menu/LabourRatesCard';
import { PaintRatesCard } from '@/features/menu/PaintRatesCard';
import { RoofRatesCard } from '@/features/menu/RoofRatesCard';
import { SolarRatesCard } from '@/features/menu/SolarRatesCard';
import { fonts, spacing } from '@/lib/theme';
import { TENANT_ME_KEY, useTenantMe } from '@/lib/tenant';
import { useApiMutation } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../../ui';
import { LinkOutButton } from '../LinkOut';
import { TRADE_LABELS, type HubTrade } from '../sections';

/** lib/dashboard/pricing-visibility.ts NO_BOOK_HUB_TRADES, verbatim. */
const NO_BOOK_HUB_TRADES: readonly HubTrade[] = ['roofing', 'painting', 'signage', 'aircon'];

/** page.tsx TIER_MODE_FEATURE_LABELS keys — aircon/signage produce no
 *  Good/Better/Best quote, so they get no tier selector. */
const TIER_CAPABLE: readonly HubTrade[] = [
  'electrical',
  'plumbing',
  'roofing',
  'painting',
  'commercial_painting',
  'solar',
];

/** Web TIER_MODE_OPTIONS values in the web's order, pill-length labels. */
const TIER_MODE_OPTIONS = [
  ['single', 'Single price'],
  ['good_better_best', 'Good / Better / Best'],
  ['good', 'Good only'],
  ['better', 'Better only'],
  ['best', 'Best only'],
] as const;

type TierMode = (typeof TIER_MODE_OPTIONS)[number][0];

/** Web asQuoteTierMode: anything outside the closed set reads as 'single'. */
function asTierMode(v: unknown): TierMode {
  return TIER_MODE_OPTIONS.some(([mode]) => mode === v) ? (v as TierMode) : 'single';
}

const TenantMePatchResultSchema = z.looseObject({ ok: z.boolean() });

/**
 * Mig 142 — per-feature tier presentation. Saves on tap via
 * PATCH /api/tenant/me { quote_tier_mode_by_trade: { [trade]: mode } }, which
 * updates ONLY this trade's pricing_book row. A failed save keeps the tapped
 * pill selected with the error line — tapping it again retries.
 */
function QuoteTierModeCard({ trade, initialMode }: { trade: HubTrade; initialMode: TierMode }) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<TierMode>(initialMode);
  const save = useApiMutation<
    { quote_tier_mode_by_trade: Partial<Record<HubTrade, TierMode>> },
    z.infer<typeof TenantMePatchResultSchema>
  >('/api/tenant/me', TenantMePatchResultSchema, { method: 'PATCH', invalidates: [TENANT_ME_KEY] });

  return (
    <Card>
      <SectionLabel>Quote pricing options</SectionLabel>
      <Text style={[styles.tierHint, { color: colors.textSec }]}>
        How many price options the customer sees. Single price shows just your recommended option;
        Good / Better / Best shows all three.
      </Text>
      <View style={{ marginTop: spacing.md }}>
        <PillGroup
          options={TIER_MODE_OPTIONS}
          value={mode}
          onChange={next => {
            const m = asTierMode(next);
            setMode(m);
            save.mutate({ quote_tier_mode_by_trade: { [trade]: m } });
          }}
        />
      </View>
      {save.isPending ? (
        <Text style={[styles.tierStatus, { color: colors.textDim }]}>Saving…</Text>
      ) : save.isError ? (
        <Text style={[styles.tierStatus, { color: colors.dangerBright }]}>
          {apiErrorMessage(
            save.error,
            'Couldn’t reach QuoteMax — check your connection and tap the option again.',
          )}
        </Text>
      ) : save.data?.ok === false ? (
        <Text style={[styles.tierStatus, { color: colors.dangerBright }]}>
          That didn’t save — tap the option again.
        </Text>
      ) : save.data?.ok === true ? (
        <Text style={[styles.tierStatus, { color: colors.successBright }]}>Saved.</Text>
      ) : null}
    </Card>
  );
}

export function PricingSection({ trade }: { trade: HubTrade }) {
  const me = useTenantMe();
  if (me.isPending) return <Notice tone="accent" label="Loading pricing…" />;
  const data = me.data;
  if (!data)
    return (
      <Notice
        tone="danger"
        label="Could not load pricing"
        body={apiErrorMessage(me.error)}
        onRetry={() => void me.refetch()}
      />
    );

  const book = (data.pricing_books ?? []).find(b => (b.trade ?? '').toLowerCase() === trade);
  const showsHourlyBook = !NO_BOOK_HUB_TRADES.includes(trade);

  return (
    <View style={{ gap: spacing.xl }}>
      {showsHourlyBook ? (
        book ? (
          <LabourRatesCard trades={[trade]} pricingBooks={data.pricing_books} />
        ) : (
          <Notice
            tone="accent"
            label={`No ${TRADE_LABELS[trade]} pricing book yet`}
            body="Run the pricing wizard on the web dashboard to set this trade’s rates."
          />
        )
      ) : null}
      {book && TIER_CAPABLE.includes(trade) ? (
        <QuoteTierModeCard
          // Reset selected/error state whenever the authoritative trade book changes.
          key={`${trade}:${asTierMode(book['quote_tier_mode'])}`}
          trade={trade}
          initialMode={asTierMode(book['quote_tier_mode'])}
        />
      ) : null}
      {trade === 'roofing' ? <RoofRatesCard /> : null}
      {trade === 'painting' ? <PaintRatesCard /> : null}
      {trade === 'solar' ? <SolarRatesCard /> : null}
      {/* Web parity: the hub's pricing section carries a Pricing-wizard link
          card (page.tsx:17263-17290 → /dashboard/pricing-wizard?trade={trade}). */}
      <View style={{ gap: spacing.md }}>
        <Notice
          tone="accent"
          label="Pricing wizard"
          body="Rebuild this trade’s rates from a guided walkthrough — call-outs, hourly rate and markup in a few minutes."
        />
        <LinkOutButton
          label="Open the pricing wizard"
          path={`/dashboard/pricing-wizard?trade=${trade}`}
          tone="accent"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tierHint: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  tierStatus: {
    marginTop: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
