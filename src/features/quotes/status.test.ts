import type { QuoteRow } from '@/lib/tenant';

import {
  canApprove,
  canSend,
  customerLabel,
  formatJobType,
  matchesFilter,
  quoteAge,
  quoteBadge,
} from './status';

const quote = (over: Record<string, unknown>): QuoteRow =>
  ({ id: 'q1', created_at: '2026-08-21T00:00:00Z', ...over }) as QuoteRow;

describe('matchesFilter (web Quotes-tab parity)', () => {
  it('review catches drafted, awaiting_review, review and legacy draft', () => {
    for (const status of ['drafted', 'awaiting_review', 'review', 'draft']) {
      expect(matchesFilter(quote({ status }), 'review')).toBe(true);
    }
    expect(matchesFilter(quote({ status: 'sent' }), 'review')).toBe(false);
  });

  it('sent is exact-status only', () => {
    expect(matchesFilter(quote({ status: 'sent' }), 'sent')).toBe(true);
    expect(matchesFilter(quote({ status: 'accepted' }), 'sent')).toBe(false);
  });

  it('accepted reuses isAccepted (deposit_paid OR status=accepted)', () => {
    expect(matchesFilter(quote({ deposit_paid: true, status: 'sent' }), 'accepted')).toBe(true);
    expect(matchesFilter(quote({ status: 'accepted' }), 'accepted')).toBe(true);
    expect(matchesFilter(quote({ status: 'sent' }), 'accepted')).toBe(false);
  });

  it('all always matches', () => {
    expect(matchesFilter(quote({ status: 'paid' }), 'all')).toBe(true);
  });
});

describe('quoteBadge (web quoteBadges[0] parity)', () => {
  it('deposit paid wins over status', () => {
    expect(quoteBadge(quote({ deposit_paid: true, status: 'drafted' }))).toEqual({
      label: 'Deposit paid',
      tone: 'ok',
    });
  });

  it('inspection required when not yet paid', () => {
    expect(quoteBadge(quote({ needs_inspection: true, status: 'drafted' }))).toEqual({
      label: 'Inspection required',
      tone: 'dim',
    });
  });

  it('falls back to Awaiting your review for held/drafted states', () => {
    expect(quoteBadge(quote({ status: 'awaiting_tradie_approval' })).label).toBe(
      'Awaiting your review',
    );
  });
});

describe('canApprove / canSend', () => {
  it('approve only fires for the held-for-approval status (endpoint parity)', () => {
    expect(canApprove(quote({ status: 'awaiting_tradie_approval' }))).toBe(true);
    expect(canApprove(quote({ status: 'drafted' }))).toBe(false);
    expect(canApprove(quote({ status: 'sent' }))).toBe(false);
  });

  it('send covers every pre-send review state', () => {
    expect(canSend(quote({ status: 'drafted' }))).toBe(true);
    expect(canSend(quote({ status: 'awaiting_tradie_approval' }))).toBe(true);
    expect(canSend(quote({ status: 'sent' }))).toBe(false);
    expect(canSend(quote({ status: 'accepted' }))).toBe(false);
  });
});

describe('customerLabel', () => {
  it('prefers full name, falls back to first name then Customer', () => {
    expect(customerLabel(quote({ customer_full_name: 'Sam Lee' }))).toBe('Sam Lee');
    expect(customerLabel(quote({ customer_first_name: 'Sam' }))).toBe('Sam');
    expect(customerLabel(quote({}))).toBe('Customer');
  });
});

describe('quoteAge', () => {
  it('renders a DD/MM/YYYY fallback for old quotes, never US-style', () => {
    expect(quoteAge('2020-01-15T00:00:00Z')).toBe('15/01/2020');
  });

  it('reads just now for a fresh timestamp', () => {
    expect(quoteAge(new Date().toISOString())).toBe('Just now');
  });
});

describe('formatJobType', () => {
  it('underscores to spaces, sentence case, dash for missing', () => {
    expect(formatJobType('hot_water_replace')).toBe('Hot water replace');
    expect(formatJobType(null)).toBe('—');
  });
});
