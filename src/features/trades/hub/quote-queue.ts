import { z } from 'zod';

import { IN_REVIEW_STATUSES, type QuoteRow } from '@/lib/tenant';

/** The independently-loaded measure/saved-job source returned by B04. */
export const TradeJobsSchema = z.looseObject({
  jobs: z
    .array(
      z.looseObject({
        id: z.string(),
        trade: z.string(),
        address: z.string().nullish(),
        headline: z.string().nullish(),
        // Keep unfamiliar server states as data. One new job status must not discard the source.
        status: z.string().nullish(),
        href: z.string().nullish(),
        tradieHref: z.string().nullish(),
        createdAt: z.string().nullish(),
      }),
    )
    .default([]),
});

export type TradeJob = z.infer<typeof TradeJobsSchema>['jobs'][number];

export type QueueEntry =
  | {
      kind: 'quote';
      key: `quote:${string}`;
      createdAt: string | null;
      /** Dollars, matching /api/tenant/me. Null means the server supplied no usable value. */
      amount: number | null;
      trade: string | null;
      quote: QuoteRow;
    }
  | {
      kind: 'job';
      key: `job:${string}:${string}`;
      createdAt: string | null;
      /** B04 has no authoritative amount. Never infer one from a descriptive headline. */
      amount: null;
      trade: string;
      job: TradeJob;
    };

export type QueueFilter = 'all' | 'review' | 'sent' | 'paid' | 'inspect' | 'accepted';

export const QUEUE_FILTERS: readonly { key: QueueFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'review', label: 'In review' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Deposit paid' },
  { key: 'inspect', label: 'Inspection' },
  // Accepted remains useful, but is deliberately separate from a proven paid deposit.
  { key: 'accepted', label: 'Accepted' },
];

export type QueueSort = 'newest' | 'oldest' | 'value_desc' | 'value_asc';

export const QUEUE_SORTS: readonly { key: QueueSort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'value_desc', label: 'Highest value' },
  { key: 'value_asc', label: 'Lowest value' },
];

export type QueueTradeFilter = 'all' | string;

export type QueueCriteria = {
  search: string;
  status: QueueFilter;
  trade: QueueTradeFilter;
  from: string;
  to: string;
  timeZone: string;
  sort: QueueSort;
};

export function defaultQueueCriteria(contextTrade: string, timeZone: string): QueueCriteria {
  return {
    search: '',
    status: 'all',
    trade: normalizeQueueTrade(contextTrade) ?? 'all',
    from: '',
    to: '',
    timeZone,
    sort: 'newest',
  };
}

/** Web/API aliases differ only for commercial painting. Keep comparison vocabulary canonical. */
export function normalizeQueueTrade(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/-/g, '_') ?? '';
  return normalized || null;
}

function finiteAmount(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Build one tagged source before any filtering, counting or sorting. Jobs are additionally guarded
 * by the tenant's active trade list because their endpoint is independent from the tenant payload.
 */
export function mergeQueueEntries(
  quotes: readonly QuoteRow[],
  jobs: readonly TradeJob[],
  permittedTrades: readonly string[],
): QueueEntry[] {
  const permitted = new Set(
    permittedTrades.map(normalizeQueueTrade).filter((trade): trade is string => trade != null),
  );
  const permits = (trade: string | null) => permitted.size === 0 || (trade && permitted.has(trade));

  const quoteEntries: QueueEntry[] = quotes.flatMap(quote => {
    const trade = normalizeQueueTrade(quote.trade);
    if (!permits(trade)) return [];
    return [
      {
        kind: 'quote' as const,
        key: `quote:${quote.id}` as const,
        createdAt: validInstant(quote.created_at) ? quote.created_at : null,
        amount: finiteAmount(quote.total_inc_gst),
        trade,
        quote,
      },
    ];
  });

  const jobEntries: QueueEntry[] = jobs.flatMap(job => {
    const trade = normalizeQueueTrade(job.trade);
    // Unlike B01 quotes, an unrecognised B04 trade is never admitted to the merged tenant queue.
    if (!trade || !permits(trade)) return [];
    return [
      {
        kind: 'job' as const,
        key: `job:${trade}:${job.id}` as const,
        createdAt: validInstant(job.createdAt) ? job.createdAt : null,
        amount: null,
        trade,
        job,
      },
    ];
  });

  return [...quoteEntries, ...jobEntries];
}

export function entryMatchesStatus(entry: QueueEntry, filter: QueueFilter): boolean {
  if (filter === 'all') return true;

  if (entry.kind === 'job') {
    const status = (entry.job.status ?? '').trim().toLowerCase();
    if (filter === 'review') return status === 'draft';
    if (filter === 'inspect') return status === 'inspection';
    // A confirmed saved job does not prove a sent quote, acceptance or payment.
    return false;
  }

  const quote = entry.quote;
  const status = (quote.status ?? 'draft').trim().toLowerCase();
  if (filter === 'paid') return quote.deposit_paid === true;
  if (filter === 'accepted') return status === 'accepted';
  if (filter === 'inspect') {
    return quote.needs_inspection === true || quote.inspection_required === true;
  }
  if (filter === 'sent') return status === 'sent';
  return IN_REVIEW_STATUSES.has(status);
}

function normalizeSearchText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

export function parseQueueSearchTerms(query: string): string[] {
  return normalizeSearchText(query).split(' ').filter(Boolean);
}

function quoteSearchFields(quote: QuoteRow): unknown[] {
  return [
    quote.customer_full_name,
    quote.customer_first_name,
    quote.suburb,
    quote.job_type,
    quote.trade,
    quote.scope_of_works,
    quote.share_token,
    quote.status,
    quote.deposit_paid ? 'deposit paid' : null,
    quote.needs_inspection || quote.inspection_required ? 'inspection required' : null,
    IN_REVIEW_STATUSES.has((quote.status ?? 'draft').toLowerCase()) ? 'in review' : null,
  ];
}

function jobSearchFields(job: TradeJob): unknown[] {
  const status = (job.status ?? '').toLowerCase();
  return [
    job.address,
    job.headline,
    job.trade,
    job.id,
    job.status,
    status === 'confirmed' ? 'confirmed' : null,
    status === 'inspection' ? 'inspection required' : null,
    status === 'draft' ? 'awaiting your review in review' : null,
  ];
}

export function entryMatchesSearch(entry: QueueEntry, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  const fields = entry.kind === 'quote' ? quoteSearchFields(entry.quote) : jobSearchFields(entry.job);
  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '));
  return terms.every(term => haystack.includes(normalizeSearchText(term)));
}

function validInstant(value: string | null | undefined): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function instantMs(entry: QueueEntry): number | null {
  return validInstant(entry.createdAt) ? Date.parse(entry.createdAt) : null;
}

function comparePresentNumbers(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * direction;
}

function stableKeyTie(a: QueueEntry, b: QueueEntry): number {
  return a.key.localeCompare(b.key);
}

/** Missing timestamps/amounts always sink; deterministic keys eliminate source-order flicker. */
export function compareQueueEntries(a: QueueEntry, b: QueueEntry, sort: QueueSort): number {
  if (sort === 'newest' || sort === 'oldest') {
    const primary = comparePresentNumbers(
      instantMs(a),
      instantMs(b),
      sort === 'newest' ? -1 : 1,
    );
    return primary || stableKeyTie(a, b);
  }

  const primary = comparePresentNumbers(a.amount, b.amount, sort === 'value_desc' ? -1 : 1);
  if (primary) return primary;
  // Equal values remain useful and stable: newest first, then a namespaced deterministic key.
  const dateTie = comparePresentNumbers(instantMs(a), instantMs(b), -1);
  return dateTie || stableKeyTie(a, b);
}

export type DateRangeValidation = {
  from: string | null;
  to: string | null;
  fromError: string | null;
  toError: string | null;
  valid: boolean;
};

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month! - 1 &&
    candidate.getUTCDate() === day
  );
}

export function validateQueueDateRange(fromInput: string, toInput: string): DateRangeValidation {
  const from = fromInput.trim();
  const to = toInput.trim();
  let fromError = from && !validCalendarDate(from) ? 'Use a real date in YYYY-MM-DD format.' : null;
  let toError = to && !validCalendarDate(to) ? 'Use a real date in YYYY-MM-DD format.' : null;

  if (!fromError && !toError && from && to && from > to) {
    fromError = 'From must be on or before To.';
    toError = 'To must be on or after From.';
  }

  return {
    from: from && !fromError ? from : null,
    to: to && !toError ? to : null,
    fromError,
    toError,
    valid: !fromError && !toError,
  };
}

export function isSupportedQueueTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    new Intl.DateTimeFormat('en-AU', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

const STATE_TIME_ZONES: Readonly<Record<string, string>> = {
  NSW: 'Australia/Sydney',
  VIC: 'Australia/Sydney',
  ACT: 'Australia/Sydney',
  TAS: 'Australia/Sydney',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  NT: 'Australia/Darwin',
  WA: 'Australia/Perth',
};

/** Mirrors the backend booking authority: explicit tenant availability zone, then tenant state. */
export function queueTimeZone(
  availabilityTimeZone: unknown,
  tenantState: string | null | undefined,
): string {
  if (isSupportedQueueTimeZone(availabilityTimeZone)) return availabilityTimeZone;
  return STATE_TIME_ZONES[(tenantState ?? '').trim().toUpperCase()] ?? 'Australia/Sydney';
}

/** Convert an instant to its YYYY-MM-DD calendar day in the tenant's zone, never device-local. */
export function queueCalendarDay(instant: string | null, timeZone: string): string | null {
  if (!validInstant(instant) || !isSupportedQueueTimeZone(timeZone)) return null;
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function entryMatchesDate(
  entry: QueueEntry,
  range: DateRangeValidation,
  timeZone: string,
): boolean {
  if (!range.valid || (!range.from && !range.to)) return true;
  const day = queueCalendarDay(entry.createdAt, timeZone);
  if (!day) return false;
  return (!range.from || day >= range.from) && (!range.to || day <= range.to);
}

function entryMatchesTrade(entry: QueueEntry, trade: QueueTradeFilter): boolean {
  return trade === 'all' || entry.trade === normalizeQueueTrade(trade);
}

/** Apply all non-status criteria, shared by visible rows and every status-chip count. */
export function queueBaseMatches(
  entry: QueueEntry,
  criteria: Pick<QueueCriteria, 'search' | 'trade' | 'from' | 'to' | 'timeZone'>,
): boolean {
  const terms = parseQueueSearchTerms(criteria.search);
  const range = validateQueueDateRange(criteria.from, criteria.to);
  return (
    entryMatchesTrade(entry, criteria.trade) &&
    entryMatchesSearch(entry, terms) &&
    entryMatchesDate(entry, range, criteria.timeZone)
  );
}

export function filterAndSortQueue(entries: readonly QueueEntry[], criteria: QueueCriteria): QueueEntry[] {
  return entries
    .filter(entry => queueBaseMatches(entry, criteria) && entryMatchesStatus(entry, criteria.status))
    .sort((a, b) => compareQueueEntries(a, b, criteria.sort));
}

/** Counts reflect the same merged/search/trade/date population as the displayed result. */
export function queueStatusCounts(
  entries: readonly QueueEntry[],
  criteria: Pick<QueueCriteria, 'search' | 'trade' | 'from' | 'to' | 'timeZone'>,
): Record<QueueFilter, number> {
  const base = entries.filter(entry => queueBaseMatches(entry, criteria));
  return Object.fromEntries(
    QUEUE_FILTERS.map(option => [
      option.key,
      base.filter(entry => entryMatchesStatus(entry, option.key)).length,
    ]),
  ) as Record<QueueFilter, number>;
}

export function presentQueueTrades(
  entries: readonly QueueEntry[],
  permittedTrades: readonly string[],
): string[] {
  const present = new Set(entries.map(entry => entry.trade).filter((trade): trade is string => !!trade));
  return permittedTrades
    .map(normalizeQueueTrade)
    .filter((trade): trade is string => trade != null && present.has(trade))
    .filter((trade, index, all) => all.indexOf(trade) === index);
}
