/**
 * "Your activity" analytics — schema + pure maths for the native port of the
 * web dashboard's OverviewAnalytics (app/dashboard/_components/
 * OverviewAnalytics.tsx). Contract: GET /api/tenant/analytics?weeks=&from=&to=
 * → { ok: true, analytics } (app/api/tenant/analytics/route.ts,
 * lib/dashboard/tradie-analytics.ts). The payload is counts and minutes only —
 * no money fields — so nothing here touches cents.
 */
import { z } from 'zod';

// ─── Response schema ────────────────────────────────────────────────────────

/** Loose: the server sends more than we render (weekStart, signups, slice keys…). */
const LabelledCountSchema = z.looseObject({ label: z.string(), count: z.number() });

const WeeklyPointSchema = z.looseObject({
  label: z.string(),
  quotes: z.number(),
  intakes: z.number(),
});

export const TradieAnalyticsSchema = z.looseObject({
  generatedAt: z.string(),
  weeks: z.number(),
  headline: z.looseObject({
    peopleTexting: z.number(),
    peopleCalling: z.number(),
    totalChats: z.number(),
    totalCalls: z.number(),
    totalRequests: z.number(),
    totalQuotes: z.number(),
    processedQuotes: z.number(),
    uniqueCustomers: z.number(),
  }),
  needsAttention: z.looseObject({
    awaitingReview: z.number(),
    coldChats: z.number(),
    inspectionsToBook: z.number(),
  }),
  speedToQuoteMinutes: z.number().nullable(),
  funnel: z.array(LabelledCountSchema),
  weeklyTrend: z.array(WeeklyPointSchema),
  channelSplit: z.array(LabelledCountSchema),
  topJobTypes: z.array(LabelledCountSchema),
});

/** `ok` pinned to literal true so a 200-with-ok:false lands in the error path. */
export const AnalyticsResponseSchema = z.looseObject({
  ok: z.literal(true),
  analytics: TradieAnalyticsSchema,
});

export type TradieAnalytics = z.infer<typeof TradieAnalyticsSchema>;

// ─── Reporting window (device clock, like lib/dashboard/period.ts) ──────────

/** The web dashboard fetches a fixed 8-week trend; same default here. */
export const DEFAULT_WEEKS = 8;

/** The server's own clamp (route.ts), mirrored so key and request agree. */
export function clampWeeks(weeks: number): number {
  if (!Number.isFinite(weeks)) return DEFAULT_WEEKS;
  return Math.min(26, Math.max(4, Math.trunc(weeks)));
}

export type AnalyticsWindow = { from: Date; to: Date };

/**
 * Absolute window for a weeks choice, resolved on the DEVICE clock the way
 * lib/dashboard/period.ts resolves periods: `from` is local midnight of the
 * Monday opening the oldest of the `weeks` Monday-aligned weeks (AU weeks
 * start Monday), `to` is the local end of today. Headline counters then scope
 * to exactly the weeks the trend chart draws — on the tradie's calendar, with
 * no UTC day-edge skew, and stable across the whole current week.
 */
export function analyticsWindow(weeks: number, now: Date): AnalyticsWindow {
  const w = clampWeeks(weeks);
  const daysFromMonday = (now.getDay() + 6) % 7; // 0 = Sun … 6 = Sat
  const from = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysFromMonday - (w - 1) * 7,
  );
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { from, to };
}

/**
 * GET path with the window as absolute ISO instants — the server only honours
 * parseable from/to and re-clamps weeks. Hand-encoded rather than
 * URLSearchParams because RN's implementation is not WHATWG-complete.
 */
export function analyticsPath(weeks: number, now: Date): string {
  const w = clampWeeks(weeks);
  const { from, to } = analyticsWindow(w, now);
  return (
    `/api/tenant/analytics?weeks=${w}` +
    `&from=${encodeURIComponent(from.toISOString())}` +
    `&to=${encodeURIComponent(to.toISOString())}`
  );
}

// ─── Chart maths ────────────────────────────────────────────────────────────

/**
 * Bar heights/widths as 0–100 percentages of the series max — the flex-chart
 * normalisation MetricCharts.tsx does in CSS. The max(1) floor means an
 * all-zero (or empty) series yields flat zeros, never NaN bars.
 */
export function barPercents(values: readonly number[]): number[] {
  const max = Math.max(1, ...values);
  return values.map(v => Math.round((v / max) * 100));
}

/** '—', '<1m', '42m', '1.5h', '3d' — ported verbatim from OverviewAnalytics. */
export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 60 * 24) {
    const h = minutes / 60;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  }
  return `${Math.round(minutes / (60 * 24))}d`;
}
