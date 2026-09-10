import type { QuoteRow } from '@/lib/tenant';

/** Report persisted observations without inferring a send from a payment. */
export function quoteActivity(quote: QuoteRow): { label: string; at: string | null }[] {
  const events: { label: string; at: string | null }[] = [
    { label: 'Quote created', at: quote.created_at },
  ];
  if (quote.sent_at) events.push({ label: 'Delivery recorded', at: quote.sent_at });
  else if (quote.status?.toLowerCase() === 'sent')
    events.push({ label: 'Server status: sent', at: null });
  if (quote.paid_at || quote.deposit_paid) {
    const label =
      quote.paid_tier === 'inspection'
        ? 'Site visit paid'
        : quote.quote_kind === 'balance' || quote.paid_tier === 'balance'
          ? 'Balance paid'
          : quote.paid_tier === 'deposit'
            ? 'Deposit paid'
            : quote.paid_tier === 'credit'
              ? 'Inspection credit applied'
              : 'Payment recorded';
    events.push({ label, at: quote.paid_at ?? null });
  } else if (quote.status?.toLowerCase() === 'accepted')
    events.push({ label: 'Accepted', at: null });
  return events;
}
