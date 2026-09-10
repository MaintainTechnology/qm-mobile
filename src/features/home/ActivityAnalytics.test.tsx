import { fireEvent, render } from '@testing-library/react-native';

import { ActivityAnalytics } from './ActivityAnalytics';

const mockPush = jest.fn();
const mockQuery = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/useApi', () => ({ useApiQuery: (...args: unknown[]) => mockQuery(...args) }));

const emptyAnalytics = {
  generatedAt: '2026-09-08T00:00:00Z',
  weeks: 8,
  headline: {
    peopleTexting: 0,
    peopleCalling: 0,
    totalChats: 0,
    totalCalls: 0,
    totalRequests: 0,
    totalQuotes: 0,
    processedQuotes: 0,
    uniqueCustomers: 0,
  },
  needsAttention: { awaitingReview: 0, coldChats: 0, inspectionsToBook: 0 },
  speedToQuoteMinutes: null,
  funnel: [],
  weeklyTrend: [],
  channelSplit: [],
  topJobTypes: [],
};
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReturnValue({
    data: { analytics: emptyAnalytics },
    isPending: false,
    isError: false,
  });
});

it('retains the live review queue when the selected period contains no activity', async () => {
  const window = {
    from: new Date('2026-09-06T14:00:00Z'),
    to: new Date('2026-09-08T13:59:59.999Z'),
  };
  const screen = await render(
    <ActivityAnalytics window={window} periodLabel="This week" liveReviewCount={4} />,
  );
  expect(screen.getByText('No activity in this period')).toBeTruthy();
  expect(screen.getByText('quotes to review')).toBeTruthy();
  expect(screen.getByText('4')).toBeTruthy();
  expect(screen.queryByText('You’re all caught up')).toBeNull();
  const [key, path] = mockQuery.mock.calls[0]!;
  expect(path).toContain('from=2026-09-06T14%3A00%3A00.000Z');
  expect(key).toContain(path);
  await fireEvent.press(screen.getByRole('button', { name: /quotes to review/i }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/quotes', params: { filter: 'review' } });
});

it('keeps bounded weekly trends labelled separately from all-time counters', async () => {
  mockQuery.mockReturnValue({
    data: {
      analytics: { ...emptyAnalytics, headline: { ...emptyAnalytics.headline, totalQuotes: 2 } },
    },
    isPending: false,
    isError: false,
  });
  const screen = await render(<ActivityAnalytics window={null} periodLabel="All time" />);
  expect(screen.getByText('ALL TIME')).toBeTruthy();
  expect(screen.getByRole('image', { name: /Quotes \/ week · last 8 weeks/i })).toBeTruthy();
  expect(mockQuery.mock.calls[0]?.[1]).toBe('/api/tenant/analytics?weeks=8');
});
