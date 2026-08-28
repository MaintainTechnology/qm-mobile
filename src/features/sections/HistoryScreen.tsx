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
import { SectionScreen } from './SectionScreen';

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
            ? 'Nothing to calibrate yet — needs at least 3 confirmed quotes per job type.'
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
      <Text style={[styles.groupLabel, { color: colors.textDim }]}>PRICING CALIBRATION</Text>
      <Text style={[styles.body, { color: colors.textSec }]}>
        Turn your confirmed history into pricing-book rates. Prices are computed on the server from
        your own quotes — nothing here invents a number.
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
                style={[styles.proposalRow, { borderColor: on ? colors.accent : colors.inkLine }]}
              >
                <Text style={[styles.proposalName, { color: colors.textPri }]} numberOfLines={1}>
                  {on ? '☑' : '☐'} {p.name ?? formatJobType(p.job_type)}
                </Text>
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
      subtitle="Your own past pricing — imported, analysed and feeding every hint."
      refreshing={stats.isFetching || browse.isFetching}
      onRefresh={() => {
        void stats.refetch();
        void browse.refetch();
      }}
    >
      {stats.isPending ? (
        <Notice tone="accent" label="Loading your history…" />
      ) : stats.isError && !stats.data ? (
        <Notice
          tone="danger"
          label="Could not load history"
          body={apiErrorMessage(stats.error)}
          onRetry={() => void stats.refetch()}
        />
      ) : rows.length === 0 ? (
        <Notice
          tone="accent"
          label="No history yet"
          body="Import past quotes or invoices (CSV or PDF) on the web — the averages then power YOUR HISTORY hints on every draft."
        />
      ) : (
        <>
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>
            BY JOB TYPE · {rows.length}
          </Text>
          {rows.map(row => (
            <View
              key={row.job_type}
              style={[
                styles.card,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              <View style={styles.statTop}>
                <Text style={[styles.statName, { color: colors.textPri }]} numberOfLines={1}>
                  {formatJobType(row.job_type)}
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

          <CalibrationCard />

          <Text style={[styles.groupLabel, { color: colors.textDim }]}>BROWSE</Text>
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
          {quotes.map(q => (
            <View key={q.id} style={[styles.browseRow, { borderBottomColor: colors.inkLine }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.statName, { color: colors.textPri }]} numberOfLines={1}>
                  {formatJobType(q.job_type)}
                </Text>
                <Text style={[styles.proposalMeta, { color: colors.textDim }]} numberOfLines={1}>
                  {[q.quoted_at?.slice(0, 10), q.raw_description].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[styles.statAvg, { color: colors.textPri }]}>
                {historyPriceLabel(q.price_inc_gst)}
              </Text>
            </View>
          ))}
        </>
      )}

      <LinkOutButton label="Import CSV / PDF on the web" path="/dashboard?tab=historical-quotes" />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  body: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 19 },
  btn: {
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: radius.control,
    paddingHorizontal: spacing.xl,
  },
  btnText: { fontFamily: fonts.mono.bold, fontSize: 11, letterSpacing: 0.88 },
  proposalRow: {
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.md,
    gap: 3,
    minHeight: touch.minimum,
    justifyContent: 'center',
  },
  proposalName: { fontFamily: fonts.sans.semiBold, fontSize: 13.5 },
  proposalMeta: { fontFamily: fonts.mono.medium, fontSize: 11, fontVariant: ['tabular-nums'] },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  statName: { flex: 1, fontFamily: fonts.sans.bold, fontSize: 14 },
  statAvg: { fontFamily: fonts.mono.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  search: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.mono.regular,
    fontSize: 12,
  },
  browseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});
