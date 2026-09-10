/**
 * Quote status vocabulary for the Quotes tab (spec web-parity D1–D3).
 *
 * Mirrors the web dashboard's own status logic — `quoteMatchesFilter`, `quoteBadges`, and
 * `canSendQuote`/`confirmSendCta` in quotemate-automation/app/dashboard/page.tsx and
 * lib/quote/send-customer.ts — over the mobile `QuoteRow` subset from `@/lib/tenant`. Kept pure
 * and colocated so `/review` can check it directly against those web sources.
 */
import { relativeTime } from '@/features/chats/format';
import { IN_REVIEW_STATUSES, isAccepted, type QuoteRow } from '@/lib/tenant';

export type QuoteTone = 'ok' | 'warn' | 'dim';

export type QuoteFilterKey = 'all' | 'review' | 'sent' | 'accepted';

export const QUOTE_FILTERS: { key: QuoteFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'review', label: 'In review' },
  { key: 'sent', label: 'Sent' },
  { key: 'accepted', label: 'Accepted' },
];

/**
 * Web Quotes-tab "In review" filter set (page.tsx `quoteMatchesFilter`): the
 * `drafted | awaiting_review | review | awaiting_tradie_approval` set the OverviewTab already
 * shares as `IN_REVIEW_STATUSES`, plus the legacy `draft` value. A missing status reads as
 * `draft` (web parity — `q.status ?? 'draft'`).
 */
const REVIEW_STATUSES = new Set([...IN_REVIEW_STATUSES, 'draft']);

function status(quote: QuoteRow): string {
  return (quote.status ?? 'draft').toLowerCase();
}

export function matchesFilter(quote: QuoteRow, filter: QuoteFilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'accepted') return isAccepted(quote);
  if (filter === 'sent') return status(quote) === 'sent';
  return REVIEW_STATUSES.has(status(quote));
}

type QuoteBadge = { label: string; tone: QuoteTone };

/**
 * The single most-actionable status chip for a row (web parity: `quoteBadges(q)[0]` — deposit
 * paid, then inspection, then the plain-language status). The web keeps a stacked badge list;
 * mobile shows one chip per row to fit a compact list (ponytail: the detail view can grow a
 * second line later if a tradie asks for it).
 */
export function quoteBadge(quote: QuoteRow): QuoteBadge {
  if (
    quote.quote_kind === 'balance' &&
    (quote.deposit_paid || quote.paid_at || status(quote) === 'paid')
  ) {
    return { label: 'Paid in full', tone: 'ok' };
  }
  if (quote.deposit_paid) return { label: 'Deposit paid', tone: 'ok' };
  if (quote.needs_inspection || quote.inspection_required)
    return { label: 'Inspection required', tone: 'dim' };
  const s = status(quote);
  if (s === 'accepted') return { label: 'Accepted', tone: 'ok' };
  if (s === 'sent') return { label: 'Sent to customer', tone: 'ok' };
  return { label: 'Awaiting your review', tone: 'warn' };
}

/** Keep the chain position visible alongside the payment/review status. */
export function quoteBadges(quote: QuoteRow): QuoteBadge[] {
  const chain: QuoteBadge[] =
    quote.quote_kind === 'final'
      ? [{ label: 'Final quote', tone: 'dim' }]
      : quote.quote_kind === 'balance'
        ? [{ label: 'Balance', tone: 'dim' }]
        : [];
  return [...chain, quoteBadge(quote)];
}

export function inspectionExplanation(quote: QuoteRow): string | null {
  if (quote.inspection_cause === 'grounding_failed') {
    return 'Pricing could not be verified against your catalogue. Review the missing pricing evidence before releasing this estimate.';
  }
  if (quote.inspection_cause === 'site_conditions') {
    return 'A site inspection is needed to confirm the conditions and scope before a final quote.';
  }
  if (quote.inspection_cause === 'model_declared') {
    return 'The draft flagged details that need inspection and your review before a final quote.';
  }
  return null;
}

/**
 * Approve only ever does something when the quote is actually held for the tradie's one-tap
 * review — `POST /api/quote/[id]/approve` no-ops (returns `already_actioned`) for any other
 * status, so the button is hidden rather than offering a no-op tap.
 */
export function canApprove(quote: QuoteRow): boolean {
  return (
    knownQuoteKind(quote) &&
    quote.quote_kind !== 'balance' &&
    !quote.paid_at &&
    !quote.deposit_paid &&
    status(quote) === 'awaiting_tradie_approval'
  );
}

function knownQuoteKind(quote: QuoteRow): boolean {
  return quote.quote_kind == null || ['initial', 'final', 'balance'].includes(quote.quote_kind);
}

/** Final/balance delivery is SMS-only in the current server contract. */
export function quoteDeliveryChannels(quote: QuoteRow): readonly ('sms' | 'email')[] {
  if (!knownQuoteKind(quote)) return [];
  return quote.quote_kind === 'final' || quote.quote_kind === 'balance'
    ? ['sms']
    : ['sms', 'email'];
}

/** Child payment slugs are server-defined; reusing a G/B/B slug would request the wrong action. */
export function quotePaymentLink(quote: QuoteRow): { path: string; label: string } | null {
  if (!quote.share_token || !knownQuoteKind(quote) || quote.paid_at || quote.deposit_paid)
    return null;
  const token = encodeURIComponent(quote.share_token);
  if (quote.quote_kind === 'balance')
    return { path: `/r/${token}/balance`, label: 'Share balance payment link' };
  if (quote.quote_kind === 'final')
    return { path: `/r/${token}/deposit`, label: 'Share deposit link' };
  if (quote.needs_inspection || quote.inspection_required) return null;
  const tier = quote.selected_tier ?? 'better';
  if (!['good', 'better', 'best'].includes(tier)) return null;
  return { path: `/r/${token}/${tier}`, label: 'Share deposit link' };
}

/**
 * Web `confirmSendCta` show-logic parity (lib/quote/send-customer.ts): the send endpoint works
 * from ANY pre-payment status — a send from a held quote IS the tradie's approval, and a resend
 * of a sent quote is a legitimate nudge. Hidden once the customer has committed: paid/accepted
 * statuses (which the endpoint also 409s via `canSendQuote`) plus deposit-paid quotes whose
 * status hasn't caught up yet.
 */
export function canSend(quote: QuoteRow): boolean {
  if (
    !knownQuoteKind(quote) ||
    quote.quote_kind === 'balance' ||
    quote.deposit_paid ||
    quote.paid_at
  )
    return false;
  const s = status(quote);
  return s !== 'paid' && s !== 'accepted';
}

/** Already-delivered quotes get resend wording (web `confirmSendCta`: sent/viewed relabel the
 *  same action — the endpoint itself is identical either way). */
export function isResend(quote: QuoteRow): boolean {
  const s = status(quote);
  return s === 'sent' || s === 'viewed';
}

export function customerLabel(quote: QuoteRow): string {
  return quote.customer_full_name ?? quote.customer_first_name ?? 'Customer';
}

/** `hot_water_replace` → `Hot water replace` (web parity: page.tsx `formatJobType`). */
export function formatJobType(jobType: string | null | undefined): string {
  if (!jobType) return '—';
  const spaced = jobType.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Compact relative age for a queue row ("4 min ago" … "Yesterday"), else `DD/MM/YYYY` — never
 *  US-style (au-conventions). Web parity: page.tsx `relTime`, cased to sentence case for mobile.
 *  Re-worded on top of chats' `relativeTime` diff math (no second date-diff engine): its compact
 *  `12m`/`3h`/`5d` codes get the sentence-case wording here, and its 7-day-plus `DD Mon` fallback
 *  gets reformatted from the same `iso` as `DD/MM/YYYY`. */
export function quoteAge(iso: string): string {
  const compact = relativeTime(iso);
  if (compact === 'Just now' || compact === '') return compact;
  const match = /^(\d+)([mhd])$/.exec(compact);
  if (!match) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  const [, amount, unit] = match;
  if (unit === 'm') return `${amount} min ago`;
  if (unit === 'h') return `${amount} hr ago`;
  return amount === '1' ? 'Yesterday' : `${amount} days ago`;
}
