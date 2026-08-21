import { ApiError } from '@/lib/api';

import { explainJobQuoteFailure, priceLabel } from './schema';

describe('explainJobQuoteFailure', () => {
  it('surfaces field issues verbatim', () => {
    const err = new ApiError('POST /api/tenant/job-quote failed', 400, '/api/tenant/job-quote', {
      issues: ['address is required'],
    });
    expect(explainJobQuoteFailure(err)).toBe('address is required');
  });

  it('maps not_entitled with the reason', () => {
    const err = new ApiError('failed', 402, '/x', { error: 'not_entitled', reason: 'trial expired' });
    expect(explainJobQuoteFailure(err)).toBe('Quoting is not enabled on your plan (trial expired).');
  });

  it('tells the tradie to check the Quotes tab once an intake exists', () => {
    const err = new ApiError('failed', 502, '/x', { error: 'pipeline_failed', intakeId: 'abc' });
    expect(explainJobQuoteFailure(err)).toContain('check the Quotes tab');
  });

  it('falls back to a status-coded message for an unrecognised error', () => {
    const err = new ApiError('failed', 500, '/x', {});
    expect(explainJobQuoteFailure(err)).toBe(
      'Could not draft the quote (500). The quote may still have been drafted — check the Quotes tab before retrying.',
    );
  });
});

describe('priceLabel', () => {
  it('formats the exact catalogue price via money.ts with a GST basis — never rounds it away', () => {
    expect(priceLabel(36.4)).toBe('A$36.40 ex GST');
    expect(priceLabel('287.9')).toBe('A$287.90 ex GST');
    expect(priceLabel(null)).toBeNull();
  });
});
