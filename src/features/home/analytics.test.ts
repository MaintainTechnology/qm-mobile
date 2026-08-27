/**
 * Web-parity assertions for the activity-analytics model. Expected values come
 * from quotemate-automation: lib/dashboard/tradie-analytics.ts (payload shape),
 * lib/dashboard/period.ts (device-clock window resolution),
 * app/api/tenant/analytics/route.ts (weeks clamp) and
 * app/_components/MetricCharts.tsx (bar normalisation) — update both sides
 * together.
 */
import {
  AnalyticsResponseSchema,
  analyticsPath,
  analyticsWindow,
  barPercents,
  clampWeeks,
  formatDuration,
} from './analytics';

const payload = {
  ok: true,
  analytics: {
    generatedAt: '2026-08-27T04:00:00.000Z',
    weeks: 8,
    headline: {
      peopleTexting: 6,
      peopleCalling: 3,
      totalChats: 11,
      totalCalls: 4,
      totalRequests: 9,
      totalQuotes: 7,
      processedQuotes: 5,
      uniqueCustomers: 8,
    },
    needsAttention: { awaitingReview: 3, coldChats: 2, inspectionsToBook: 1 },
    speedToQuoteMinutes: 4,
    funnel: [
      { label: 'Requests', count: 9 },
      { label: 'Quotes', count: 7 },
      { label: 'Sent', count: 5 },
      { label: 'Accepted', count: 2 },
    ],
    weeklyTrend: [
      { weekStart: '2026-08-17', label: '17 Aug', quotes: 3, intakes: 4, signups: 0 },
      { weekStart: '2026-08-24', label: '24 Aug', quotes: 4, intakes: 5, signups: 0 },
    ],
    channelSplit: [
      { key: 'sms', label: 'SMS', count: 7 },
      { key: 'voice', label: 'Voice', count: 2 },
    ],
    topJobTypes: [{ label: 'Hot water', count: 4 }],
  },
};

describe('AnalyticsResponseSchema', () => {
  it('round-trips a realistic payload, tolerating fields it does not render', () => {
    const parsed = AnalyticsResponseSchema.parse(payload);
    expect(parsed.analytics.headline.totalQuotes).toBe(7);
    expect(parsed.analytics.needsAttention.awaitingReview).toBe(3);
    expect(parsed.analytics.funnel).toHaveLength(4);
    expect(parsed.analytics.weeklyTrend[1]?.intakes).toBe(5);
    expect(parsed.analytics.topJobTypes[0]?.label).toBe('Hot water');
  });

  it('accepts a null speed-to-quote (no quotes yet)', () => {
    const noQuotes = {
      ...payload,
      analytics: { ...payload.analytics, speedToQuoteMinutes: null },
    };
    expect(AnalyticsResponseSchema.parse(noQuotes).analytics.speedToQuoteMinutes).toBeNull();
  });

  it('rejects ok:false so an error envelope never renders as data', () => {
    expect(AnalyticsResponseSchema.safeParse({ ok: false, error: 'unauthorized' }).success).toBe(
      false,
    );
  });
});

describe('clampWeeks', () => {
  it('mirrors the server clamp: 4..26, truncated, 8 on garbage', () => {
    expect(clampWeeks(3)).toBe(4);
    expect(clampWeeks(99)).toBe(26);
    expect(clampWeeks(8.9)).toBe(8);
    expect(clampWeeks(Number.NaN)).toBe(8);
  });
});

describe('analyticsWindow', () => {
  it('opens at local midnight of the Monday starting the oldest week', () => {
    const now = new Date(2026, 7, 27, 14, 30); // Thu 27 Aug 2026, 2:30pm local
    const { from, to } = analyticsWindow(4, now);
    expect(from).toEqual(new Date(2026, 7, 3)); // Mon 3 Aug, local midnight
    expect(to).toEqual(new Date(2026, 7, 27, 23, 59, 59, 999)); // local end of today
  });

  it('is stable across the current week — Sunday still counts back to Monday (AU weeks)', () => {
    const sunday = new Date(2026, 7, 30); // Sun 30 Aug 2026
    expect(analyticsWindow(4, sunday).from).toEqual(new Date(2026, 7, 3));
  });

  it('clamps the weeks choice before resolving', () => {
    const now = new Date(2026, 7, 27);
    expect(analyticsWindow(1, now).from).toEqual(analyticsWindow(4, now).from);
  });
});

describe('analyticsPath', () => {
  it('sends clamped weeks and URL-safe absolute ISO instants', () => {
    const path = analyticsPath(99, new Date(2026, 7, 27, 9, 0));
    expect(path.startsWith('/api/tenant/analytics?weeks=26&from=')).toBe(true);
    expect(path).not.toContain(':'); // ISO colons are hand-encoded (RN URLSearchParams gap)
    const from = decodeURIComponent(path.split('from=')[1]?.split('&')[0] ?? '');
    const to = decodeURIComponent(path.split('to=')[1] ?? '');
    expect(Number.isNaN(Date.parse(from))).toBe(false);
    expect(Number.isNaN(Date.parse(to))).toBe(false);
    expect(Date.parse(from)).toBeLessThan(Date.parse(to));
  });
});

describe('barPercents', () => {
  it('normalises against the series max', () => {
    expect(barPercents([5, 10])).toEqual([50, 100]);
    expect(barPercents([1, 3])).toEqual([33, 100]);
  });

  it('keeps an all-zero series flat instead of dividing by zero', () => {
    expect(barPercents([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('handles an empty series', () => {
    expect(barPercents([])).toEqual([]);
  });
});

describe('formatDuration', () => {
  it('matches the web formatting tiers', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(0.4)).toBe('<1m');
    expect(formatDuration(42)).toBe('42m');
    expect(formatDuration(90)).toBe('1.5h');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(4000)).toBe('3d');
  });
});
