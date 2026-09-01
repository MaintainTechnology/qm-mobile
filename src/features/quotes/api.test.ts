/**
 * `sendQuoteVars` mirrors the web SendQuotePanel's `to` rule (app/dashboard/quote/[token]/
 * SendQuotePanel.tsx) — the server owns recipient fallback, so an override must ONLY go up when
 * the tradie actually typed one. These cases are the web component's own branches, verbatim.
 */
import { ApiError } from '@/lib/api';

import {
  actionErrorMessage,
  QuoteActionResultSchema,
  quoteActionNotice,
  sendQuoteVars,
} from './api';

describe('sendQuoteVars (web SendQuotePanel `to` rule)', () => {
  it('SMS with a number on file never overrides — the input is hidden on web', () => {
    expect(sendQuoteVars('q1', 'sms', '+61400000000', '')).toEqual({
      quoteId: 'q1',
      channel: 'sms',
    });
    // Even stray typed text loses to the on-file number, exactly as the web computes it.
    expect(sendQuoteVars('q1', 'sms', '+61400000000', '0411 222 333')).toEqual({
      quoteId: 'q1',
      channel: 'sms',
    });
  });

  it('SMS without a number on file passes the typed number, trimmed', () => {
    expect(sendQuoteVars('q1', 'sms', null, ' 0411 222 333 ')).toEqual({
      quoteId: 'q1',
      channel: 'sms',
      to: '0411 222 333',
    });
  });

  it('SMS with nothing on file and nothing typed omits `to` (server resolves or 400s)', () => {
    expect(sendQuoteVars('q1', 'sms', null, '  ')).toEqual({ quoteId: 'q1', channel: 'sms' });
  });

  it('email passes a typed address only when it differs from the one on file', () => {
    expect(sendQuoteVars('q1', 'email', null, ' pat@example.com ')).toEqual({
      quoteId: 'q1',
      channel: 'email',
      to: 'pat@example.com',
    });
    expect(sendQuoteVars('q1', 'email', 'pat@example.com', 'pat@example.com')).toEqual({
      quoteId: 'q1',
      channel: 'email',
    });
  });

  it('email left blank omits `to` — the server falls back to the on-file address', () => {
    expect(sendQuoteVars('q1', 'email', null, '')).toEqual({ quoteId: 'q1', channel: 'email' });
  });
});

describe('quote action outcomes', () => {
  it('retains the approve no-op fields and never turns a rejected state into Sent copy', () => {
    const result = QuoteActionResultSchema.parse({
      ok: true,
      already_actioned: true,
      status: 'rejected',
      message: "Quote is in state 'rejected' — nothing to approve.",
      sid: 'ignored-extra-field',
    });

    expect(result).toMatchObject({ already_actioned: true, status: 'rejected' });
    expect(quoteActionNotice(result, 'approve')).toEqual({
      kind: 'already_actioned',
      message: "Quote is in state 'rejected' — nothing to approve.",
    });
  });

  it('claims delivery only when the server explicitly returns status sent', () => {
    expect(quoteActionNotice({ ok: true, status: 'sent' }, 'approve')).toEqual({
      kind: 'sent',
      message: 'Approved and sent.',
    });
    expect(quoteActionNotice({ ok: true }, 'send')).toEqual({
      kind: 'reconciled',
      message:
        'Quote action accepted. The current quote has been refreshed; delivery was not confirmed.',
    });
  });

  it('distinguishes an ambiguous timeout from a provider rejection', () => {
    const timeout = new Error('aborted');
    timeout.name = 'AbortError';
    expect(actionErrorMessage(timeout)).toContain('did not confirm whether that was sent');

    const provider = new ApiError('send failed', 502, '/api/quote/q1/send', {
      detail: 'SMS provider rejected the recipient.',
    });
    expect(actionErrorMessage(provider)).toBe('SMS provider rejected the recipient.');
  });
});
