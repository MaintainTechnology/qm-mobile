import type { QuoteRow } from '@/lib/tenant';

import {
  canApprove,
  canSend,
  customerLabel,
  formatJobType,
  isResend,
  matchesFilter,
  quoteAge,
  quoteBadge,
  quoteBadges,
  quoteDeliveryChannels,
  quotePaymentLink,
  inspectionExplanation,
} from './status';

const quote = (over: Record<string, unknown>): QuoteRow =>
  ({ id: 'q1', created_at: '2026-08-21T00:00:00Z', ...over }) as QuoteRow;

it('keeps final/balance SMS-only and unfamiliar quote kinds non-actionable', () => {
  expect(quoteDeliveryChannels(quote({}))).toEqual(['sms', 'email']);
  expect(quoteDeliveryChannels(quote({ quote_kind: 'final' }))).toEqual(['sms']);
  expect(quoteDeliveryChannels(quote({ quote_kind: 'balance' }))).toEqual(['sms']);
  const unfamiliar = quote({ quote_kind: 'future', status: 'awaiting_tradie_approval' });
  expect(quoteDeliveryChannels(unfamiliar)).toEqual([]);
  expect(canSend(unfamiliar)).toBe(false);
  expect(canApprove(unfamiliar)).toBe(false);
  expect(canSend(quote({ quote_kind: 'balance', status: 'draft' }))).toBe(false);
  expect(canApprove(quote({ quote_kind: 'balance', status: 'awaiting_tradie_approval' }))).toBe(
    false,
  );
});

it('shares the correct server payment action for each unpaid chain child', () => {
  expect(
    quotePaymentLink(quote({ quote_kind: 'final', share_token: 'token', selected_tier: 'better' }))
      ?.path,
  ).toBe('/r/token/deposit');
  expect(
    quotePaymentLink(quote({ quote_kind: 'balance', share_token: 'token', selected_tier: 'good' }))
      ?.path,
  ).toBe('/r/token/balance');
  expect(
    quotePaymentLink(quote({ quote_kind: 'balance', share_token: 'token', paid_at: '2026-09-08' })),
  ).toBeNull();
});

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
  it('distinguishes each chain link and a paid balance from a deposit', () => {
    expect(quoteBadges(quote({ quote_kind: 'final', status: 'draft' })).map(b => b.label)).toEqual([
      'Final quote',
      'Awaiting your review',
    ]);
    expect(
      quoteBadges(quote({ quote_kind: 'balance', deposit_paid: true })).map(b => b.label),
    ).toEqual(['Balance', 'Paid in full']);
    expect(quoteBadge(quote({ inspection_required: true })).label).toBe('Inspection required');
  });

  it('never disguises failed grounding as site-condition uncertainty', () => {
    const copy = inspectionExplanation(quote({ inspection_cause: 'grounding_failed' }));
    expect(copy).toContain('catalogue');
    expect(copy).not.toContain('site inspection');
    expect(inspectionExplanation(quote({ inspection_cause: 'future-cause' }))).toBeNull();
  });
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
  it('blocks actions when payment evidence is fresher than the status/legacy flag', () => {
    const paid = quote({
      paid_at: '2026-09-08T00:00:00Z',
      status: 'awaiting_tradie_approval',
      deposit_paid: false,
    });
    expect(canApprove(paid)).toBe(false);
    expect(canSend(paid)).toBe(false);
  });
  it('approve only fires for the held-for-approval status (endpoint parity)', () => {
    expect(canApprove(quote({ status: 'awaiting_tradie_approval' }))).toBe(true);
    expect(canApprove(quote({ status: 'drafted' }))).toBe(false);
    expect(canApprove(quote({ status: 'sent' }))).toBe(false);
  });

  it('send covers every pre-payment status, resend included (web confirmSendCta parity)', () => {
    expect(canSend(quote({ status: 'drafted' }))).toBe(true);
    expect(canSend(quote({ status: 'awaiting_tradie_approval' }))).toBe(true);
    expect(canSend(quote({ status: 'sent' }))).toBe(true);
    expect(canSend(quote({ status: 'viewed' }))).toBe(true);
    expect(canSend(quote({ status: 'accepted' }))).toBe(false);
    expect(canSend(quote({ status: 'paid' }))).toBe(false);
    expect(canSend(quote({ status: 'sent', deposit_paid: true }))).toBe(false);
  });

  it('isResend relabels only already-delivered quotes', () => {
    expect(isResend(quote({ status: 'sent' }))).toBe(true);
    expect(isResend(quote({ status: 'viewed' }))).toBe(true);
    expect(isResend(quote({ status: 'drafted' }))).toBe(false);
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
