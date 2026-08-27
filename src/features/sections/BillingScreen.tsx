/**
 * Billing — plan status and usage from GET /api/billing/status (the web
 * BillingTab's read surface). Plan purchases inside the app must go through
 * the store, so the change-plan CTA opens the RevenueCat paywall
 * (src/lib/purchases.ts) rather than Stripe Checkout; existing Stripe
 * subscribers manage their web subscription through the Stripe portal link
 * (POST /api/billing/portal → browser). Never both paths for one purchase.
 */
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { apiErrorMessage } from '@/lib/api';
import { presentPaywall } from '@/lib/purchases';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionScreen } from './SectionScreen';

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

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  crew: 'Crew',
};

/** Stripe ACTIVE_STATES (web BillingTab): trialing | active | past_due. */
function isLive(status: string | null | undefined): boolean {
  return status === 'trialing' || status === 'active' || status === 'past_due';
}

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
    <View style={{ gap: 4 }}>
      <Text style={[styles.usageLabel, { color: colors.textDim }]}>
        {label.toUpperCase()} · {used ?? 0}
        {limit ? ` / ${limit}` : ''}
      </Text>
      {limit ? (
        <View style={[styles.usageTrack, { backgroundColor: colors.ink }]}>
          <View
            style={[
              styles.usageFill,
              {
                backgroundColor: pct >= 0.9 ? colors.warningBright : colors.accent,
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
  const [paywallNote, setPaywallNote] = useState<string | null>(null);
  const query = useApiQuery(['billing', 'status'], '/api/billing/status', StatusSchema);
  const portal = useApiMutation<Record<string, never>, z.infer<typeof PortalSchema>>(
    '/api/billing/portal',
    PortalSchema,
    { timeoutMs: 30000, onSuccess: result => void Linking.openURL(result.url) },
  );

  const status = query.data;
  const live = isLive(status?.status);
  const planLabel = status?.plan ? (PLAN_LABELS[status.plan] ?? status.plan) : null;

  async function changePlan() {
    setPaywallNote(null);
    const purchased = await presentPaywall();
    if (purchased) {
      setPaywallNote('Plan updated ✓');
      void query.refetch();
    }
  }

  return (
    <SectionScreen
      title="Billing"
      subtitle="Your QuoteMax plan. All prices AUD ex GST — only voice minutes are metered."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isPending ? (
        <Notice tone="accent" label="Loading your plan…" />
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
                Pick a plan to turn your AI line on.
              </Text>
            )}
            {status?.usage || status?.limits ? (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={live ? 'Change plan' : 'Choose a plan'}
            onPress={() => void changePlan()}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: pressed ? colors.accentPress : colors.accent },
            ]}
          >
            <Text style={[styles.ctaText, { color: colors.accentInk }]}>
              {live ? 'CHANGE PLAN' : 'CHOOSE A PLAN'}
            </Text>
          </Pressable>
          {paywallNote ? (
            <Text style={[styles.note, { color: colors.successBright }]}>{paywallNote}</Text>
          ) : null}

          {status?.has_customer ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage billing on the web"
              disabled={portal.isPending}
              onPress={() => portal.mutate({})}
              style={({ pressed }) => [
                styles.portalBtn,
                {
                  borderColor: colors.ctlLine,
                  backgroundColor: pressed ? colors.ink : 'transparent',
                },
              ]}
            >
              <Text style={[styles.portalText, { color: colors.textPri }]}>
                {portal.isPending
                  ? 'OPENING…'
                  : live
                    ? 'MANAGE WEB BILLING →'
                    : 'VIEW BILLING HISTORY →'}
              </Text>
            </Pressable>
          ) : null}
          {portal.isError ? (
            <Text style={[styles.note, { color: colors.dangerBright }]}>
              {apiErrorMessage(portal.error)}
            </Text>
          ) : null}
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  planCard: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.xs },
  planLabel: { fontFamily: fonts.mono.semiBold, fontSize: 11, letterSpacing: 0.88 },
  planName: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 24,
    letterSpacing: -0.72, // -.03em @ 24
  },
  planMeta: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 19 },
  usageLabel: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 0.8 },
  usageTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
  cta: {
    minHeight: touch.primaryCta,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.control,
  },
  ctaText: { fontFamily: fonts.mono.bold, fontSize: 12, letterSpacing: 0.96 },
  portalBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
  },
  portalText: { fontFamily: fonts.mono.semiBold, fontSize: 11, letterSpacing: 0.88 },
  note: { fontFamily: fonts.sans.medium, fontSize: 12.5 },
});
