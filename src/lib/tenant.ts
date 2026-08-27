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
  /** Legacy twin of needs_inspection — the web treats either flag as "inspection". */
  inspection_required: z.boolean().nullish(),
  /** e.g. 'tradie_review' | 'inspection_required'; detail pane shows it title-cased. */
  routing_decision: z.string().nullish(),
  estimated_timeframe: z.string().nullish(),
  /** Per-quote customer-page layout override; null inherits the tenant default. */
  display_mode: z.enum(['itemised', 'summary']).nullish(),
  /** Roofing-only: site-relative link to the measure tool's results page. */
  measure_href: z.string().nullish(),
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
  /** Shared + custom assemblies merged server-side; the hub's Services & brands section. */
  services: z
    .array(
      z.looseObject({
        id: z.string().nullish(),
        assembly_id: z.string().nullish(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        trade: z.string().nullish(),
        enabled: z.boolean().nullish(),
        default_unit: z.string().nullish(),
        default_unit_price_ex_gst: z.number().nullish(),
      }),
    )
    .nullish(),
  /** Brand vocabulary per material category (web ServicesTab "brands" half). */
  material_categories: z
    .array(
      z.looseObject({
        trade: z.string().nullish(),
        category: z.string().nullish(),
        brands: z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
  /** category → preferred brand, tenant-chosen. */
  material_preferences: z.record(z.string(), z.string()).nullish(),
});
export type TenantMe = z.infer<typeof TenantMeSchema>;
export type ServiceRow = NonNullable<TenantMe['services']>[number];

export const TENANT_ME_KEY = ['tenant', 'me'] as const;

/**
 * The dashboard's data AND the signed-in/onboarded decision, so it is the app's most
 * latency-critical read. A tighter budget than the 15s default: three attempts at 8s beats one
 * attempt at 15s when the answer decides whether a tradie sees their day at all.
 */
export function useTenantMe(opts: { enabled?: boolean } = {}) {
  // Retry policy is the shared query.ts predicate: a 4xx (including the no-tenant 404) never
  // retries; timeouts and 5xx get the tuned ladder.
  return useApiQuery(TENANT_ME_KEY, '/api/tenant/me', TenantMeSchema, { timeoutMs: 8000, ...opts });
}

/**
 * Signed in but no tenant row → resume onboarding (spec A2).
 *
 * Requires QuoteMax's own `{ error: 'no_tenant' }` marker, NOT a bare 404. Any 404 would otherwise
 * push the tradie into the invitation-code gate — and a 404 is exactly what you get when
 * `EXPO_PUBLIC_API_URL` points somewhere that isn't the QuoteMax API: a typo, a proxy, a stale
 * tunnel, or another app on the port. Trapping a fully onboarded tradie in onboarding because the
 * base URL was wrong is far worse than showing them a shell that fails to load.
 */
export function isTenantMissing(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 404) return false;
  const body = error.body as { error?: unknown } | null | undefined;
  return body?.error === 'no_tenant';
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
