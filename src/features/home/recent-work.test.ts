import { mergeQueueEntries } from '@/features/trades/hub/quote-queue';
import { recentWorkEntries } from './recent-work';

it('scopes recent work to the period and shows each quote chain only at its root', () => {
  const entries = mergeQueueEntries(
    [
      { id: 'old', created_at: '2026-08-01T00:00:00Z' },
      { id: 'root', created_at: '2026-09-07T00:00:00Z', quote_kind: 'initial' },
      {
        id: 'final',
        created_at: '2026-09-08T00:00:00Z',
        quote_kind: 'final',
        parent_quote_id: 'root',
      },
      {
        id: 'balance',
        created_at: '2026-09-08T01:00:00Z',
        quote_kind: 'balance',
        parent_quote_id: 'final',
      },
    ],
    [
      { id: 'roof', trade: 'roofing', createdAt: '2026-09-07T01:00:00Z' },
      { id: 'unknown', trade: 'roofing', createdAt: null },
    ],
    ['roofing'],
  );
  expect(
    recentWorkEntries(entries, {
      from: new Date('2026-09-06T14:00:00Z'),
      to: new Date('2026-09-08T13:59:59.999Z'),
    }).map(row => row.key),
  ).toEqual(['job:roofing:roof', 'quote:root']);
  expect(entries).toHaveLength(6);
  expect(recentWorkEntries(entries, null).map(row => row.key)).toEqual([
    'job:roofing:roof',
    'quote:root',
    'quote:old',
  ]);
});
