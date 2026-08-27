/**
 * Pricing book — the web sidebar's "General pricing" as its own screen. Hosts
 * the existing rate editors (they own their PATCH /api/tenant/me wiring), with
 * the same per-trade gating the Menu tab used before the section split.
 */
import { ActivityIndicator, View } from 'react-native';

import { CardBox, RetryLine } from '@/features/menu/CardChrome';
import { LabourRatesCard } from '@/features/menu/LabourRatesCard';
import { PaintRatesCard } from '@/features/menu/PaintRatesCard';
import { RoofRatesCard } from '@/features/menu/RoofRatesCard';
import { WebOnlyCard } from '@/features/trades/hub/SectionsContent';
import { apiErrorMessage } from '@/lib/api';
import { spacing } from '@/lib/theme';
import { isTenantMissing, tenantTrades, useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

import { SectionScreen } from './SectionScreen';

export function PricingBookScreen() {
  const { colors } = useTheme();
  const me = useTenantMe();
  const trades = me.data ? tenantTrades(me.data) : [];
  const labourTrades = trades.filter(t => t === 'electrical' || t === 'plumbing');

  return (
    <SectionScreen
      title="Pricing book"
      subtitle="The only source of a price — every quote is built from these rates."
      refreshing={me.isFetching}
      onRefresh={() => void me.refetch()}
    >
      {me.isPending ? (
        <CardBox title="PRICING BOOK">
          <ActivityIndicator color={colors.accent} />
        </CardBox>
      ) : me.isError && !me.data && !isTenantMissing(me.error) ? (
        <CardBox title="PRICING BOOK">
          <RetryLine message={apiErrorMessage(me.error)} onRetry={() => void me.refetch()} />
        </CardBox>
      ) : me.data ? (
        <View style={{ gap: spacing.lg }}>
          {labourTrades.length > 0 ? (
            <LabourRatesCard trades={labourTrades} pricingBooks={me.data.pricing_books} />
          ) : null}
          {trades.includes('roofing') ? <RoofRatesCard /> : null}
          {trades.includes('painting') ? <PaintRatesCard /> : null}
          <WebOnlyCard
            label="Pricing wizard"
            body="Rebuild any trade's rates from a guided walkthrough on the web."
            path="/dashboard/pricing-wizard"
            cta="Open the pricing wizard"
          />
        </View>
      ) : null}
    </SectionScreen>
  );
}
