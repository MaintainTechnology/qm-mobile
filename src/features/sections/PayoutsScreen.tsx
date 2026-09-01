/**
 * Payouts — the web PayoutsTab at mobile scope: GET /api/tenant/payouts for
 * the Stripe Connect account state + deposit jobs, release via POST
 * /api/quote/[id]/complete, and Stripe-hosted onboarding via POST
 * /api/stripe/connect/start (opens the returned URL in the browser).
 *
 * UNITS: unlike the quote wire, payout money is INTEGER AUD CENTS — formatAud
 * directly, never centsFromApiDollars.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { formatJobType } from '@/features/quotes/status';
import { apiErrorMessage } from '@/lib/api';
import { formatAud } from '@/lib/money';
import { captureAppError } from '@/lib/monitoring';
import { openProviderHandoff } from '@/lib/provider-handoff';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionEmpty, SectionGroup, SectionLoading, SectionScreen } from './SectionScreen';

const PAYOUTS_KEY = ['tenant', 'payouts'] as const;

const PayoutJobSchema = z.looseObject({
  quote_id: z.string(),
  job_type: z.string().nullish(),
  paid_tier: z.string().nullish(),
  paid_at: z.string().nullish(),
  paid_amount_cents: z.number().nullish(),
  net_cents: z.number().nullish(),
  completed_at: z.string().nullish(),
  release_state: z.enum(['released', 'in_flight', 'awaiting']).nullish(),
});
type PayoutJob = z.infer<typeof PayoutJobSchema>;

const PayoutsSchema = z.looseObject({
  ok: z.literal(true),
  account: z
    .looseObject({
      has_account: z.boolean().nullish(),
      payouts_enabled: z.boolean().nullish(),
      details_submitted: z.boolean().nullish(),
      bank: z
        .looseObject({ bank_name: z.string().nullish(), last4: z.string().nullish() })
        .nullish(),
      balance: z
        .looseObject({
          available_cents: z.number().nullish(),
          pending_cents: z.number().nullish(),
        })
        .nullish(),
    })
    .nullish(),
  jobs: z.array(PayoutJobSchema).default([]),
});

const StartSchema = z.looseObject({ ok: z.literal(true), url: z.string() });
export const CompleteSchema = z.looseObject({
  ok: z.literal(true),
  completed: z.boolean(),
  released: z.boolean(),
  completed_at: z.string().nullish(),
  already: z.boolean().nullish(),
  block: z.string().nullish(),
  in_flight: z.boolean().nullish(),
  payout: z
    .looseObject({
      id: z.string().nullish(),
      amount_cents: z.number().nullish(),
      created_at: z.string().nullish(),
    })
    .nullish(),
});
export type CompleteResult = z.infer<typeof CompleteSchema>;

export type CompletionOutcome = {
  kind: 'released' | 'in_flight' | 'blocked';
  message: string;
};

/** Preserve the complete route's independent completion and release facts in user-facing copy. */
export function completionOutcome(result: CompleteResult): CompletionOutcome {
  if (result.released) {
    return {
      kind: 'released',
      message: result.already
        ? 'Job was already complete and its payout is released.'
        : 'Job complete · payout released to Stripe.',
    };
  }
  if (result.in_flight || result.block === 'release_in_progress') {
    return {
      kind: 'in_flight',
      message: 'Job complete · payout release is already in progress. Refresh to check it.',
    };
  }

  const byBlock: Record<string, string> = {
    payouts_not_ready:
      'Job complete · payout is blocked until Stripe setup is finished. Finish setup, then retry release.',
    not_connect_routed:
      'Job complete · this payment was not routed to the connected account. Contact QuoteMax support for payout help.',
    account_mismatch:
      'Job complete · the connected payout account changed. Contact QuoteMax support before retrying.',
    nothing_to_release:
      'Job complete · there are no funds to release for this deposit. Check the payment amount before retrying.',
    not_paid: 'The server could not release a payout because this job is not recorded as paid.',
  };
  const block = result.block?.trim();
  return {
    kind: 'blocked',
    message:
      (block ? byBlock[block] : undefined) ??
      (block
        ? `Job complete · payout not released (${block.replace(/_/g, ' ')}). Resolve the block, then retry.`
        : 'Job complete · payout was not released. Refresh and retry when funds are available.'),
  };
}

export function formatOptionalBalance(cents: number | null | undefined): string {
  return cents == null ? 'Unavailable' : formatAud(cents);
}

function JobRow({ job }: { job: PayoutJob }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const complete = useApiMutation<{ quoteId: string }, CompleteResult>(
    (vars: { quoteId: string }) => `/api/quote/${vars.quoteId}/complete`,
    CompleteSchema,
    {
      timeoutMs: 30000,
      // Completion is stamped before a provider failure. Reconcile on every outcome before retry.
      onSettled: () => queryClient.invalidateQueries({ queryKey: PAYOUTS_KEY }),
    },
  );
  const outcome = complete.data ? completionOutcome(complete.data) : null;
  const state =
    outcome?.kind === 'released'
      ? 'released'
      : outcome?.kind === 'in_flight'
        ? 'in_flight'
        : (job.release_state ?? 'awaiting');
  const completed = job.completed_at != null || complete.data?.completed === true;
  const stateColor =
    state === 'released'
      ? colors.successBright
      : state === 'in_flight'
        ? colors.warningBright
        : colors.textDim;
  return (
    <View style={[styles.jobRow, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={{ minWidth: 0, gap: spacing.xs }}>
        <Text style={[styles.jobName, { color: colors.textPri }]} numberOfLines={2}>
          {job.paid_tier === 'inspection' ? 'Site visit' : formatJobType(job.job_type)}
        </Text>
        <Text style={[styles.jobMeta, { color: colors.textDim }]}>
          {job.paid_at ? `PAID ${job.paid_at.slice(8, 10)}/${job.paid_at.slice(5, 7)}` : ''}
          {' · '}
          {completed && state === 'awaiting'
            ? 'COMPLETED · RELEASE BLOCKED'
            : state.replace('_', ' ').toUpperCase()}
        </Text>
        {complete.isError ? (
          <Text style={[styles.jobMeta, { color: colors.dangerBright }]}>
            {apiErrorMessage(complete.error)}
          </Text>
        ) : outcome ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.jobMeta,
              {
                color:
                  outcome.kind === 'released'
                    ? colors.successBright
                    : outcome.kind === 'in_flight'
                      ? colors.warningBright
                      : colors.textSec,
              },
            ]}
          >
            {outcome.message}
          </Text>
        ) : null}
      </View>
      <View style={[styles.jobFooter, { borderTopColor: colors.inkLine }]}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>NET PAYOUT</Text>
          <Text style={[styles.jobAmount, { color: stateColor }]}>
            {job.net_cents == null ? '—' : formatAud(job.net_cents)}
          </Text>
        </View>
        {state === 'awaiting' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              completed
                ? 'Retry payout release for completed job'
                : 'Mark job complete and release payout'
            }
            disabled={complete.isPending}
            onPress={() => complete.mutate({ quoteId: job.quote_id })}
            accessibilityState={{ disabled: complete.isPending, busy: complete.isPending }}
            style={({ pressed }) => [
              styles.releaseBtn,
              {
                borderColor: colors.ctlLine,
                backgroundColor: pressed ? colors.ink : 'transparent',
                opacity: complete.isPending ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.releaseText, { color: colors.textPri }]}>
              {complete.isPending ? 'RELEASING…' : completed ? 'RETRY RELEASE' : 'JOB COMPLETE'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PayoutsScreen() {
  const { colors } = useTheme();
  const { stripe } = useLocalSearchParams<{ stripe?: string }>();
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const query = useApiQuery(PAYOUTS_KEY, '/api/tenant/payouts', PayoutsSchema);
  const start = useApiMutation<{ client: 'mobile' }, z.infer<typeof StartSchema>>(
    '/api/stripe/connect/start',
    StartSchema,
    { timeoutMs: 30000 },
  );
  const refetchPayouts = query.refetch;

  const account = query.data?.account;
  const jobs = query.data?.jobs ?? [];
  const ready = account?.payouts_enabled === true;

  useEffect(() => {
    if (stripe === 'return' || stripe === 'refresh') void refetchPayouts();
  }, [refetchPayouts, stripe]);

  useEffect(() => {
    if ((stripe === 'return' || stripe === 'refresh') && query.isError) {
      captureAppError(query.error, {
        kind: 'background_return',
        operationId: 'stripe.payouts.return.refresh',
        route: '/sections/payouts',
      });
    }
  }, [query.error, query.isError, stripe]);

  async function startOnboarding() {
    setHandoffError(null);
    setHandoffNote(null);
    try {
      const result = await start.mutateAsync({ client: 'mobile' });
      await openProviderHandoff(result.url, 'stripe');
      setHandoffNote('Returned from Stripe · refreshing payout readiness.');
      await query.refetch();
    } catch (error) {
      setHandoffError(apiErrorMessage(error));
    }
  }

  return (
    <SectionScreen
      title="Payouts"
      subtitle="Customer deposits and the server-confirmed amount available to your payout account."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {stripe === 'return' ? (
        <Notice
          tone="accent"
          label="Back from Stripe"
          body="Checking the server’s payout readiness. Returning here does not by itself mean setup finished."
        />
      ) : stripe === 'refresh' ? (
        <Notice
          tone="accent"
          label="Stripe link expired"
          body="No payout change is assumed. Continue with Stripe below to request a fresh single-use setup link."
        />
      ) : null}
      {query.isPending ? (
        <SectionLoading label="Loading payouts" />
      ) : query.isError && !query.data ? (
        <Notice
          tone="danger"
          label="Could not load payouts"
          body={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {!ready ? (
            <View style={{ gap: spacing.md }}>
              <Notice
                tone="accent"
                label={account?.has_account ? 'Finish payout setup' : 'Set up payouts'}
                body={
                  account?.has_account
                    ? 'Stripe still needs details before deposits can reach your bank.'
                    : 'Connect a bank account with Stripe so customer deposits land with you.'
                }
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set up payouts with Stripe"
                disabled={start.isPending}
                onPress={() => void startOnboarding()}
                style={({ pressed }) => [
                  styles.startBtn,
                  { backgroundColor: pressed ? colors.accentPress : colors.accent },
                ]}
              >
                <Text style={[styles.releaseText, { color: colors.accentInk }]}>
                  {start.isPending ? 'OPENING STRIPE…' : 'CONTINUE WITH STRIPE →'}
                </Text>
              </Pressable>
              {handoffNote ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.jobMeta, { color: colors.textSec }]}
                >
                  {handoffNote}
                </Text>
              ) : null}
              {handoffError || start.isError ? (
                <Text style={[styles.jobMeta, { color: colors.dangerBright }]}>
                  {handoffError ?? apiErrorMessage(start.error)}
                </Text>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.accountCard,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              <Text style={[styles.groupLabel, { color: colors.textDim }]}>PAYOUT ACCOUNT</Text>
              <Text style={[styles.bankLine, { color: colors.textPri }]}>
                {account?.bank?.bank_name ?? 'Bank details unavailable'}
                {account?.bank?.last4 ? ` ····${account.bank.last4}` : ''}
              </Text>
              {account?.balance ? (
                <View style={[styles.balance, { borderTopColor: colors.inkLine }]}>
                  <View style={styles.balanceRow}>
                    <Text style={[styles.groupLabel, { color: colors.textDim }]}>AVAILABLE</Text>
                    <Text style={[styles.jobAmount, { color: colors.textPri }]}>
                      {formatOptionalBalance(account.balance.available_cents)}
                    </Text>
                  </View>
                  <View style={styles.balanceRow}>
                    <Text style={[styles.groupLabel, { color: colors.textDim }]}>PENDING</Text>
                    <Text style={[styles.jobAmount, { color: colors.textPri }]}>
                      {formatOptionalBalance(account.balance.pending_cents)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.jobMeta, { color: colors.textSec }]}>
                  Live Stripe balance unavailable. Pull to refresh before relying on available
                  funds.
                </Text>
              )}
            </View>
          )}

          <SectionGroup title="Deposits" count={jobs.length}>
            {jobs.length === 0 ? (
              <SectionEmpty
                title="No deposits yet"
                body="Deposits appear here when a customer pays on a quote."
              />
            ) : (
              jobs.map(job => <JobRow key={job.quote_id} job={job} />)
            )}
          </SectionGroup>
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.6,
  },
  startBtn: {
    minHeight: touch.primaryCta,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  accountCard: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  bankLine: { fontFamily: fonts.sans.bold, fontSize: 18, lineHeight: 26 },
  balance: { borderTopWidth: 1, paddingTop: spacing.lg, marginTop: spacing.sm, gap: spacing.lg },
  balanceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  jobRow: {
    gap: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
  },
  jobName: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
  jobMeta: { fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 18, letterSpacing: 0.3 },
  jobAmount: {
    fontFamily: fonts.mono.bold,
    fontSize: 18,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  jobFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  releaseBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  releaseText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
