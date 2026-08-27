import { ApiError } from './api';
import { centsFromApiDollars } from './money';
import { isAccepted, isTenantMissing, overviewStats, tenantTrades } from './tenant';

describe('isTenantMissing', () => {
  it('is true only for QuoteMax’s own no_tenant marker', () => {
    expect(
      isTenantMissing(new ApiError('x', 404, '/api/tenant/me', { error: 'no_tenant' })),
    ).toBe(true);
  });

  it('is FALSE for a bare 404 — a wrong base URL must not trap a tradie in onboarding', () => {
    expect(isTenantMissing(new ApiError('x', 404, '/api/tenant/me', undefined))).toBe(false);
    // What another app running on the port actually returns: an HTML page, so no parsed body.
    expect(isTenantMissing(new ApiError('x', 404, '/api/tenant/me', { error: 'not_found' }))).toBe(
      false,
    );
  });

  it('is false for unauthorised and for non-ApiError failures', () => {
    expect(isTenantMissing(new ApiError('x', 401, '/api/tenant/me', { error: 'unauthorized' }))).toBe(
      false,
    );
    expect(isTenantMissing(new TypeError('Network request failed'))).toBe(false);
  });
});

const quote = (over: Record<string, unknown>) => ({
  id: 'q1',
  created_at: '2026-08-21T00:00:00Z',
  ...over,
});

describe('overviewStats (web OverviewTab parity)', () => {
  it('counts deposit_paid and status=accepted as accepted', () => {
    const stats = overviewStats([
      quote({ total_inc_gst: 100, deposit_paid: true }),
      quote({ id: 'q2', total_inc_gst: 300, status: 'accepted' }),
      quote({ id: 'q3', total_inc_gst: 200, status: 'sent' }),
    ]);
    expect(stats.quotedCents).toBe(60000);
    expect(stats.acceptedCents).toBe(40000);
    expect(stats.conversionPct).toBe(67);
    expect(stats.avgQuoteCents).toBe(20000);
  });

  it('counts drafted, awaiting_review, review and awaiting_tradie_approval as the backlog', () => {
    const stats = overviewStats([
      quote({ status: 'drafted' }),
      quote({ id: 'q2', status: 'awaiting_review' }),
      quote({ id: 'q3', status: 'review' }),
      quote({ id: 'q4', status: 'awaiting_tradie_approval' }),
      quote({ id: 'q5', status: 'sent' }),
    ]);
    expect(stats.inReviewCount).toBe(4);
  });

  it('averages over ALL quotes — unpriced ones count as $0 (web OverviewTab parity)', () => {
    const stats = overviewStats([
      quote({ total_inc_gst: 100 }),
      quote({ id: 'q2', status: 'drafted' }),
    ]);
    expect(stats.avgQuoteCents).toBe(5000);
  });

  it('ignores unpriced quotes in totals without dividing by zero', () => {
    const stats = overviewStats([quote({ status: 'drafted' })]);
    expect(stats.quotedCents).toBe(0);
    expect(stats.avgQuoteCents).toBe(0);
    expect(stats.conversionPct).toBe(0);
  });

  it('converts API dollars to integer cents, half away from zero', () => {
    expect(centsFromApiDollars(1234.565)).toBe(123457);
    expect(
      overviewStats([quote({ total_inc_gst: 0.1 }), quote({ id: 'q2', total_inc_gst: 0.2 })])
        .quotedCents,
    ).toBe(30);
  });
});

describe('isAccepted', () => {
  it('is false for a sent, unpaid quote', () => {
    expect(isAccepted(quote({ status: 'sent' }) as never)).toBe(false);
  });

  it('matches status case-insensitively, like the web OverviewTab', () => {
    expect(isAccepted(quote({ status: 'Accepted' }) as never)).toBe(true);
  });
});

describe('tenantTrades', () => {
  it('prefers trades[] and falls back to the legacy single trade', () => {
    expect(tenantTrades({ tenant: { id: 't', trades: ['roofing'] }, quotes: [] } as never)).toEqual(
      ['roofing'],
    );
    expect(tenantTrades({ tenant: { id: 't', trade: 'electrical' }, quotes: [] } as never)).toEqual(
      ['electrical'],
    );
    expect(tenantTrades({ tenant: { id: 't' }, quotes: [] } as never)).toEqual([]);
  });
});
