import { ApiError } from '@/lib/api';

import { explainJobQuoteFailure, JobQuoteOperationSchema, priceLabel } from './schema';

describe('explainJobQuoteFailure', () => {
  it('surfaces field issues verbatim', () => {
    const err = new ApiError('POST /api/tenant/job-quote failed', 400, '/api/tenant/job-quote', {
      issues: ['address is required'],
    });
    expect(explainJobQuoteFailure(err)).toBe('address is required');
  });

  it('maps not_entitled with the reason', () => {
    const err = new ApiError('failed', 402, '/x', {
      error: 'not_entitled',
      reason: 'trial expired',
    });
    expect(explainJobQuoteFailure(err)).toBe(
      'Quoting is not enabled on your plan (trial expired).',
    );
  });

  it('tells the tradie to check the Quotes tab once an intake exists', () => {
    const err = new ApiError('failed', 502, '/x', { error: 'pipeline_failed', intakeId: 'abc' });
    expect(explainJobQuoteFailure(err)).toContain('check the Quotes tab');
  });

  it('falls back to a status-coded message for an unrecognised error', () => {
    const err = new ApiError('failed', 500, '/x', {});
    expect(explainJobQuoteFailure(err)).toBe(
      'Could not draft the quote (500). The quote may still have been drafted — refresh draft status or check the Quotes tab.',
    );
  });
});

it('accepts explicit processing without treating it as a saved draft, and rejects incomplete completed receipts', () => {
  const base = {
    ok: true,
    operationId: 'dddddddd-1111-4111-8111-dddddddddddd',
    pinned: false,
    pinRequested: false,
  };
  expect(JobQuoteOperationSchema.safeParse({ ...base, status: 'processing' }).success).toBe(true);
  expect(JobQuoteOperationSchema.safeParse({ ...base, status: 'completed' }).success).toBe(false);
  expect(
    JobQuoteOperationSchema.safeParse({ ...base, status: 'quote_available', quoteId: 'bad' })
      .success,
  ).toBe(false);
  expect(
    JobQuoteOperationSchema.safeParse({
      ...base,
      status: 'completed',
      quoteId: 'eeeeeeee-1111-4111-8111-eeeeeeeeeeee',
      intakeId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      shareToken: null,
      needsInspection: true,
    }).success,
  ).toBe(true);
});

describe('priceLabel', () => {
  it('formats the exact catalogue price via money.ts with a GST basis — never rounds it away', () => {
    expect(priceLabel(36.4)).toBe('A$36.40 ex GST');
    expect(priceLabel('287.9')).toBe('A$287.90 ex GST');
    expect(priceLabel(null)).toBeNull();
    expect(priceLabel('')).toBeNull();
    expect(priceLabel('36.4 invalid')).toBeNull();
    expect(priceLabel(-1)).toBeNull();
    expect(priceLabel('0')).toBe('A$0.00 ex GST');
  });
});
