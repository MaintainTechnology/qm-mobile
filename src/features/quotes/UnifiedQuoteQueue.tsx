import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GhostButton } from '@/features/auth/ui';
import { Card, Notice, PillOption } from '@/features/trades/ui';
import {
  defaultQueueCriteria,
  filterAndSortQueue,
  mergeQueueEntries,
  presentQueueTrades,
  QUEUE_FILTERS,
  QUEUE_SORTS,
  queueStatusCounts,
  queueTimeZone,
  TradeJobsSchema,
  validateQueueDateRange,
  type QueueCriteria,
  type QueueFilter,
  type TradeJob,
} from '@/features/trades/hub/quote-queue';
import { apiErrorMessage } from '@/lib/api';
import { apiUrl } from '@/lib/env';
import { tenantTrades, useTenantMe } from '@/lib/tenant';
import { fonts, spacing, touch, type } from '@/lib/theme';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { QuoteDetailModal } from './QuoteDetailModal';
import { QuoteRow } from './QuoteRow';
import { quoteAge } from './status';

export function useQuoteQueueSources() {
  const me = useTenantMe();
  const jobs = useApiQuery(['tenant', 'trade-jobs'], '/api/tenant/trade-jobs', TradeJobsSchema, {
    enabled: !!me.data?.tenant.id,
  });
  const trades = useMemo(() => (me.data ? tenantTrades(me.data) : []), [me.data]);
  const entries = useMemo(
    () => mergeQueueEntries(me.data?.quotes ?? [], jobs.data?.jobs ?? [], trades),
    [me.data, jobs.data, trades],
  );
  return { me, jobs, trades, entries };
}

/** Trade reader packages replace this retained source-specific result handoff. */
export function SavedJobQueueRow({ job }: { job: TradeJob }) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const label =
    job.status === 'confirmed'
      ? 'Confirmed'
      : job.status === 'draft'
        ? 'Awaiting your review'
        : job.status === 'inspection'
          ? 'Inspection required'
          : job.status || 'Status unavailable';
  const path = job.tradieHref || job.href;
  const safePath =
    path?.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : null;
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open saved job, ${job.address || job.headline || job.id}, ${label}`}
        disabled={!safePath}
        style={styles.job}
        onPress={() => {
          if (!safePath) return;
          setError(null);
          void Linking.openURL(apiUrl(safePath)).catch(() =>
            setError('Could not open this saved job. Try again.'),
          );
        }}
      >
        <Text style={[type.body, { color: colors.textPri, fontFamily: fonts.sans.semiBold }]}>
          {job.address || 'Saved job'}
        </Text>
        {job.headline ? (
          <Text style={[type.bodySm, { color: colors.textSec }]}>{job.headline}</Text>
        ) : null}
        <Text style={[type.bodySm, { color: colors.textDim }]}>
          {job.trade.replace(/[_-]/g, ' ')} · {label}
          {job.createdAt ? ` · ${quoteAge(job.createdAt)}` : ''}
        </Text>
        <Text style={[type.bodySm, { color: colors.textDim }]}>
          {safePath ? 'Open saved result' : 'Saved result link unavailable'}
        </Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.warningBright }}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

export function UnifiedQuoteQueue({
  contextTrade = 'all',
  quoteId,
  initialFilter,
  onCloseDetail,
}: {
  contextTrade?: string;
  quoteId?: string;
  initialFilter?: string;
  onCloseDetail?: () => void;
}) {
  const { colors } = useTheme();
  const { me, jobs, trades, entries } = useQuoteQueueSources();
  const zone = queueTimeZone(undefined, me.data?.tenant.state);
  const [criteria, setCriteria] = useState(() => defaultQueueCriteria(contextTrade, zone));
  const [selectedId, setSelectedId] = useState<string | null>(quoteId ?? null);
  const [visible, setVisible] = useState(30);
  useEffect(() => {
    if (quoteId) setSelectedId(quoteId);
  }, [quoteId]);
  useEffect(() => {
    setCriteria({
      ...defaultQueueCriteria(contextTrade, zone),
      status: QUEUE_FILTERS.some(item => item.key === initialFilter)
        ? (initialFilter as QueueFilter)
        : 'all',
    });
    setVisible(30);
  }, [contextTrade, zone, me.data?.tenant.id, initialFilter]);
  const active = { ...criteria, timeZone: zone };
  const rows = filterAndSortQueue(entries, active);
  const counts = queueStatusCounts(entries, active);
  const dateRange = validateQueueDateRange(criteria.from, criteria.to);
  const tradeOptions = presentQueueTrades(entries, trades);
  const selected = me.data?.quotes.find(item => item.id === selectedId) ?? null;
  function update<K extends keyof QueueCriteria>(key: K, value: QueueCriteria[K]) {
    setCriteria(old => ({ ...old, [key]: value }));
    setVisible(30);
  }
  function clear() {
    setCriteria(defaultQueueCriteria(contextTrade, zone));
    setVisible(30);
  }
  const fieldStyle = [styles.input, { color: colors.textPri, borderColor: colors.ctlLine }];
  return (
    <View style={styles.body}>
      <TextInput
        accessibilityLabel="Search quotes and saved jobs"
        placeholder="Search name, suburb, job or code"
        placeholderTextColor={colors.textDim}
        style={fieldStyle}
        value={criteria.search}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={value => update('search', value)}
      />
      <ScrollView
        horizontal
        contentContainerStyle={styles.rail}
        accessibilityRole="radiogroup"
        accessibilityLabel="Queue status"
      >
        {QUEUE_FILTERS.map(item => (
          <PillOption
            key={item.key}
            label={`${item.label} (${counts[item.key]})`}
            selected={criteria.status === item.key}
            onPress={() => update('status', item.key)}
          />
        ))}
      </ScrollView>
      {tradeOptions.length > 0 ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.rail}
          accessibilityRole="radiogroup"
          accessibilityLabel="Queue trade"
        >
          <PillOption
            label="All trades"
            selected={criteria.trade === 'all'}
            onPress={() => update('trade', 'all')}
          />
          {tradeOptions.map(trade => (
            <PillOption
              key={trade}
              label={trade.replace(/_/g, ' ')}
              selected={criteria.trade === trade}
              onPress={() => update('trade', trade)}
            />
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.dates}>
        {(['from', 'to'] as const).map(key => (
          <View key={key} style={styles.date}>
            <Text style={[type.bodySm, { color: colors.textSec }]}>
              {key === 'from' ? 'From' : 'To'} · YYYY-MM-DD
            </Text>
            <TextInput
              accessibilityLabel={`${key === 'from' ? 'From' : 'To'} date, YYYY-MM-DD`}
              value={criteria[key]}
              onChangeText={value => update(key, value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
              maxLength={10}
              autoCorrect={false}
              autoCapitalize="none"
              style={fieldStyle}
            />
            {dateRange[`${key}Error`] ? (
              <Text accessibilityRole="alert" style={{ color: colors.warningBright }}>
                {dateRange[`${key}Error`]}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      {!dateRange.valid ? (
        <Text style={[type.bodySm, { color: colors.warningBright }]}>
          Date filtering is paused until the range is valid.
        </Text>
      ) : null}
      <Text style={[type.bodySm, { color: colors.textDim }]}>
        Dates use {zone.replace(/_/g, ' ')}.
      </Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.rail}
        accessibilityRole="radiogroup"
        accessibilityLabel="Queue sort"
      >
        {QUEUE_SORTS.map(item => (
          <PillOption
            key={item.key}
            label={item.label}
            selected={criteria.sort === item.key}
            onPress={() => update('sort', item.key)}
          />
        ))}
      </ScrollView>
      <View style={styles.dates}>
        <GhostButton label="Clear filters" onPress={clear} />
        <GhostButton
          label="Refresh both sources"
          onPress={() => {
            void me.refetch();
            void jobs.refetch();
          }}
        />
      </View>
      {me.isPending ? <Notice tone="accent" label="Loading quotes…" /> : null}
      {jobs.isPending && !!me.data ? <Notice tone="accent" label="Loading saved jobs…" /> : null}
      {me.isError ? (
        <Notice
          tone="warn"
          label={
            me.data ? 'Quotes could not refresh; showing saved results' : 'Quotes could not load'
          }
          body={apiErrorMessage(me.error)}
          onRetry={() => void me.refetch()}
        />
      ) : null}
      {jobs.isError ? (
        <Notice
          tone="warn"
          label={
            jobs.data
              ? 'Saved jobs could not refresh; showing saved results'
              : 'Saved jobs could not load; the queue is incomplete'
          }
          body={apiErrorMessage(jobs.error)}
          onRetry={() => void jobs.refetch()}
        />
      ) : null}
      <Text accessibilityLiveRegion="polite" style={[type.bodySm, { color: colors.textSec }]}>
        {rows.length} {rows.length === 1 ? 'result' : 'results'}
        {me.isError || jobs.isError || jobs.isPending ? ' · incomplete sources' : ''}
      </Text>
      {rows
        .slice(0, visible)
        .map(entry =>
          entry.kind === 'quote' ? (
            <QuoteRow
              key={entry.key}
              quote={entry.quote}
              onPress={() => setSelectedId(entry.quote.id)}
            />
          ) : (
            <SavedJobQueueRow key={entry.key} job={entry.job} />
          ),
        )}
      {rows.length > visible ? (
        <GhostButton
          label={`Load more (${rows.length - visible} remaining)`}
          onPress={() => setVisible(old => old + 30)}
        />
      ) : null}
      {!me.isPending && rows.length === 0 ? (
        <Notice
          tone="accent"
          label="No results in this view"
          body="Change the filters or clear them to return to this workspace."
        />
      ) : null}
      {selectedId && !selected && !me.isPending ? (
        <Notice
          tone="warn"
          label="This quote is not in the loaded account results"
          body="Refresh this account's quotes. The quote may have been removed or may need a dedicated owned-record read."
          onRetry={() => void me.refetch()}
        />
      ) : null}
      <QuoteDetailModal
        quote={selected}
        onClose={() => {
          setSelectedId(null);
          onCloseDetail?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  rail: { gap: spacing.sm, paddingVertical: spacing.xs },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  date: { flexGrow: 1, flexBasis: 145, gap: spacing.xs },
  input: {
    ...type.body,
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  job: { minHeight: touch.minimum, gap: spacing.sm },
});
