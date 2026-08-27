/**
 * Web-parity assertions for the trade-hub model. Expected values are copied
 * from quotemate-automation/app/dashboard/page.tsx (TRADE_HUB_SLUGS,
 * HUB_SECTION_LABELS, quoteMatchesFilter, sort comparator) and
 * lib/dashboard/quote-filters.ts — update both sides together.
 */
import type { QuoteRow } from '@/lib/tenant';

import {
  compareQuotes,
  HUB_SECTION_LABELS,
  hubSections,
  hubSubtitle,
  hubTrades,
  padCount,
  parseSearchTerms,
  queueMatchesFilter,
  quoteCountForTrade,
  quoteMatchesSearch,
} from './sections';

function quote(overrides: Partial<QuoteRow>): QuoteRow {
  return { id: 'q1', created_at: '2026-08-07T03:45:00Z', ...overrides } as QuoteRow;
}

describe('hubTrades', () => {
  it('keeps only hub-capable trades, in the web hub order', () => {
    expect(hubTrades(['plumbing', 'electrical', 'carpentry'])).toEqual(['electrical', 'plumbing']);
  });

  it('is case-insensitive like the web hubEnabled', () => {
    expect(hubTrades(['Electrical'])).toEqual(['electrical']);
  });
});

describe('sections', () => {
  it('matches the web order: quotes, tools, pricing, services, catalogue, recipes, estimating', () => {
    expect(hubSections('electrical')).toEqual([
      'quotes',
      'tools',
      'pricing',
      'services',
      'catalogue',
      'recipes',
      'estimating',
    ]);
  });

  it('labels Services & brands exactly as the web does', () => {
    expect(HUB_SECTION_LABELS.services).toBe('Services & brands');
  });

  it('gives Electrical the SECTIONS 07 counter from the screenshot', () => {
    expect(padCount(hubSections('electrical').length)).toBe('07');
  });

  it('writes the web subtitle sentence verbatim', () => {
    expect(hubSubtitle('electrical')).toBe(
      'Everything for your electrical work in one place — quotes, tools, pricing, services, brands, catalogue, recipes and estimating.',
    );
  });
});

describe('quoteCountForTrade', () => {
  it('counts only the hub trade, like the web header QUOTES counter', () => {
    const quotes = [
      quote({ trade: 'electrical' }),
      quote({ trade: 'plumbing' }),
      quote({ trade: 'Electrical' }),
    ];
    expect(quoteCountForTrade(quotes, 'electrical')).toBe(2);
  });
});

describe('queueMatchesFilter (web quoteMatchesFilter parity)', () => {
  it('paid matches on deposit_paid only', () => {
    expect(queueMatchesFilter(quote({ deposit_paid: true }), 'paid')).toBe(true);
    expect(queueMatchesFilter(quote({ status: 'accepted' }), 'paid')).toBe(false);
  });

  it('inspect matches either inspection flag', () => {
    expect(queueMatchesFilter(quote({ needs_inspection: true }), 'inspect')).toBe(true);
    expect(queueMatchesFilter(quote({ inspection_required: true }), 'inspect')).toBe(true);
    expect(queueMatchesFilter(quote({}), 'inspect')).toBe(false);
  });

  it('review uses the hub set (no awaiting_tradie_approval — web parity)', () => {
    for (const status of ['drafted', 'awaiting_review', 'review', 'draft']) {
      expect(queueMatchesFilter(quote({ status }), 'review')).toBe(true);
    }
    expect(queueMatchesFilter(quote({ status: 'awaiting_tradie_approval' }), 'review')).toBe(false);
  });

  it('a missing status reads as draft', () => {
    expect(queueMatchesFilter(quote({}), 'review')).toBe(true);
  });
});

describe('compareQuotes (web comparator parity)', () => {
  const older = quote({ id: 'a', created_at: '2026-08-01T00:00:00Z', total_inc_gst: 99 });
  const newer = quote({ id: 'b', created_at: '2026-08-07T00:00:00Z', total_inc_gst: 1972 });
  const unpriced = quote({ id: 'c', created_at: '2026-08-05T00:00:00Z', total_inc_gst: null });

  it('sorts newest and oldest by created_at', () => {
    expect([older, newer].sort((a, b) => compareQuotes(a, b, 'newest'))[0]?.id).toBe('b');
    expect([newer, older].sort((a, b) => compareQuotes(a, b, 'oldest'))[0]?.id).toBe('a');
  });

  it('sinks unpriced rows on both value sorts', () => {
    const desc = [unpriced, older, newer].sort((a, b) => compareQuotes(a, b, 'value_desc'));
    expect(desc.map(q => q.id)).toEqual(['b', 'a', 'c']);
    const asc = [unpriced, newer, older].sort((a, b) => compareQuotes(a, b, 'value_asc'));
    expect(asc.map(q => q.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('search (web quoteMatchesSearch parity)', () => {
  const q = quote({
    customer_full_name: 'Jeph Daligdig',
    suburb: 'Bondi',
    job_type: 'downlights',
    scope_of_works: 'Install 8 new warm-white LED downlights',
  });

  it('ANDs every term across the web field set', () => {
    expect(quoteMatchesSearch(q, parseSearchTerms('jeph bondi'))).toBe(true);
    expect(quoteMatchesSearch(q, parseSearchTerms('jeph coogee'))).toBe(false);
  });

  it('matches scope text and empty queries', () => {
    expect(quoteMatchesSearch(q, parseSearchTerms('led'))).toBe(true);
    expect(quoteMatchesSearch(q, parseSearchTerms('  '))).toBe(true);
  });
});
