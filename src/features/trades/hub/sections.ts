/**
 * Trade-hub model — the mobile mirror of the web dashboard's TradeHub
 * (quotemate-automation/app/dashboard/page.tsx ~16981–17326) and its quote
 * queue (QuotesTab ~8358–8874, lib/dashboard/quote-filters.ts). Everything
 * here is pure and unit-tested against the web's own constants so `/review`
 * can diff the two sources directly.
 */
import type { QuoteRow } from '@/lib/tenant';

// ── Hubs ────────────────────────────────────────────────────────────────────

/** Trades that get a hub, in the web's own order (page.tsx TRADE_HUB_SLUGS). */
export const TRADE_HUB_SLUGS = [
  'electrical',
  'plumbing',
  'roofing',
  'signage',
  'painting',
  'commercial_painting',
  'aircon',
  'solar',
] as const;
export type HubTrade = (typeof TRADE_HUB_SLUGS)[number];

/** Web HUB_NAV labels (page.tsx:2008-2017) — also used by queue meta lines. */
export const TRADE_LABELS: Record<HubTrade, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  roofing: 'Roofing',
  signage: 'Signage',
  painting: 'Painting',
  commercial_painting: 'Commercial paint',
  aircon: 'Air-con',
  solar: 'Solar',
};

/** The tenant's hub-capable trades, hub-ordered (web `hubEnabled` per slug). */
export function hubTrades(trades: readonly string[]): HubTrade[] {
  const lowered = trades.map(t => t.toLowerCase());
  return TRADE_HUB_SLUGS.filter(slug => lowered.includes(slug));
}

// ── Sections ────────────────────────────────────────────────────────────────

export type HubSectionId =
  'quotes' | 'tools' | 'pricing' | 'services' | 'catalogue' | 'recipes' | 'estimating';

/** Web HUB_SECTION_LABELS (page.tsx:16990-16998), verbatim. */
export const HUB_SECTION_LABELS: Record<HubSectionId, string> = {
  quotes: 'Quotes',
  tools: 'Tools',
  pricing: 'Pricing',
  services: 'Services & brands',
  catalogue: 'Catalogue',
  recipes: 'Recipes',
  estimating: 'Estimating',
};

/** Every hub trade has a tools section on the web (HUB_TOOL_TRADES lists all 8). */
export function hubSections(trade: HubTrade): HubSectionId[] {
  void trade;
  return ['quotes', 'tools', 'pricing', 'services', 'catalogue', 'recipes', 'estimating'];
}

/** Web hub subtitle, verbatim (page.tsx:17092-17108). */
export function hubSubtitle(trade: HubTrade): string {
  const label = TRADE_LABELS[trade].toLowerCase();
  return `Everything for your ${label} work in one place — quotes, tools, pricing, services, brands, catalogue, recipes and estimating.`;
}

/** "7" → "07" — the web zero-pads both header counters (padStart(2,'0')). */
export function padCount(n: number): string {
  return String(n).padStart(2, '0');
}

/** Hub header QUOTES counter — pipeline quotes whose trade matches the hub. */
export function quoteCountForTrade(quotes: readonly QuoteRow[], trade: HubTrade): number {
  return quotes.filter(q => (q.trade ?? '').toLowerCase() === trade).length;
}

// ── Quote queue: filter / sort / search (web QuotesTab parity) ──────────────

export type QueueFilter = 'all' | 'review' | 'sent' | 'paid' | 'inspect';

/** Web status-filter options, in order, with the web's labels (page.tsx:8532-8538). */
export const QUEUE_FILTERS: { key: QueueFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'review', label: 'In review' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Deposit paid' },
  { key: 'inspect', label: 'Inspection' },
];

/**
 * Web `quoteMatchesFilter` (page.tsx:8360-8367), verbatim — note the hub's
 * review set is narrower than the Quotes tab's (no awaiting_tradie_approval):
 * held-for-approval quotes surface through the badge, not this filter.
 */
export function queueMatchesFilter(quote: QuoteRow, filter: QueueFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'paid') return quote.deposit_paid === true;
  if (filter === 'inspect')
    return quote.needs_inspection === true || quote.inspection_required === true;
  const status = (quote.status ?? 'draft').toLowerCase();
  if (filter === 'sent') return status === 'sent';
  return ['drafted', 'awaiting_review', 'review', 'draft'].includes(status);
}

export type QueueSort = 'newest' | 'oldest' | 'value_desc' | 'value_asc';

/** Web sort options + labels (page.tsx:8392-8399). */
export const QUEUE_SORTS: { key: QueueSort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'value_desc', label: 'Highest value' },
  { key: 'value_asc', label: 'Lowest value' },
];

/** Web comparator (lib/dashboard/quote-queue.ts:100-114): unpriced rows sink. */
export function compareQuotes(a: QuoteRow, b: QuoteRow, sort: QueueSort): number {
  if (sort === 'newest' || sort === 'oldest') {
    const cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    return sort === 'newest' ? -cmp : cmp;
  }
  const av = a.total_inc_gst;
  const bv = b.total_inc_gst;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return sort === 'value_desc' ? bv - av : av - bv;
}

/** Web parseSearchTerms (lib/dashboard/quote-filters.ts:24): whitespace-split, lowered. */
export function parseSearchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Web quoteMatchesSearch (lib/dashboard/quote-filters.ts:31-47): every term
 * must hit at least one of the same eight fields.
 */
export function quoteMatchesSearch(quote: QuoteRow, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = [
    quote.customer_full_name,
    quote.customer_first_name,
    quote.suburb,
    quote.job_type,
    quote.trade,
    quote.scope_of_works,
    quote.share_token,
    quote.status,
  ]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  return terms.every(term => haystack.includes(term));
}
