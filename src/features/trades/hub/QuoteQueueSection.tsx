/**
 * Quote queue — the hub's Quotes section, mirroring the web QuotesTab
 * (page.tsx:8406-8874): search, the web's five status filters with live
 * counts, its four sorts, and the same merged queue of pipeline quotes plus
 * measure-tool jobs from /api/tenant/trade-jobs. The web's side-by-side
 * master–detail collapses to list → sheet on a phone; its native date-range
 * inputs are a deliberate mobile cut (no system date field in RN this round).
 */
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { QuoteDetailModal } from '@/features/quotes/QuoteDetailModal';
import { QuoteRow } from '@/features/quotes/QuoteRow';
import { quoteAge } from '@/features/quotes/status';
import { apiUrl } from '@/lib/env';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTenantMe, type QuoteRow as QuoteRowData } from '@/lib/tenant';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import {
  compareQuotes,
  parseSearchTerms,
  QUEUE_FILTERS,
  QUEUE_SORTS,
  queueMatchesFilter,
  quoteMatchesSearch,
  TRADE_LABELS,
  type HubTrade,
  type QueueFilter,
  type QueueSort,
} from './sections';

// ── Measure-tool jobs (web savedJobsMode: these hubs merge trade-jobs) ──────

const MEASURE_TRADES: Record<string, string> = {
  roofing: 'roofing',
  solar: 'solar',
  painting: 'painting',
  commercial_painting: 'commercial-painting',
  aircon: 'aircon',
};

const TradeJobsSchema = z.looseObject({
  jobs: z
    .array(
      z.looseObject({
        id: z.string(),
        trade: z.string(),
        address: z.string().nullish(),
        headline: z.string().nullish(),
        status: z.enum(['confirmed', 'inspection', 'draft']).nullish(),
        href: z.string().nullish(),
        tradieHref: z.string().nullish(),
        createdAt: z.string().nullish(),
      }),
    )
    .default([]),
});
type TradeJob = z.infer<typeof TradeJobsSchema>['jobs'][number];

/** Web jobMatchesFilter (quote-queue.ts:57-62): confirmed rows only surface on All. */
function jobMatchesFilter(job: TradeJob, filter: QueueFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'review') return job.status === 'draft';
  if (filter === 'inspect') return job.status === 'inspection';
  return false;
}

/** Web jobBadge (page.tsx:9127-9131). */
function jobBadge(job: TradeJob): { label: string; tone: 'ok' | 'warn' | 'dim' } {
  if (job.status === 'confirmed') return { label: 'Confirmed', tone: 'ok' };
  if (job.status === 'inspection') return { label: 'Inspection required', tone: 'dim' };
  return { label: 'Awaiting your review', tone: 'warn' };
}

function JobRow({ job, hubTrade }: { job: TradeJob; hubTrade: HubTrade }) {
  const { colors } = useTheme();
  const badge = jobBadge(job);
  const tone =
    badge.tone === 'ok'
      ? colors.successBright
      : badge.tone === 'warn'
        ? colors.warningBright
        : colors.textDim;
  const href = job.tradieHref ?? job.href;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.address ?? 'Saved job'}, ${badge.label}`}
      disabled={!href}
      onPress={() => {
        if (href) void Linking.openURL(apiUrl(href));
      }}
      style={({ pressed }) => [
        styles.jobRow,
        {
          borderBottomColor: colors.inkLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
        },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.jobName, { color: colors.textPri }]} numberOfLines={1}>
          {job.address ?? '—'}
        </Text>
        {job.headline ? (
          <Text style={[styles.jobHeadline, { color: colors.textSec }]} numberOfLines={1}>
            {job.headline}
          </Text>
        ) : null}
        <Text style={[styles.jobMeta, { color: colors.textDim }]} numberOfLines={1}>
          {job.createdAt ? `${quoteAge(job.createdAt)} · ` : ''}
          {TRADE_LABELS[hubTrade]} · Measure tool
        </Text>
      </View>
      <View style={[styles.jobChip, { borderColor: tone }]}>
        <View style={[styles.jobChipDot, { backgroundColor: tone }]} />
        <Text style={[styles.jobChipText, { color: tone }]} numberOfLines={1}>
          {badge.label.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

// ── The queue ───────────────────────────────────────────────────────────────

export function QuoteQueueSection({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const me = useTenantMe();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [sort, setSort] = useState<QueueSort>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const jobsMode = MEASURE_TRADES[trade] ?? null;
  const tradeJobs = useApiQuery(
    ['tenant', 'trade-jobs'],
    '/api/tenant/trade-jobs',
    TradeJobsSchema,
    { enabled: jobsMode != null },
  );

  // Hub scope first (web: q.trade === tradeFilter), then search/filter/sort.
  const scoped = useMemo(
    () => (me.data?.quotes ?? []).filter(q => (q.trade ?? '').toLowerCase() === trade),
    [me.data, trade],
  );
  const terms = useMemo(() => parseSearchTerms(search), [search]);
  const filtered = useMemo(
    () =>
      scoped
        .filter(q => queueMatchesFilter(q, filter) && quoteMatchesSearch(q, terms))
        .sort((a, b) => compareQuotes(a, b, sort)),
    [scoped, filter, terms, sort],
  );
  const jobs = useMemo(() => {
    if (!jobsMode) return [];
    return (tradeJobs.data?.jobs ?? []).filter(
      j => j.trade === jobsMode && jobMatchesFilter(j, filter),
    );
  }, [tradeJobs.data, jobsMode, filter]);

  const filtersActive = search.trim() !== '' || filter !== 'all';
  const sortLabel = QUEUE_SORTS.find(s => s.key === sort)?.label ?? '';
  const selected: QuoteRowData | null =
    (selectedId && scoped.find(q => q.id === selectedId)) || null;

  /** Live counts on the status options, as the web FilterSelect shows them. */
  function filterCount(key: QueueFilter): number {
    return scoped.filter(q => queueMatchesFilter(q, key)).length;
  }

  return (
    <View style={[styles.shell, { borderColor: colors.inkLine, backgroundColor: colors.inkDeep }]}>
      {/* Toolbar — search, status, sort (web one-row toolbar, stacked for a phone). */}
      <View style={[styles.toolbar, { borderBottomColor: colors.inkLine }]}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, suburb, job, code…"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search quotes"
          style={[
            styles.search,
            {
              borderColor: colors.ctlLine,
              backgroundColor: colors.inkCard,
              color: colors.textPri,
            },
          ]}
        />
        <View style={styles.chipRow}>
          {QUEUE_FILTERS.map(option => {
            const active = filter === option.key;
            const count = filterCount(option.key);
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${option.label}, ${count} quotes`}
                onPress={() => setFilter(option.key)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: active ? colors.accent : colors.inkLine,
                    backgroundColor: active ? colors.accent : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? colors.accentInk : colors.textSec },
                  ]}
                >
                  {option.label.toUpperCase()} {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: colors.textDim }]}>SORT</Text>
          {QUEUE_SORTS.map(option => {
            const active = sort === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSort(option.key)}
                style={[styles.sortChip, { borderColor: active ? colors.accent : colors.inkLine }]}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    { color: active ? colors.accentText : colors.textDim },
                  ]}
                >
                  {option.label.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
          {filtersActive ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear filters"
              onPress={() => {
                setSearch('');
                setFilter('all');
              }}
              style={styles.clear}
            >
              <Text style={[styles.sortChipText, { color: colors.accentText }]}>CLEAR FILTERS</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Queue header strip — "Quote queue · N" + active sort (web parity). */}
      <View style={[styles.queueHeader, { borderBottomColor: colors.inkLine }]}>
        <Text style={[styles.queueTitle, { color: colors.textSec }]}>
          QUOTE QUEUE · {filtered.length + jobs.length}
        </Text>
        <Text style={[styles.queueSort, { color: colors.textDim }]}>{sortLabel.toUpperCase()}</Text>
      </View>

      {filtered.length === 0 && jobs.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textDim }]}>
          {filtersActive
            ? 'No quotes match these filters.'
            : 'No quotes yet — they land here the moment QuoteMax drafts one.'}
        </Text>
      ) : (
        <>
          {filtered.map(q => (
            <QuoteRow key={q.id} quote={q} onPress={() => setSelectedId(q.id)} />
          ))}
          {jobs.map(j => (
            <JobRow key={`job-${j.id}`} job={j} hubTrade={trade} />
          ))}
        </>
      )}

      <QuoteDetailModal quote={selected} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  toolbar: { padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1 },
  search: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.mono.regular,
    fontSize: 12,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterChip: {
    minHeight: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterChipText: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 1 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  sortLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
    marginRight: 2,
  },
  sortChip: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortChipText: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 1 },
  clear: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  queueTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  queueSort: {
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
  },
  empty: {
    padding: spacing.lg,
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.listRow,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  jobName: { fontFamily: fonts.sans.bold, fontSize: 14.5, lineHeight: 18 },
  jobHeadline: { marginTop: 3, fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 17 },
  jobMeta: {
    marginTop: 4,
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  jobChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: 4,
    paddingHorizontal: 7,
    maxWidth: 150,
  },
  jobChipDot: { width: 4, height: 4, borderRadius: 2 },
  jobChipText: { fontFamily: fonts.mono.bold, fontSize: 12, letterSpacing: 0.4 },
});
