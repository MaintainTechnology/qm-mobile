/**
 * History — the web HistoricalQuotesTab at mobile scope. Native: the per-job
 * analytics table (GET /api/tenant/historical-quotes/analytics), browse with
 * search (GET /api/tenant/historical-quotes?q=), and pricing calibration
 * (POST calibration/preview → select → calibration/apply; prices recomputed
 * server-side — the client can never smuggle one). The CSV/PDF import and its
 * review cycle are upload-bound and stay on the web.
 *
 * Money on this wire is DOLLARS (2-dp floats, web parity) → cents at render.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { formatJobType } from '@/features/quotes/status';
import { LinkOutButton } from '@/features/trades/hub/LinkOut';
import { apiErrorMessage } from '@/lib/api';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionEmpty, SectionGroup, SectionLoading, SectionScreen } from './SectionScreen';

const StatsSchema = z.looseObject({
  analytics: z
    .array(
      z.looseObject({
        job_type: z.string(),
        trade: z.string().nullish(),
        count: z.number(),
        avg_price_inc_gst: z.number().nullish(),
        min_price_inc_gst: z.number().nullish(),
        max_price_inc_gst: z.number().nullish(),
        most_recent_quoted_at: z.string().nullish(),
      }),
    )
    .default([]),
});

const BrowseSchema = z.looseObject({
  quotes: z
    .array(
      z.looseObject({
        id: z.string(),
        job_type: z.string().nullish(),
        raw_description: z.string().nullish(),
        quoted_at: z.string().nullish(),
        price_inc_gst: z.number().nullish(),
        source_kind: z.string().nullish(),
      }),
    )
    .default([]),
});

const ProposalSchema = z.looseObject({
  job_type: z.string(),
  trade: z.string().nullish(),
  name: z.string().nullish(),
  proposed_unit_price_ex_gst: z.number().nullish(),
  sample_count: z.number().nullish(),
  existing_price_ex_gst: z.number().nullish(),
  is_new: z.boolean().nullish(),
});
type Proposal = z.infer<typeof ProposalSchema>;

const PreviewSchema = z.looseObject({ proposals: z.array(ProposalSchema).default([]) });
const ApplySchema = z.looseObject({ ok: z.literal(true), applied: z.number().nullish() });

const money = (dollars: number | null | undefined) =>
  dollars == null ? '—' : formatAud(centsFromApiDollars(dollars));

export const historyPriceLabel = (dollars: number | null | undefined) =>
  `${money(dollars)} inc GST`;

function CalibrationCard() {
  const { colors } = useTheme();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);

  const preview = useApiMutation<Record<string, never>, z.infer<typeof PreviewSchema>>(
    '/api/tenant/historical-quotes/calibration/preview',
    PreviewSchema,
    {
      timeoutMs: 30000,
      onSuccess: result => {
        setProposals(result.proposals);
        // Web parity: everything ticked by default.
        setSelected(new Set(result.proposals.map(p => p.job_type)));
        setNote(
          result.proposals.length === 0
            ? 'Nothing to calibrate yet. Add at least 3 confirmed quotes per job type.'
            : null,
        );
      },
      onError: err => setNote(apiErrorMessage(err)),
    },
  );
  const apply = useApiMutation<{ job_types: string[] }, z.infer<typeof ApplySchema>>(
    '/api/tenant/historical-quotes/calibration/apply',
    ApplySchema,
    {
      timeoutMs: 30000,
      onSuccess: result => {
        setNote(
          `Applied ${result.applied ?? selected.size} rate${(result.applied ?? 0) === 1 ? '' : 's'} to your pricing book ✓`,
        );
        setProposals(null);
      },
      onError: err => setNote(apiErrorMessage(err)),
    },
  );

  return (
    <View style={[styles.card, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.textPri }]}>
        PRICING CALIBRATION
      </Text>
      <Text style={[styles.body, { color: colors.textSec }]}>
        Review suggested rates from your confirmed quotes, then choose which to apply to your
        pricing book.
      </Text>

      {proposals == null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Preview calibration"
          disabled={preview.isPending}
          onPress={() => {
            setNote(null);
            preview.mutate({});
          }}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: pressed ? colors.accentPress : colors.accent },
          ]}
        >
          <Text style={[styles.btnText, { color: colors.accentInk }]}>
            {preview.isPending ? 'CHECKING…' : 'PREVIEW PROPOSALS'}
          </Text>
        </Pressable>
      ) : (
        <>
          {proposals.map(p => {
            const on = selected.has(p.job_type);
            return (
              <Pressable
                key={p.job_type}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() =>
                  setSelected(prev => {
                    const next = new Set(prev);
                    if (next.has(p.job_type)) next.delete(p.job_type);
                    else next.add(p.job_type);
                    return next;
                  })
                }
                style={[
                  styles.proposalRow,
                  { borderColor: on ? colors.accentSoft : colors.ctlLine },
                ]}
              >
                <View style={styles.proposalHeading}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: on ? colors.accentSoft : colors.ctlLine },
                    ]}
                  >
                    <Text
                      accessible={false}
                      style={[styles.checkmark, { color: colors.accentText }]}
                    >
                      {on ? '✓' : ''}
                    </Text>
                  </View>
                  <Text style={[styles.proposalName, { color: colors.textPri }]}>
                    {p.name ?? formatJobType(p.job_type)}
                  </Text>
                </View>
                <Text style={[styles.proposalMeta, { color: colors.textSec }]}>
                  {money(p.proposed_unit_price_ex_gst)} ex GST · {p.sample_count ?? 0} jobs
                  {p.is_new
                    ? ' · NEW'
                    : p.existing_price_ex_gst != null
                      ? ` · was ${money(p.existing_price_ex_gst)}`
                      : ''}
                </Text>
              </Pressable>
            );
          })}
          {proposals.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apply to pricing book"
              disabled={selected.size === 0 || apply.isPending}
              onPress={() => apply.mutate({ job_types: [...selected] })}
              style={({ pressed }) => [
                styles.btn,
                {
                  opacity: selected.size === 0 ? 0.45 : 1,
                  backgroundColor: pressed ? colors.accentPress : colors.accent,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.accentInk }]}>
                {apply.isPending ? 'APPLYING…' : `APPLY ${selected.size} TO PRICING BOOK`}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
      {note ? <Text style={[styles.body, { color: colors.textSec }]}>{note}</Text> : null}
    </View>
  );
}

export function HistoryScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const stats = useApiQuery(
    ['tenant', 'history', 'analytics'],
    '/api/tenant/historical-quotes/analytics',
    StatsSchema,
  );
  const browsePath = useMemo(
    () =>
      search.trim()
        ? `/api/tenant/historical-quotes?q=${encodeURIComponent(search.trim())}`
        : '/api/tenant/historical-quotes',
    [search],
  );
  const browse = useApiQuery(['tenant', 'history', 'browse', browsePath], browsePath, BrowseSchema);

  const rows = stats.data?.analytics ?? [];
  const quotes = (browse.data?.quotes ?? []).slice(0, 30);

  return (
    <SectionScreen
      title="History"
      subtitle="Review past quotes and use your history to refine your pricing."
      refreshing={stats.isFetching || browse.isFetching}
      onRefresh={() => {
        void stats.refetch();
        void browse.refetch();
      }}
    >
      {stats.isPending ? (
        <SectionLoading label="Loading your history" />
      ) : stats.isError && !stats.data ? (
        <Notice
          tone="danger"
          label="Could not load history"
          body={apiErrorMessage(stats.error)}
          onRetry={() => void stats.refetch()}
        />
      ) : rows.length === 0 ? (
        <SectionEmpty
          title="No quote history yet"
          body="Import past quotes or invoices on the web to see your averages and pricing hints here."
        />
      ) : (
        <>
          <SectionGroup title="By job type" count={rows.length}>
            {rows.map(row => (
              <View
                key={row.job_type}
                style={[
                  styles.card,
                  { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
                ]}
              >
                <View style={styles.statTop}>
                  <Text style={[styles.statName, { color: colors.textPri }]}>
                    {formatJobType(row.job_type)}
                  </Text>
                  <Text style={[styles.averageLabel, { color: colors.textDim }]}>
                    AVERAGE QUOTE
                  </Text>
                  <Text style={[styles.statAvg, { color: colors.textPri }]}>
                    {historyPriceLabel(row.avg_price_inc_gst)}
                  </Text>
                </View>
                <Text style={[styles.proposalMeta, { color: colors.textSec }]}>
                  {row.count} {row.count === 1 ? 'job' : 'jobs'} · {money(row.min_price_inc_gst)}–
                  {money(row.max_price_inc_gst)} inc GST
                </Text>
              </View>
            ))}
          </SectionGroup>

          <CalibrationCard />

          <SectionGroup title="Recent quotes" count={quotes.length}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search descriptions…"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              accessibilityLabel="Search history"
              style={[
                styles.search,
                {
                  borderColor: colors.ctlLine,
                  backgroundColor: colors.inkCard,
                  color: colors.textPri,
                },
              ]}
            />
            {browse.isPending ? (
              <SectionLoading label="Loading matching quotes" />
            ) : browse.isError && !browse.data ? (
              <Notice
                tone="danger"
                label="Could not load quotes"
                body={apiErrorMessage(browse.error)}
                onRetry={() => void browse.refetch()}
              />
            ) : quotes.length === 0 ? (
              <SectionEmpty
                title={search.trim() ? 'No matching quotes' : 'No quotes to browse'}
                body={
                  search.trim()
                    ? 'Try a different job type or description.'
                    : 'Your imported quotes will appear here.'
                }
              />
            ) : (
              quotes.map(q => (
                <View key={q.id} style={[styles.browseRow, { borderBottomColor: colors.inkLine }]}>
                  <View style={{ minWidth: 0, gap: spacing.xs }}>
                    <Text style={[styles.statName, { color: colors.textPri }]} numberOfLines={2}>
                      {formatJobType(q.job_type)}
                    </Text>
                    <Text
                      style={[styles.proposalMeta, { color: colors.textDim }]}
                      numberOfLines={2}
                    >
                      {[q.quoted_at?.slice(0, 10), q.raw_description].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={[styles.statAvg, { color: colors.textPri }]}>
                    {historyPriceLabel(q.price_inc_gst)}
                  </Text>
                </View>
              ))
            )}
          </SectionGroup>
        </>
      )}

      <LinkOutButton label="Import CSV / PDF on the web" path="/dashboard?tab=historical-quotes" />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: fonts.sans.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 },
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.md,
  },
  body: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 22 },
  btn: {
    minHeight: touch.primaryCta,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  btnText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  proposalRow: {
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: touch.minimum,
    justifyContent: 'center',
  },
  proposalHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
  proposalName: { flex: 1, fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  proposalMeta: {
    fontFamily: fonts.mono.regular,
    fontSize: 12,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  statTop: { gap: spacing.sm },
  statName: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
  averageLabel: {
    marginTop: spacing.sm,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  statAvg: {
    fontFamily: fonts.mono.bold,
    fontSize: 18,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  search: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  browseRow: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
});
