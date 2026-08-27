/**
 * Payouts — the web PayoutsTab at mobile scope: GET /api/tenant/payouts for
 * the Stripe Connect account state + deposit jobs, release via POST
 * /api/quote/[id]/complete, and Stripe-hosted onboarding via POST
 * /api/stripe/connect/start (opens the returned URL in the browser).
 *
 * UNITS: unlike the quote wire, payout money is INTEGER AUD CENTS — formatAud
 * directly, never centsFromApiDollars.
 */
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { formatJobType } from '@/features/quotes/status';
import { apiErrorMessage } from '@/lib/api';
import { formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionScreen } from './SectionScreen';

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
const CompleteSchema = z.looseObject({});

function JobRow({ job }: { job: PayoutJob }) {
  const { colors } = useTheme();
  const complete = useApiMutation(
    (vars: { quoteId: string }) => `/api/quote/${vars.quoteId}/complete`,
    CompleteSchema,
    { timeoutMs: 30000, invalidates: [PAYOUTS_KEY] },
  );
  const state = job.release_state ?? 'awaiting';
  const stateColor =
    state === 'released'
      ? colors.successBright
      : state === 'in_flight'
        ? colors.warningBright
        : colors.textDim;
  return (
    <View style={[styles.jobRow, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.jobName, { color: colors.textPri }]} numberOfLines={1}>
          {job.paid_tier === 'inspection' ? 'Site visit' : formatJobType(job.job_type)}
        </Text>
        <Text style={[styles.jobMeta, { color: colors.textDim }]} numberOfLines={1}>
          {job.paid_at ? `PAID ${job.paid_at.slice(8, 10)}/${job.paid_at.slice(5, 7)}` : ''}
          {' · '}
          {state.replace('_', ' ').toUpperCase()}
        </Text>
        {complete.isError ? (
          <Text style={[styles.jobMeta, { color: colors.dangerBright }]}>
            {apiErrorMessage(complete.error)}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
        <Text style={[styles.jobAmount, { color: stateColor }]}>
          {job.net_cents == null ? '—' : formatAud(job.net_cents)}
        </Text>
        {state === 'awaiting' && job.completed_at == null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark job complete and release payout"
            disabled={complete.isPending}
            onPress={() => complete.mutate({ quoteId: job.quote_id })}
            style={[styles.releaseBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.releaseText, { color: colors.accentInk }]}>
              {complete.isPending ? 'RELEASING…' : 'JOB COMPLETE'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PayoutsScreen() {
  const { colors } = useTheme();
  const query = useApiQuery(PAYOUTS_KEY, '/api/tenant/payouts', PayoutsSchema);
  const start = useApiMutation<Record<string, never>, z.infer<typeof StartSchema>>(
    '/api/stripe/connect/start',
    StartSchema,
    { timeoutMs: 30000, onSuccess: result => void Linking.openURL(result.url) },
  );

  const account = query.data?.account;
  const jobs = query.data?.jobs ?? [];
  const ready = account?.payouts_enabled === true;

  return (
    <SectionScreen
      title="Payouts"
      subtitle="Customer deposits, the 2% platform fee, and where the rest lands."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isPending ? (
        <Notice tone="accent" label="Loading payouts…" />
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
                onPress={() => start.mutate({})}
                style={({ pressed }) => [
                  styles.startBtn,
                  { backgroundColor: pressed ? colors.accentPress : colors.accent },
                ]}
              >
                <Text style={[styles.releaseText, { color: colors.accentInk }]}>
                  {start.isPending ? 'OPENING STRIPE…' : 'CONTINUE WITH STRIPE →'}
                </Text>
              </Pressable>
              {start.isError ? (
                <Text style={[styles.jobMeta, { color: colors.dangerBright }]}>
                  {apiErrorMessage(start.error)}
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
                {account?.bank?.bank_name ?? 'Bank connected'}
                {account?.bank?.last4 ? ` ····${account.bank.last4}` : ''}
              </Text>
              {account?.balance ? (
                <Text style={[styles.jobMeta, { color: colors.textSec }]}>
                  AVAILABLE {formatAud(account.balance.available_cents ?? 0)} · PENDING{' '}
                  {formatAud(account.balance.pending_cents ?? 0)}
                </Text>
              ) : null}
            </View>
          )}

          <Text style={[styles.groupLabel, { color: colors.textDim }]}>
            DEPOSITS · {jobs.length}
          </Text>
          {jobs.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textDim }]}>
              No deposits yet — they appear the moment a customer pays on a quote.
            </Text>
          ) : (
            jobs.map(job => <JobRow key={job.quote_id} job={job} />)
          )}
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  empty: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 19 },
  startBtn: {
    minHeight: touch.primaryCta,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: radius.control,
    paddingHorizontal: spacing.xl,
  },
  accountCard: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  bankLine: { fontFamily: fonts.sans.bold, fontSize: 15 },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  jobName: { fontFamily: fonts.sans.bold, fontSize: 14 },
  jobMeta: { marginTop: 2, fontFamily: fonts.mono.medium, fontSize: 10, letterSpacing: 0.6 },
  jobAmount: { fontFamily: fonts.mono.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  releaseBtn: {
    minHeight: touch.minimum - 16,
    justifyContent: 'center',
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
  },
  releaseText: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 0.8 },
});
