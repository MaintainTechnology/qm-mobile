import { quoteActivity } from './quote-activity';
const base = { id: 'q', created_at: '2026-09-08T00:00:00Z' };
it('does not infer a send from a payment or acceptance', () => {
  expect(
    quoteActivity({ ...base, paid_at: '2026-09-08T01:00:00Z', paid_tier: 'inspection' }),
  ).toEqual([
    { label: 'Quote created', at: base.created_at },
    { label: 'Site visit paid', at: '2026-09-08T01:00:00Z' },
  ]);
  expect(quoteActivity({ ...base, status: 'accepted' }).map(row => row.label)).toEqual([
    'Quote created',
    'Accepted',
  ]);
});
it('labels a balance payment distinctly and keeps the recorded delivery timestamp', () => {
  expect(
    quoteActivity({
      ...base,
      quote_kind: 'balance',
      paid_at: '2026-09-08T02:00:00Z',
      sent_at: '2026-09-08T01:00:00Z',
    }).map(row => row.label),
  ).toEqual(['Quote created', 'Delivery recorded', 'Balance paid']);
});
