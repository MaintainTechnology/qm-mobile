/**
 * Quote queue — the hub's Quotes section, mirroring the web QuotesTab
 * (page.tsx:8406-8874): search, the web's five status filters with live
 * counts, its four sorts, and the same merged queue of pipeline quotes plus
 * measure-tool jobs from /api/tenant/trade-jobs. The web's side-by-side
 * master–detail collapses to list → sheet on a phone; its native date-range
 * inputs are a deliberate mobile cut (no system date field in RN this round).
 */
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { ChevronLeftIcon } from '@/features/auth/ui';
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
          borderColor: colors.inkLine,
          backgroundColor: pressed ? colors.ink : colors.inkCard,
        },
      ]}
    >
      <View style={{ minWidth: 0 }}>
        <Text style={[styles.jobName, { color: colors.textPri }]} numberOfLines={2}>
          {job.address ?? '—'}
        </Text>
        {job.headline ? (
          <Text style={[styles.jobHeadline, { color: colors.textSec }]} numberOfLines={2}>
            {job.headline}
          </Text>
        ) : null}
        <Text style={[styles.jobMeta, { color: colors.textDim }]}>
          {job.createdAt ? `${quoteAge(job.createdAt)} · ` : ''}
          {TRADE_LABELS[hubTrade]} · Measure tool
        </Text>
      </View>
      <View style={[styles.jobChip, { borderColor: tone }]}>
        <View style={[styles.jobChipDot, { backgroundColor: tone }]} />
        <Text style={[styles.jobChipText, { color: tone }]}>{badge.label.toUpperCase()}</Text>
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
  const [sortOpen, setSortOpen] = useState(false);
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
    <View style={styles.shell}>
      {/* Keep search and status close; reveal less-used sorting only on demand. */}
      <View
        style={[styles.toolbar, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}
      >
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          accessibilityLabel="Filter quotes by status"
          accessibilityRole="tablist"
        >
          {QUEUE_FILTERS.map(option => {
            const active = filter === option.key;
            const count = filterCount(option.key);
            return (
              <Pressable
                key={option.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                aria-selected={active}
                accessibilityLabel={`${option.label}, ${count} quotes`}
                onPress={() => setFilter(option.key)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: active ? colors.ctlLine : colors.inkLine,
                    backgroundColor: active ? colors.ink : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? colors.textPri : colors.textSec },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.filterCount, { color: colors.textDim }]}>{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
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

      {/* Queue header strip — "Quote queue · N" + active sort (web parity). */}
      <View style={[styles.queueHeader, { borderBottomColor: colors.inkLine }]}>
        <Text accessibilityRole="header" style={[styles.queueTitle, { color: colors.textSec }]}>
          Quote queue · {filtered.length + jobs.length}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort quotes: ${sortLabel}`}
          accessibilityState={{ expanded: sortOpen }}
          aria-expanded={sortOpen}
          onPress={() => setSortOpen(open => !open)}
          style={({ pressed }) => [
            styles.sortToggle,
            {
              borderColor: colors.inkLine,
              backgroundColor: pressed ? colors.inkCard : 'transparent',
            },
          ]}
        >
          <Text style={[styles.sortChipText, { color: colors.textSec }]}>{sortLabel}</Text>
          <View style={{ transform: [{ rotate: sortOpen ? '90deg' : '-90deg' }] }}>
            <ChevronLeftIcon size={14} color={colors.textDim} />
          </View>
        </Pressable>
      </View>

      {sortOpen ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Sort quotes"
          style={styles.sortRow}
        >
          {QUEUE_SORTS.map(option => {
            const active = sort === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: active }}
                aria-checked={active}
                onPress={() => {
                  setSort(option.key);
                  setSortOpen(false);
                }}
                style={[
                  styles.sortChip,
                  {
                    borderColor: active ? colors.ctlLine : colors.inkLine,
                    backgroundColor: active ? colors.inkCard : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[styles.sortChipText, { color: active ? colors.textPri : colors.textSec }]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {filtered.length === 0 && jobs.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textDim }]}>
          {filtersActive
            ? 'No quotes match these filters.'
            : 'No quotes yet — they land here the moment QuoteMax drafts one.'}
        </Text>
      ) : (
        <View style={styles.queueRows}>
          {filtered.map(q => (
            <QuoteRow key={q.id} quote={q} onPress={() => setSelectedId(q.id)} />
          ))}
          {jobs.map(j => (
            <JobRow key={`job-${j.id}`} job={j} hubTrade={trade} />
          ))}
        </View>
      )}

      <QuoteDetailModal quote={selected} onClose={() => setSelectedId(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: spacing.lg },
  toolbar: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderRadius: radius.card },
  queueRows: { gap: spacing.md },
  search: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  filterChip: {
    minHeight: touch.minimum,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterChipText: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  filterCount: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 18 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  sortToggle: {
    minHeight: touch.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  sortChip: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortChipText: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  clear: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  queueHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  queueTitle: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  empty: {
    paddingVertical: spacing.xl,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  jobRow: {
    alignItems: 'stretch',
    gap: spacing.md,
    minHeight: touch.listRow,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  jobName: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
  jobHeadline: {
    marginTop: spacing.xs,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  jobMeta: {
    marginTop: 4,
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.6,
  },
  jobChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: 4,
    paddingHorizontal: 7,
    maxWidth: '100%',
  },
  jobChipDot: { width: 4, height: 4, borderRadius: 2 },
  jobChipText: {
    flexShrink: 1,
    fontFamily: fonts.mono.bold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
});
