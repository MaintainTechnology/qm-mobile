/**
 * The mobile subset of `GET /api/tenant/me` (spec web-parity C1/H2) plus the overview stat
 * definitions shared with the web dashboard's OverviewTab. Schemas are loose: the web payload is
 * far larger than what mobile renders, and unknown fields must never break parsing.
 */
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { averageCents, centsFromApiDollars } from '@/lib/money';
import { useApiQuery } from '@/lib/useApi';

/** One priced tier (good/better/best) as the web quote detail reads it. Loose — render verbatim. */
const TierSchema = z
  .looseObject({
    label: z.string().nullish(),
    total_inc_gst: z.number().nullish(),
    subtotal_ex_gst: z.number().nullish(),
    line_items: z.array(z.looseObject({})).nullish(),
  })
  .nullish();

export const QuoteRowSchema = z.looseObject({
  id: z.string(),
  created_at: z.string(),
  status: z.string().nullish(),
  selected_tier: z.string().nullish(),
  /** Dollars on the wire — convert with `centsFromApiDollars` at render, never mid-state math. */
  total_inc_gst: z.number().nullish(),
  share_token: z.string().nullish(),
  needs_inspection: z.boolean().nullish(),
  customer_first_name: z.string().nullish(),
  customer_full_name: z.string().nullish(),
  customer_phone: z.string().nullish(),
  suburb: z.string().nullish(),
  job_type: z.string().nullish(),
  trade: z.string().nullish(),
  deposit_paid: z.boolean().nullish(),
  channel: z.enum(['sms', 'voice']).nullish(),
  scope_of_works: z.string().nullish(),
  good: TierSchema,
  better: TierSchema,
  best: TierSchema,
  messages: z
    .array(z.looseObject({ direction: z.string(), body: z.string(), created_at: z.string() }))
    .nullish(),
});
export type QuoteRow = z.infer<typeof QuoteRowSchema>;

export const TenantMeSchema = z.looseObject({
  tenant: z.looseObject({
    id: z.string(),
    business_name: z.string().nullish(),
    owner_first_name: z.string().nullish(),
    owner_email: z.string().nullish(),
    contact_name: z.string().nullish(),
    trades: z.array(z.string()).nullish(),
    trade: z.string().nullish(),
    state: z.string().nullish(),
    status: z.string().nullish(),
    twilio_sms_number: z.string().nullish(),
    twilio_voice_number: z.string().nullish(),
  }),
  pricing: z.looseObject({}).nullish(),
  pricing_books: z
    .array(
      z.looseObject({
        trade: z.string().nullish(),
        hourly_rate: z.number().nullish(),
        call_out_minimum: z.number().nullish(),
        default_markup_pct: z.number().nullish(),
      }),
    )
    .nullish(),
  quotes: z.array(QuoteRowSchema).default([]),
  licences: z.array(z.looseObject({ trade: z.string() })).nullish(),
});
export type TenantMe = z.infer<typeof TenantMeSchema>;

export const TENANT_ME_KEY = ['tenant', 'me'] as const;

export function useTenantMe(opts: { enabled?: boolean } = {}) {
  // Retry policy is the shared query.ts predicate: 404 (no tenant) never
  // retries there; 5xx/timeouts keep their tuned retries.
  return useApiQuery(TENANT_ME_KEY, '/api/tenant/me', TenantMeSchema, opts);
}

/** 404 from /api/tenant/me = signed in but no tenant row → resume onboarding (spec A2). */
export function isTenantMissing(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Trades enabled for the tenant — `trades[]` with the legacy single `trade` fallback. */
export function tenantTrades(me: TenantMe): string[] {
  const list = me.tenant.trades ?? [];
  if (list.length > 0) return list;
  return me.tenant.trade ? [me.tenant.trade] : [];
}

/** Statuses the web OverviewTab counts as the "In review" backlog. */
export const IN_REVIEW_STATUSES = new Set([
  'draft',
  'drafted',
  'awaiting_review',
  'review',
  'awaiting_tradie_approval',
]);

/**
 * The one definition of "waiting on the tradie" — Home KPIs, the attention card and the Quotes
 * filter must all agree. A missing status reads as a fresh draft, matching the badge logic.
 */
export function isInReview(quote: Pick<QuoteRow, 'status'>): boolean {
  return IN_REVIEW_STATUSES.has((quote.status ?? 'draft').toLowerCase());
}

/** A quote counts as accepted when the deposit is paid or the status says so (web parity). */
export function isAccepted(quote: QuoteRow): boolean {
  return quote.deposit_paid === true || (quote.status ?? '').toLowerCase() === 'accepted';
}

export type OverviewStats = {
  quotedCents: number;
  acceptedCents: number;
  conversionPct: number;
  avgQuoteCents: number;
  inReviewCount: number;
  quoteCount: number;
};

/** Same definitions as the web dashboard's OverviewTab (spec C2). */
export function overviewStats(quotes: readonly QuoteRow[]): OverviewStats {
  let quotedCents = 0;
  let acceptedCents = 0;
  let acceptedCount = 0;
  let inReviewCount = 0;
  for (const quote of quotes) {
    const cents = quote.total_inc_gst == null ? null : centsFromApiDollars(quote.total_inc_gst);
    if (cents != null) quotedCents += cents;
    if (isAccepted(quote)) {
      acceptedCount += 1;
      if (cents != null) acceptedCents += cents;
    }
    if (isInReview(quote)) inReviewCount += 1;
  }
  return {
    quotedCents,
    acceptedCents,
    // A percentage, not money — plain rounding is fine here.
    conversionPct: quotes.length === 0 ? 0 : Math.round((acceptedCount / quotes.length) * 100),
    // Web OverviewTab divides by ALL scoped quotes — unpriced ones count as $0.
    avgQuoteCents: averageCents(quotedCents, quotes.length),
    inReviewCount,
    quoteCount: quotes.length,
  };
}
