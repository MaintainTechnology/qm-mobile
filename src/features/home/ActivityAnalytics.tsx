/**
 * "Your activity" — native port of the web dashboard's analytics block
 * (app/dashboard/_components/OverviewAnalytics.tsx + app/_components/
 * MetricCharts.tsx), mounted as a HomeScreen section. Content matches the web
 * body: needs-attention actionables, headline counters, speed-to-quote, lead
 * funnel, weekly trends and channel / job-type splits — single column, the
 * web's flex-div bars redrawn as plain Views (no chart lib).
 *
 * Charts use warm neutral tokens so the dashboard's review action remains
 * the single yellow signal.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AnalyticsResponseSchema,
  DEFAULT_WEEKS,
  analyticsPath,
  barPercents,
  formatDuration,
  type TradieAnalytics,
} from '@/features/home/analytics';
import { Card, Notice } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

export function ActivityAnalytics() {
  const { colors } = useTheme();
  const query = useApiQuery(
    ['tenant', 'analytics', DEFAULT_WEEKS],
    analyticsPath(DEFAULT_WEEKS, new Date()),
    AnalyticsResponseSchema,
  );
  const analytics = query.data?.analytics;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textPri }]}>
          Your activity
        </Text>
        <Text style={[styles.sectionRange, { color: colors.textDim }]}>
          LAST {DEFAULT_WEEKS} WEEKS
        </Text>
      </View>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError && !analytics ? (
        // Only when nothing is cached — a failed refresh must never blank data
        // the tradie is part-way through reading.
        <Notice
          tone="warn"
          label="Couldn’t load your activity"
          body={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : analytics ? (
        <AnalyticsBody data={analytics} />
      ) : null}
    </View>
  );
}

// ─── Body ──────────────────────────────────────────────────────────────────

type CounterItem = readonly [label: string, value: number, hint: string];

function AnalyticsBody({ data }: { data: TradieAnalytics }) {
  const { colors } = useTheme();
  const h = data.headline;
  const isEmpty =
    h.totalRequests === 0 && h.totalQuotes === 0 && h.totalChats === 0 && h.totalCalls === 0;

  if (isEmpty) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={[styles.emptyTitle, { color: colors.textPri }]}>No activity yet</Text>
        <Text style={[styles.emptyBody, { color: colors.textDim }]}>
          Share your QuoteMax number to get started. Your messages, calls and quotes will appear
          here as they come in.
        </Text>
      </Card>
    );
  }

  // Labels and hints word-for-word from the web Counter grid.
  const counters: CounterItem[] = [
    ['People texting', h.peopleTexting, 'Unique numbers'],
    ['People calling', h.peopleCalling, 'Unique callers'],
    ['Chats', h.totalChats, 'SMS conversations'],
    ['Calls', h.totalCalls, 'Inbound calls'],
    ['Requests', h.totalRequests, 'Quote requests'],
    ['Quotes', h.totalQuotes, 'Generated'],
    ['Processed', h.processedQuotes, 'Auto-priced'],
    ['Customers', h.uniqueCustomers, 'Unique people'],
  ];
  const counterRows: CounterItem[][] = [];
  for (let i = 0; i < counters.length; i += 2) counterRows.push(counters.slice(i, i + 2));

  return (
    <View style={styles.stack}>
      <NeedsAttention data={data} />

      {/* Headline volumes — 1px gaps over the hairline colour draw the grid. */}
      <View
        style={[
          styles.counterGrid,
          { borderColor: colors.inkLine, backgroundColor: colors.inkLine },
        ]}
      >
        {counterRows.map((row, ri) => (
          <View key={ri} style={styles.counterRow}>
            {row.map(([label, value, hint]) => (
              <View key={label} style={[styles.counterCell, { backgroundColor: colors.inkCard }]}>
                <Text style={[styles.counterLabel, { color: colors.textDim }]}>
                  {label.toUpperCase()}
                </Text>
                <Text style={[styles.counterValue, { color: colors.textPri }]}>
                  {value.toLocaleString('en-AU')}
                </Text>
                <Text style={[styles.counterHint, { color: colors.textSec }]}>{hint}</Text>
              </View>
            ))}
            {row.length === 1 ? <View style={styles.counterCell} /> : null}
          </View>
        ))}
      </View>

      <SpeedCard minutes={data.speedToQuoteMinutes} />
      <SplitBars title="Lead funnel" slices={data.funnel} barColor={colors.textSec} />

      <TrendBars
        title="Requests / week"
        points={data.weeklyTrend.map(w => ({ label: w.label, value: w.intakes }))}
        barColor={colors.textSec}
      />
      <TrendBars
        title="Quotes / week"
        points={data.weeklyTrend.map(w => ({ label: w.label, value: w.quotes }))}
        barColor={colors.textSec}
      />

      <SplitBars
        title="Where customers come from"
        slices={data.channelSplit}
        barColor={colors.textSec}
      />
      <SplitBars
        title="Top job types"
        slices={data.topJobTypes}
        barColor={colors.textSec}
        emptyLabel="No job types yet"
      />
    </View>
  );
}

// ─── Needs your attention (actionable) ─────────────────────────────────────

function NeedsAttention({ data }: { data: TradieAnalytics }) {
  const { colors } = useTheme();
  const router = useRouter();
  const n = data.needsAttention;
  // Same counts, labels and CTAs as the web. "Follow up" opens Chats
  // unfiltered — the web's cold-filtered open is a web-only affordance.
  const actions: { count: number; label: string; cta: string; onPress: () => void }[] = [
    ...(n.awaitingReview > 0
      ? [
          {
            count: n.awaitingReview,
            label: n.awaitingReview === 1 ? 'quote to review' : 'quotes to review',
            cta: 'REVIEW',
            onPress: () => router.push('/quotes'),
          },
        ]
      : []),
    ...(n.coldChats > 0
      ? [
          {
            count: n.coldChats,
            label: n.coldChats === 1 ? 'chat went cold' : 'chats went cold',
            cta: 'FOLLOW UP',
            onPress: () => router.push('/chats'),
          },
        ]
      : []),
    ...(n.inspectionsToBook > 0
      ? [
          {
            count: n.inspectionsToBook,
            label: n.inspectionsToBook === 1 ? 'job needs a visit' : 'jobs need a visit',
            cta: 'VIEW',
            onPress: () => router.push('/quotes'),
          },
        ]
      : []),
  ];

  if (actions.length === 0) {
    return (
      <View
        style={[styles.caughtUp, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}
      >
        <View style={[styles.caughtDot, { backgroundColor: colors.successBright }]} />
        <View style={styles.caughtCopy}>
          <Text style={[styles.caughtTitle, { color: colors.textPri }]}>You’re all caught up</Text>
          <Text style={[styles.caughtSub, { color: colors.textDim }]}>
            No quotes or chats need a follow-up.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {actions.map(a => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          onPress={a.onPress}
          style={({ pressed }) => [
            styles.actionCard,
            {
              borderColor: colors.warningBright,
              backgroundColor: pressed ? colors.ink : colors.inkCard,
            },
          ]}
        >
          <View style={styles.actionLeft}>
            <Text style={[styles.actionCount, { color: colors.warningBright }]}>{a.count}</Text>
            <Text style={[styles.actionLabel, { color: colors.textSec, flexShrink: 1 }]}>
              {a.label}
            </Text>
          </View>
          <Text style={[styles.actionCta, { color: colors.textPri }]}>{a.cta} →</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Charts (MetricCharts.tsx as Views) ────────────────────────────────────

function TrendBars({
  title,
  points,
  barColor,
}: {
  title: string;
  points: { label: string; value: number }[];
  barColor: string;
}) {
  const { colors } = useTheme();
  const values = points.map(p => p.value);
  const heights = barPercents(values);
  const peak = Math.max(0, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const axisPoints = points.filter(
    (_, i) => i === 0 || i === Math.floor((points.length - 1) / 2) || i === points.length - 1,
  );

  return (
    <Card>
      <View style={styles.chartHeader}>
        <Text style={[styles.cardLabel, { color: colors.textDim }]}>{title.toUpperCase()}</Text>
        <Text style={[styles.chartCaption, { color: colors.textSec }]}>
          {total} TOTAL · PEAK {peak}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${title}. ${points.map(p => `${p.label}: ${p.value}`).join('. ')}`}
        style={styles.trendBars}
      >
        {points.map((p, i) => {
          const height: `${number}%` = `${heights[i] ?? 0}%`;
          return (
            <View key={`${p.label}-${i}`} style={styles.trendBarSlot}>
              <View
                style={{
                  width: '100%',
                  height,
                  minHeight: p.value > 0 ? 3 : 0,
                  backgroundColor: barColor,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.trendLabels}>
        {axisPoints.map((p, i) => (
          <Text
            key={`${p.label}-${i}`}
            style={[
              styles.trendLabel,
              {
                color: colors.textDim,
                textAlign: i === 0 ? 'left' : i === axisPoints.length - 1 ? 'right' : 'center',
              },
            ]}
          >
            {p.label.toUpperCase()}
          </Text>
        ))}
      </View>
    </Card>
  );
}

function SplitBars({
  title,
  slices,
  barColor,
  emptyLabel = 'No data yet',
}: {
  title: string;
  slices: { label: string; count: number }[];
  barColor: string;
  emptyLabel?: string;
}) {
  const { colors } = useTheme();
  const widths = barPercents(slices.map(s => s.count));
  const total = slices.reduce((a, s) => a + s.count, 0);

  return (
    <Card>
      <View style={styles.chartHeader}>
        <Text style={[styles.cardLabel, { color: colors.textDim }]}>{title.toUpperCase()}</Text>
        <Text style={[styles.chartCaption, { color: colors.textSec }]}>{total} TOTAL</Text>
      </View>
      <View style={styles.splitRows}>
        {slices.length === 0 ? (
          <Text style={[styles.splitEmpty, { color: colors.textDim }]}>
            {emptyLabel.toUpperCase()}
          </Text>
        ) : null}
        {slices.map((s, i) => {
          const width: `${number}%` = `${widths[i] ?? 0}%`;
          return (
            <View
              key={`${s.label}-${i}`}
              accessible
              accessibilityLabel={`${s.label}: ${s.count}`}
              style={styles.splitRow}
            >
              <View style={styles.splitHeading}>
                <Text style={[styles.splitLabel, { color: colors.textSec }]}>{s.label}</Text>
                <Text style={[styles.splitCount, { color: colors.textPri }]}>{s.count}</Text>
              </View>
              <View style={[styles.splitTrack, { backgroundColor: colors.ink }]}>
                <View style={{ width, height: '100%', backgroundColor: barColor }} />
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ─── Speed + loading ───────────────────────────────────────────────────────

function SpeedCard({ minutes }: { minutes: number | null }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={[styles.cardLabel, { color: colors.textDim }]}>TYPICAL TIME TO QUOTE</Text>
      <Text style={[styles.speedValue, { color: colors.textPri }]}>{formatDuration(minutes)}</Text>
      <Text style={[styles.cardCaption, { color: colors.textSec }]}>
        {minutes == null ? 'NO QUOTES YET' : 'REQUEST → DRAFTED QUOTE'}
      </Text>
    </Card>
  );
}

/** Shape-of-the-content placeholder blocks, mirroring the web AnalyticsSkeleton. */
function Skeleton() {
  const { colors } = useTheme();
  const block = {
    borderWidth: 1,
    borderColor: colors.inkLine,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
  } as const;
  return (
    <View accessible accessibilityLabel="Loading activity" style={styles.stack}>
      <View style={[block, { height: 56 }]} />
      <View style={[block, { height: 168 }]} />
      <View style={[block, { height: 140 }]} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { marginTop: spacing.gap, marginHorizontal: spacing.xl, gap: spacing.lg },
  stack: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    rowGap: spacing.sm,
  },
  sectionTitle: { ...type.title },
  sectionRange: { ...type.label, letterSpacing: 0.6 },
  caughtUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  caughtDot: { width: 8, height: 8, borderRadius: 4 },
  caughtCopy: { flex: 1, gap: spacing.xs },
  caughtTitle: { ...type.body, fontFamily: fonts.sans.semiBold },
  caughtSub: { ...type.bodySm },
  actionCard: {
    minHeight: touch.listRow,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLeft: {
    flexGrow: 1,
    flexBasis: 180,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  actionCount: {
    fontFamily: fonts.mono.bold,
    fontSize: 24,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  actionLabel: { ...type.bodySm, flex: 1 },
  actionCta: { ...type.label, letterSpacing: 0.6 },
  counterGrid: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden', gap: 1 },
  counterRow: { flexDirection: 'row', gap: 1 },
  counterCell: { flex: 1, minWidth: 0, padding: spacing.lg },
  counterLabel: { ...type.label, letterSpacing: 0.3 },
  counterValue: {
    marginTop: spacing.md,
    fontFamily: fonts.mono.bold,
    fontSize: 26,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  counterHint: { ...type.bodySm, marginTop: spacing.sm },
  cardLabel: { ...type.label, letterSpacing: 0.6, flexShrink: 1 },
  speedValue: { ...type.price, marginTop: spacing.lg },
  cardCaption: { ...type.bodySm, marginTop: spacing.sm },
  chartHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    rowGap: spacing.sm,
  },
  chartCaption: { ...type.label, letterSpacing: 0 },
  trendBars: {
    marginTop: spacing.xl,
    height: 112,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  trendBarSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  trendLabels: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  trendLabel: { ...type.label, flex: 1, letterSpacing: 0 },
  splitRows: { marginTop: spacing.xl, gap: spacing.lg },
  splitEmpty: { ...type.bodySm },
  splitRow: { gap: spacing.sm },
  splitHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  splitLabel: { ...type.bodySm, flex: 1 },
  splitTrack: { height: 8, borderRadius: 3, overflow: 'hidden' },
  splitCount: { ...type.bodySm, fontFamily: fonts.mono.semiBold, fontVariant: ['tabular-nums'] },
  emptyCard: { paddingVertical: spacing.xxl },
  emptyTitle: { ...type.title },
  emptyBody: { ...type.bodySm, marginTop: spacing.sm },
});
