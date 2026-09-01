import type { QuoteRow } from '@/lib/tenant';

import {
  compareQueueEntries,
  defaultQueueCriteria,
  entryMatchesSearch,
  entryMatchesStatus,
  filterAndSortQueue,
  mergeQueueEntries,
  parseQueueSearchTerms,
  presentQueueTrades,
  queueCalendarDay,
  queueStatusCounts,
  queueTimeZone,
  TradeJobsSchema,
  validateQueueDateRange,
  type QueueEntry,
  type TradeJob,
} from './quote-queue';

function quote(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: 'quote-1',
    created_at: '2026-08-07T03:45:00.000Z',
    trade: 'electrical',
    ...overrides,
  } as QuoteRow;
}

function job(overrides: Partial<TradeJob> = {}): TradeJob {
  return {
    id: 'job-1',
    trade: 'roofing',
    address: '8 Ocean Street, Bondi NSW',
    headline: 'Roof replacement · 172 m²',
    status: 'confirmed',
    href: '/q/roof/public-token',
    tradieHref: '/m/measure-token',
    createdAt: '2026-08-08T03:45:00.000Z',
    ...overrides,
  };
}

function merged(quotes: QuoteRow[] = [], jobs: TradeJob[] = []): QueueEntry[] {
  return mergeQueueEntries(quotes, jobs, ['electrical', 'roofing', 'commercial_painting']);
}

describe('TradeJobsSchema', () => {
  it('retains an unfamiliar status instead of rejecting every otherwise valid job', () => {
    expect(
      TradeJobsSchema.parse({ jobs: [job({ status: 'future-server-state' })] }).jobs[0]?.status,
    ).toBe('future-server-state');
  });
});

describe('mergeQueueEntries', () => {
  it('tags both sources before the shared newest sort', () => {
    const entries = merged(
      [quote({ id: 'old-quote', created_at: '2026-08-01T00:00:00.000Z' })],
      [job({ id: 'new-job', createdAt: '2026-08-09T00:00:00.000Z' })],
    );
    const result = filterAndSortQueue(entries, {
      ...defaultQueueCriteria('all', 'Australia/Sydney'),
      trade: 'all',
    });

    expect(result.map(entry => entry.key)).toEqual(['job:roofing:new-job', 'quote:old-quote']);
  });

  it('normalises the commercial-painting API alias and excludes jobs outside active tenant trades', () => {
    const entries = mergeQueueEntries(
      [quote({ trade: 'commercial_painting' })],
      [
        job({ id: 'allowed', trade: 'commercial-painting' }),
        job({ id: 'foreign', trade: 'solar' }),
        job({ id: 'unknown', trade: '' }),
      ],
      ['commercial_painting'],
    );

    expect(entries.map(entry => entry.key)).toEqual([
      'quote:quote-1',
      'job:commercial_painting:allowed',
    ]);
    expect(presentQueueTrades(entries, ['commercial_painting', 'solar'])).toEqual([
      'commercial_painting',
    ]);
  });

  it('never invents a job amount from a currency-looking headline', () => {
    const [entry] = merged([], [job({ headline: 'Estimate $1,250 incl GST' })]);
    expect(entry).toMatchObject({ kind: 'job', amount: null });
  });
});

describe('status vocabulary and counts', () => {
  it('keeps every held-review alias, including awaiting_tradie_approval', () => {
    for (const status of [
      'draft',
      'drafted',
      'review',
      'awaiting_review',
      'awaiting_tradie_approval',
    ]) {
      const [entry] = merged([quote({ status })]);
      expect(entryMatchesStatus(entry!, 'review')).toBe(true);
    }
  });

  it('does not equate accepted, deposit paid and a confirmed saved job', () => {
    const [accepted, paid, confirmed] = merged(
      [
        quote({ id: 'accepted', status: 'accepted', deposit_paid: false }),
        quote({ id: 'paid', status: 'sent', deposit_paid: true }),
      ],
      [job({ id: 'confirmed', status: 'confirmed' })],
    );

    expect(entryMatchesStatus(accepted!, 'accepted')).toBe(true);
    expect(entryMatchesStatus(accepted!, 'paid')).toBe(false);
    expect(entryMatchesStatus(paid!, 'paid')).toBe(true);
    expect(entryMatchesStatus(paid!, 'accepted')).toBe(false);
    expect(entryMatchesStatus(confirmed!, 'accepted')).toBe(false);
    expect(entryMatchesStatus(confirmed!, 'paid')).toBe(false);
  });

  it('counts both sources from the same search/trade/date population used by rows', () => {
    const entries = merged(
      [
        quote({
          id: 'q-review',
          trade: 'roofing',
          status: 'awaiting_tradie_approval',
          suburb: 'Bondi',
        }),
        quote({ id: 'q-other', status: 'sent', suburb: 'Manly' }),
      ],
      [job({ id: 'j-review', status: 'draft', address: 'Bondi NSW' })],
    );
    const criteria = {
      ...defaultQueueCriteria('roofing', 'Australia/Sydney'),
      search: 'bondi',
    };
    const counts = queueStatusCounts(entries, criteria);
    const rows = filterAndSortQueue(entries, { ...criteria, status: 'review' });

    expect(counts.all).toBe(2);
    expect(counts.review).toBe(2);
    expect(rows).toHaveLength(counts.review);
  });
});

describe('all-source search', () => {
  it('ANDs normalised terms across job address, headline, trade and status', () => {
    const [entry] = merged([], [
      job({
        trade: 'commercial-painting',
        address: 'Harbour Offices, Pyrmont',
        headline: 'Protective coating review',
        status: 'draft',
      }),
    ]);

    expect(entryMatchesSearch(entry!, parseQueueSearchTerms('pyrmont commercial review'))).toBe(
      true,
    );
    expect(entryMatchesSearch(entry!, parseQueueSearchTerms('pyrmont paid'))).toBe(false);
  });

  it('searches quote customer, suburb, scope, job, trade, short code and status fields', () => {
    const [entry] = merged([
      quote({
        customer_full_name: 'José Alvarez',
        suburb: 'Bondi',
        scope_of_works: 'Install warm-white downlights',
        job_type: 'lighting upgrade',
        trade: 'electrical',
        share_token: 'ABC123',
        status: 'sent',
      }),
    ]);

    for (const query of [
      'jose',
      'bondi',
      'downlights',
      'lighting',
      'electrical',
      'abc123',
      'sent',
    ]) {
      expect(entryMatchesSearch(entry!, parseQueueSearchTerms(query))).toBe(true);
    }
    expect(entryMatchesSearch(entry!, parseQueueSearchTerms('  '))).toBe(true);
  });
});

describe('stable merged sorts', () => {
  it('uses namespaced keys to break equal timestamp ties', () => {
    const entries = merged(
      [quote({ id: 'z', created_at: '2026-08-07T00:00:00Z' })],
      [job({ id: 'a', createdAt: '2026-08-07T00:00:00Z' })],
    );
    const sorted = [...entries].sort((a, b) => compareQueueEntries(a, b, 'newest'));
    expect(sorted.map(entry => entry.key)).toEqual(['job:roofing:a', 'quote:z']);
  });

  it('sorts newest/oldest correctly and sinks missing timestamps in either direction', () => {
    const entries = merged(
      [
        quote({ id: 'old', created_at: '2026-08-01T00:00:00Z' }),
        quote({ id: 'new', created_at: '2026-08-09T00:00:00Z' }),
      ],
      [job({ id: 'missing', createdAt: null })],
    );

    expect([...entries].sort((a, b) => compareQueueEntries(a, b, 'newest')).map(e => e.key)).toEqual([
      'quote:new',
      'quote:old',
      'job:roofing:missing',
    ]);
    expect([...entries].sort((a, b) => compareQueueEntries(a, b, 'oldest')).map(e => e.key)).toEqual([
      'quote:old',
      'quote:new',
      'job:roofing:missing',
    ]);
  });

  it('sorts both amount directions while all unpriced jobs and quotes sink stably', () => {
    const entries = merged(
      [
        quote({ id: 'low', total_inc_gst: 100 }),
        quote({ id: 'high', total_inc_gst: 900 }),
        quote({ id: 'unpriced', total_inc_gst: null }),
      ],
      [job({ id: 'job-unpriced' })],
    );

    expect(
      [...entries].sort((a, b) => compareQueueEntries(a, b, 'value_desc')).map(e => e.key),
    ).toEqual(['quote:high', 'quote:low', 'job:roofing:job-unpriced', 'quote:unpriced']);
    expect(
      [...entries].sort((a, b) => compareQueueEntries(a, b, 'value_asc')).map(e => e.key),
    ).toEqual(['quote:low', 'quote:high', 'job:roofing:job-unpriced', 'quote:unpriced']);
  });
});

describe('tenant-zone inclusive dates', () => {
  it('validates both bounds and rejects impossible or reciprocal ranges', () => {
    expect(validateQueueDateRange('2026-02-29', '')).toMatchObject({ valid: false });
    expect(validateQueueDateRange('', '2026-13-01')).toMatchObject({ valid: false });
    expect(validateQueueDateRange('2026-08-09', '2026-08-01')).toEqual({
      from: null,
      to: null,
      fromError: 'From must be on or before To.',
      toError: 'To must be on or after From.',
      valid: false,
    });
    expect(validateQueueDateRange('2026-08-01', '2026-08-09')).toMatchObject({
      from: '2026-08-01',
      to: '2026-08-09',
      valid: true,
    });
  });

  it('uses an explicit tenant zone around UTC midnight', () => {
    const instant = '2026-08-01T16:30:00.000Z';
    expect(queueCalendarDay(instant, 'Australia/Sydney')).toBe('2026-08-02');
    expect(queueCalendarDay(instant, 'Australia/Perth')).toBe('2026-08-02');
    expect(queueCalendarDay(instant, 'Pacific/Honolulu')).toBe('2026-08-01');
  });

  it('includes both calendar bounds in the tenant zone and excludes missing dates', () => {
    const entries = merged(
      [
        quote({ id: 'start', created_at: '2026-07-31T14:00:00.000Z' }), // Aug 1 Sydney
        quote({ id: 'end', created_at: '2026-08-02T13:59:59.000Z' }), // Aug 2 Sydney
      ],
      [job({ id: 'missing', createdAt: null })],
    );
    const result = filterAndSortQueue(entries, {
      ...defaultQueueCriteria('all', 'Australia/Sydney'),
      trade: 'all',
      from: '2026-08-01',
      to: '2026-08-02',
    });
    expect(result.map(entry => entry.key)).toEqual(['quote:end', 'quote:start']);
  });

  it('prefers the server availability timezone, then maps the tenant state like the backend', () => {
    expect(queueTimeZone('Australia/Perth', 'NSW')).toBe('Australia/Perth');
    expect(queueTimeZone(null, 'QLD')).toBe('Australia/Brisbane');
    expect(queueTimeZone('not/a-zone', 'WA')).toBe('Australia/Perth');
    expect(queueTimeZone(undefined, null)).toBe('Australia/Sydney');
  });
});

describe('reset criteria', () => {
  it('restores the contextual trade as well as search, status and date bounds', () => {
    expect(defaultQueueCriteria('commercial-painting', 'Australia/Perth')).toEqual({
      search: '',
      status: 'all',
      trade: 'commercial_painting',
      from: '',
      to: '',
      timeZone: 'Australia/Perth',
      sort: 'newest',
    });
  });
});
