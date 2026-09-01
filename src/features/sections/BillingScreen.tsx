/**
 * Billing — plan status and usage from GET /api/billing/status (the web
 * BillingTab's read surface). Existing Stripe subscribers manage their web
 * subscription through the validated Stripe portal handoff. New native plan
 * purchases stay fail-closed until server-side App Store receipt and webhook
 * reconciliation exists, preventing a second charge path for the same account.
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { apiErrorMessage } from '@/lib/api';
import { captureAppError } from '@/lib/monitoring';
import { openProviderHandoff } from '@/lib/provider-handoff';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { BILLING_PLAN_LABELS, isLiveBillingStatus, nativeStorePurchaseGate } from './billing-state';
import { SectionLoading, SectionScreen } from './SectionScreen';

const StatusSchema = z.looseObject({
  has_customer: z.boolean().nullish(),
  status: z.string().nullish(),
  plan: z.enum(['starter', 'pro', 'crew']).nullish(),
  interval: z.enum(['month', 'year']).nullish(),
  current_period_end: z.string().nullish(),
  trial_ends_at: z.string().nullish(),
  cancel_at_period_end: z.boolean().nullish(),
  usage: z
    .looseObject({ quotesUsed: z.number().nullish(), voiceMinutesUsed: z.number().nullish() })
    .nullish(),
  limits: z
    .looseObject({
      quotes: z.number().nullish(),
      voice: z.boolean().nullish(),
      voiceMinutes: z.number().nullish(),
    })
    .nullish(),
});

const PortalSchema = z.looseObject({ url: z.string() });

function dateAu(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function UsageLine({
  label,
  used,
  limit,
}: {
  label: string;
  used: number | null | undefined;
  limit: number | null | undefined;
}) {
  const { colors } = useTheme();
  if (used == null && limit == null) return null;
  const pct = limit ? Math.min(1, (used ?? 0) / limit) : 0;
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.usageHeading}>
        <Text style={[styles.usageLabel, { color: colors.textSec }]}>{label}</Text>
        <Text style={[styles.usageValue, { color: colors.textPri }]}>
          {used ?? 0}
          {limit ? ` / ${limit}` : ''}
        </Text>
      </View>
      {limit ? (
        <View style={[styles.usageTrack, { backgroundColor: colors.ink }]}>
          <View
            style={[
              styles.usageFill,
              {
                backgroundColor: pct >= 0.9 ? colors.warningBright : colors.textDim,
                width: `${Math.round(pct * 100)}%`,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export function BillingScreen() {
  const { colors } = useTheme();
  const { stripe } = useLocalSearchParams<{ stripe?: string }>();
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const query = useApiQuery(['billing', 'status'], '/api/billing/status', StatusSchema);
  const portal = useApiMutation<{ client: 'mobile' }, z.infer<typeof PortalSchema>>(
    '/api/billing/portal',
    PortalSchema,
    { timeoutMs: 30000 },
  );
  const refetchBilling = query.refetch;

  const status = query.data;
  const live = isLiveBillingStatus(status?.status);
  const planLabel = status?.plan ? BILLING_PLAN_LABELS[status.plan] : null;
  const nativeStoreGate = nativeStorePurchaseGate(status);

  useEffect(() => {
    if (stripe === 'return') void refetchBilling();
  }, [refetchBilling, stripe]);

  useEffect(() => {
    if (stripe === 'return' && query.isError) {
      captureAppError(query.error, {
        kind: 'background_return',
        operationId: 'stripe.billing.return.refresh',
        route: '/sections/billing',
      });
    }
  }, [query.error, query.isError, stripe]);

  async function openBillingPortal() {
    setHandoffError(null);
    setHandoffNote(null);
    try {
      const result = await portal.mutateAsync({ client: 'mobile' });
      await openProviderHandoff(result.url, 'stripe');
      setHandoffNote('Returned from Stripe · refreshing your billing status.');
      await query.refetch();
    } catch (error) {
      setHandoffError(apiErrorMessage(error));
    }
  }

  return (
    <SectionScreen
      title="Billing"
      subtitle="Your server-confirmed QuoteMax plan, usage and limits."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {stripe === 'return' ? (
        <Notice
          tone="accent"
          label="Back from Stripe"
          body="Checking QuoteMax’s current billing record. Returning here does not by itself confirm a plan change."
        />
      ) : null}
      {query.isPending ? (
        <SectionLoading label="Loading your plan" />
      ) : query.isError && !query.data ? (
        <Notice
          tone="danger"
          label="Could not load billing"
          body={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <View
            style={[
              styles.planCard,
              { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
            ]}
          >
            <Text style={[styles.planLabel, { color: colors.textDim }]}>CURRENT PLAN</Text>
            <Text style={[styles.planName, { color: colors.textPri }]}>
              {live && planLabel ? planLabel.toUpperCase() : 'NO ACTIVE PLAN'}
            </Text>
            {live ? (
              <Text style={[styles.planMeta, { color: colors.textSec }]}>
                {status?.status === 'trialing'
                  ? `Trial ends ${dateAu(status?.trial_ends_at)}`
                  : status?.cancel_at_period_end
                    ? `Ends ${dateAu(status?.current_period_end)}`
                    : `Renews ${dateAu(status?.current_period_end)} · billed ${status?.interval === 'year' ? 'yearly' : 'monthly'}`}
                {status?.status === 'past_due' ? ' · PAYMENT PAST DUE' : ''}
              </Text>
            ) : (
              <Text style={[styles.planMeta, { color: colors.textSec }]}>
                No server-confirmed active plan.
              </Text>
            )}
            {status?.usage || status?.limits ? (
              <View style={[styles.usage, { borderTopColor: colors.inkLine }]}>
                <UsageLine
                  label="Quotes this period"
                  used={status?.usage?.quotesUsed}
                  limit={status?.limits?.quotes}
                />
                {status?.limits?.voice ? (
                  <UsageLine
                    label="Voice minutes"
                    used={status?.usage?.voiceMinutesUsed}
                    limit={status?.limits?.voiceMinutes}
                  />
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            {status?.has_customer ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manage billing on the web"
                disabled={portal.isPending}
                onPress={() => void openBillingPortal()}
                style={({ pressed }) => [
                  styles.cta,
                  {
                    backgroundColor: pressed ? colors.accentPress : colors.accent,
                    opacity: portal.isPending ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.ctaText, { color: colors.accentInk }]}>
                  {portal.isPending
                    ? 'OPENING…'
                    : live
                      ? 'MANAGE WEB BILLING →'
                      : 'VIEW BILLING HISTORY →'}
                </Text>
              </Pressable>
            ) : (
              <Notice
                tone="warn"
                label="Native plan purchase unavailable"
                body={
                  nativeStoreGate.reason === 'server-reconciliation-missing'
                    ? 'QuoteMax has not enabled server receipt reconciliation for app-store plans yet. No purchase was started and no access is assumed.'
                    : 'Your subscription is managed by Stripe. QuoteMax will not start a second app-store subscription.'
                }
              />
            )}
            {handoffNote ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.note, { color: colors.textSec }]}
              >
                {handoffNote}
              </Text>
            ) : null}
            {handoffError || portal.isError ? (
              <Text style={[styles.note, { color: colors.dangerBright }]}>
                {handoffError ?? apiErrorMessage(portal.error)}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  planCard: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  planLabel: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.8 },
  planName: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.78,
  },
  planMeta: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 22 },
  usage: { gap: spacing.xl, marginTop: spacing.md, paddingTop: spacing.xl, borderTopWidth: 1 },
  usageHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  usageLabel: { fontFamily: fonts.sans.medium, fontSize: 14, lineHeight: 20 },
  usageValue: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  usageTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
  cta: {
    minHeight: touch.primaryCta,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actions: { gap: spacing.md },
  ctaText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  note: { fontFamily: fonts.sans.medium, fontSize: 14, lineHeight: 20 },
});
