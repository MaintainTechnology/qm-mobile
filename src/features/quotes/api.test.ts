/**
 * `sendQuoteVars` mirrors the web SendQuotePanel's `to` rule (app/dashboard/quote/[token]/
 * SendQuotePanel.tsx) — the server owns recipient fallback, so an override must ONLY go up when
 * the tradie actually typed one. These cases are the web component's own branches, verbatim.
 */
import { sendQuoteVars } from './api';

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
