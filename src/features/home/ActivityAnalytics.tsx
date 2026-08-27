/**
 * "Your activity" — native port of the web dashboard's analytics block
 * (app/dashboard/_components/OverviewAnalytics.tsx + app/_components/
 * MetricCharts.tsx), mounted as a HomeScreen section. Content matches the web
 * body: needs-attention actionables, headline counters, speed-to-quote, lead
 * funnel, weekly trends and channel / job-type splits — single column, the
 * web's flex-div bars redrawn as plain Views (no chart lib).
 *
 * Colour mapping: the web's teal-toned charts land on a warm NEUTRAL here
 * (edgeGlow) — the mobile system allows one signal colour per screen, so only
 * the accent-toned series keep Cat yellow.
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
import { fonts, touch } from '@/lib/theme';
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
        <Text style={[styles.sectionTitle, { color: colors.textPri }]}>
          WHO’S REACHING OUT & WHAT’S BEEN PROCESSED
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
        <Text style={[styles.emptyTitle, { color: colors.textPri }]}>NO ACTIVITY YET</Text>
        <Text style={[styles.emptyBody, { color: colors.textDim }]}>
          Hand out your QuoteMax number above — every text and call lands here as a drafted
          quote, and this is where you’ll watch it happen.
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
                <Text style={[styles.counterValue, { color: colors.accentText }]}>
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
      <SplitBars title="Lead funnel" slices={data.funnel} barColor={colors.accent} />

      <TrendBars
        title="Requests / week"
        points={data.weeklyTrend.map(w => ({ label: w.label, value: w.intakes }))}
        barColor={colors.edgeGlow}
      />
      <TrendBars
        title="Quotes / week"
        points={data.weeklyTrend.map(w => ({ label: w.label, value: w.quotes }))}
        barColor={colors.accent}
      />

      <SplitBars
        title="Where customers come from"
        slices={data.channelSplit}
        barColor={colors.edgeGlow}
      />
      <SplitBars
        title="Top job types"
        slices={data.topJobTypes}
        barColor={colors.accent}
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
        style={[
          styles.caughtUp,
          { borderColor: 'rgba(52,210,123,0.45)', backgroundColor: colors.inkCard },
        ]}
      >
        <View style={[styles.caughtDot, { backgroundColor: colors.successBright }]} />
        <Text style={[styles.caughtTitle, { color: colors.successBright }]}>
          YOU’RE ALL CAUGHT UP
        </Text>
        <Text style={[styles.caughtSub, { color: colors.textDim }]}>
          NO QUOTES WAITING, NO COLD CHATS
        </Text>
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
          style={[
            styles.actionCard,
            { borderColor: 'rgba(245,158,11,0.42)', backgroundColor: colors.inkCard },
          ]}
        >
          <View style={styles.actionLeft}>
            <Text style={[styles.actionCount, { color: colors.warningBright }]}>{a.count}</Text>
            <Text
              style={[styles.actionLabel, { color: colors.textSec, flexShrink: 1 }]}
              numberOfLines={1}
            >
              {a.label.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.actionCta, { color: colors.accentText }]}>{a.cta} →</Text>
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

  return (
    <Card>
      <View style={styles.chartHeader}>
        <Text style={[styles.cardLabel, { color: colors.textDim }]}>{title.toUpperCase()}</Text>
        <Text style={[styles.chartCaption, { color: colors.textSec }]}>
          {total} TOTAL · PEAK {peak}
        </Text>
      </View>
      <View style={styles.trendBars}>
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
                  opacity: 0.75,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.trendLabels}>
        {points.map((p, i) => (
          <Text
            key={`${p.label}-${i}`}
            numberOfLines={1}
            style={[styles.trendLabel, { color: colors.textDim }]}
          >
            {/* Thin the axis labels when crowded; always keep first + last. */}
            {points.length <= 8 || i % 2 === 0 || i === points.length - 1
              ? p.label.toUpperCase()
              : ''}
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
            <View key={`${s.label}-${i}`} style={styles.splitRow}>
              <Text
                numberOfLines={1}
                style={[styles.splitLabel, { color: colors.textDim }]}
              >
                {s.label.toUpperCase()}
              </Text>
              <View style={[styles.splitTrack, { backgroundColor: colors.ink }]}>
                <View
                  style={{ width, height: '100%', backgroundColor: barColor, opacity: 0.75 }}
                />
              </View>
              <Text style={[styles.splitCount, { color: colors.textSec }]}>{s.count}</Text>
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
      <Text style={[styles.speedValue, { color: colors.accentText }]}>
        {formatDuration(minutes)}
      </Text>
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
    borderRadius: 14,
    backgroundColor: colors.inkCard,
  } as const;
  return (
    <View style={styles.stack}>
      <View style={[block, { height: 56 }]} />
      <View style={[block, { height: 168 }]} />
      <View style={[block, { height: 140 }]} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { marginTop: 16, marginHorizontal: 16, gap: 12 },
  stack: { gap: 12 },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 2,
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.1, // .1em @ 11
  },
  sectionRange: {
    fontFamily: fonts.mono.medium,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  caughtUp: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 9,
    rowGap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  caughtDot: { width: 6, height: 6, borderRadius: 3 },
  caughtTitle: { fontFamily: fonts.sans.bold, fontSize: 10.5, letterSpacing: 1.05 },
  caughtSub: { fontFamily: fonts.mono.medium, fontSize: 9, letterSpacing: 0.9 },
  actionCard: {
    minHeight: touch.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionLeft: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  actionCount: {
    fontFamily: fonts.mono.bold,
    fontSize: 22,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  actionLabel: { fontFamily: fonts.mono.medium, fontSize: 10, letterSpacing: 1 },
  actionCta: { fontFamily: fonts.sans.bold, fontSize: 10, letterSpacing: 1 },
  counterGrid: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', gap: 1 },
  counterRow: { flexDirection: 'row', gap: 1 },
  counterCell: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  counterLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.76, // .08em @ 9.5
  },
  counterValue: {
    marginTop: 7,
    fontFamily: fonts.mono.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  counterHint: { marginTop: 6, fontFamily: fonts.sans.medium, fontSize: 9.5, lineHeight: 12 },
  cardLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  speedValue: {
    marginTop: 10,
    fontFamily: fonts.mono.bold,
    fontSize: 34,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  cardCaption: { marginTop: 8, fontFamily: fonts.mono.medium, fontSize: 9, letterSpacing: 0.9 },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  chartCaption: { fontFamily: fonts.mono.medium, fontSize: 9, letterSpacing: 0.9 },
  trendBars: { marginTop: 14, height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  trendBarSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  trendLabels: { marginTop: 6, flexDirection: 'row', gap: 5 },
  trendLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.mono.medium,
    fontSize: 8,
    letterSpacing: 0.4,
  },
  splitRows: { marginTop: 14, gap: 10 },
  splitEmpty: { fontFamily: fonts.mono.medium, fontSize: 9.5, letterSpacing: 0.95 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  splitLabel: { width: 88, fontFamily: fonts.mono.medium, fontSize: 9.5, letterSpacing: 0.8 },
  splitTrack: { flex: 1, height: 10, borderRadius: 2, overflow: 'hidden' },
  splitCount: {
    width: 34,
    textAlign: 'right',
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: {
    fontFamily: fonts.sans.bold,
    fontSize: 12,
    letterSpacing: 0.96,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 8,
    maxWidth: 300,
    textAlign: 'center',
    fontFamily: fonts.sans.regular,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
