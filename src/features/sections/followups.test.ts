import {
  chaseableFollowups,
  filterFollowups,
  followupCategories,
  followupTarget,
  suggestedFollowupText,
  type FollowupItem,
} from './followups';

const quote: FollowupItem = {
  kind: 'quote',
  quote_id: 'quote-a',
  quote_kind: 'final',
  status: 'sent',
  share_token: 'ABC123',
  job_type: 'power_points',
  customer: {
    first_name: 'Sam',
    full_name: 'Sam Taylor',
    phone: '+61411222333',
    email: 'sam@example.test',
    suburb: 'Richmond',
  },
  total_inc_gst: 100.05,
};
const lead: FollowupItem = {
  kind: 'lead',
  conversation_id: 'conversation-a',
  job_type: null,
  customer: { first_name: 'Jo' },
};

it('retains unpaid finals and excludes balance/converted/invalid rows', () => {
  expect(
    chaseableFollowups([
      quote,
      lead,
      { ...quote, quote_kind: 'balance' },
      { ...quote, paid_at: '2026-09-09' },
      { ...quote, accepted_at: '2026-09-09' },
      { ...quote, status: 'paid' },
      { ...quote, status: 'accepted' },
      { ...quote, quote_id: null },
      { ...lead, conversation_id: null },
    ]),
  ).toEqual([quote, lead]);
});
it('uses the audience discriminant even when a lead carries an unrelated quote ID', () => {
  expect(followupTarget({ ...lead, quote_id: 'foreign-quote' })).toEqual({
    conversationId: 'conversation-a',
  });
  expect(followupTarget({ ...quote, conversation_id: 'foreign-conversation' })).toEqual({
    quoteId: 'quote-a',
  });
});
it('counts categories over the full valid queue and preserves AND filtering and AU phone search', () => {
  const items = [quote, { ...quote, quote_id: 'quote-b' }, lead];
  expect(followupCategories(items)).toEqual([
    ['all', 'All categories (3)'],
    ['power_points', 'Power Points (2)'],
    ['uncategorised', 'Uncategorised (1)'],
  ]);
  for (const query of ['ABC123', '0411222333', 'sam@example.test', 'power richmond', 'quote-a']) {
    expect(filterFollowups([quote, lead], 'all', query)).toEqual([quote]);
  }
  expect(filterFollowups([quote, lead], 'uncategorised', 'Sam')).toEqual([]);
});
it('suggests a quote code without guessing tax or quote context for an unquoted lead', () => {
  expect(suggestedFollowupText(quote)).toContain('power points quote (code ABC123)');
  expect(suggestedFollowupText(quote)).not.toMatch(/GST|\$100/);
  expect(suggestedFollowupText(lead)).toContain('Hi Jo, just following up on your enquiry.');
  expect(suggestedFollowupText(lead)).not.toContain('quote');
  expect(
    suggestedFollowupText({ ...quote, customer: { first_name: 'x'.repeat(1000) } }).length,
  ).toBeLessThanOrEqual(640);
});
