import { fireEvent, render } from '@testing-library/react-native';

import { ApiError } from '@/lib/api';
import { UnifiedQuoteQueue } from './UnifiedQuoteQueue';

const mockMe = {
  data: {
    tenant: { id: 'tenant-a', state: 'NSW', trades: ['electrical', 'roofing'] },
    quotes: [
      {
        id: 'q-old',
        created_at: '2026-09-01T03:00:00Z',
        trade: 'electrical',
        customer_full_name: 'Older customer',
        status: 'sent',
        total_inc_gst: 100,
      },
    ],
  },
  isPending: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
};
const mockJobs = {
  data: {
    jobs: [
      {
        id: 'j-new',
        trade: 'roofing',
        address: 'New roof at Bondi',
        headline: 'Roof replacement',
        status: 'draft',
        createdAt: '2026-09-08T03:00:00Z',
      },
    ],
  },
  isPending: false,
  isError: false,
  error: null as unknown,
  refetch: jest.fn(),
};
jest.mock('@/lib/tenant', () => ({
  ...jest.requireActual('@/lib/tenant'),
  useTenantMe: () => mockMe,
}));
jest.mock('@/lib/useApi', () => ({ useApiQuery: () => mockJobs }));
jest.mock('./QuoteDetailModal', () => ({ QuoteDetailModal: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockMe.isError = false;
  mockJobs.isError = false;
});

it('merges before sorting and applies search/counts/clear to both sources', async () => {
  const screen = await render(<UnifiedQuoteQueue />);
  const rows = screen
    .getAllByRole('button')
    .filter(
      node =>
        String(node.props.accessibilityLabel).includes('Open saved job') ||
        String(node.props.accessibilityLabel).includes('Older customer'),
    );
  expect(rows[0]?.props.accessibilityLabel).toContain('New roof at Bondi');
  expect(rows[1]?.props.accessibilityLabel).toContain('Older customer');
  await fireEvent.changeText(screen.getByLabelText('Search quotes and saved jobs'), 'roof bondi');
  expect(screen.getByText('All (1)')).toBeTruthy();
  expect(screen.getByText('In review (1)')).toBeTruthy();
  expect(screen.queryByText('Older customer')).toBeNull();
  await fireEvent.press(screen.getByText('Clear filters'));
  expect(screen.getByText('Older customer')).toBeTruthy();
  expect(screen.getByText('All (2)')).toBeTruthy();
});

it('retains the healthy source, marks failure independently and retries only that source', async () => {
  mockJobs.isError = true;
  mockJobs.error = new ApiError('offline', 503, '/api/tenant/trade-jobs', {});
  const screen = await render(<UnifiedQuoteQueue />);
  expect(screen.getByText('Older customer')).toBeTruthy();
  expect(screen.getByText('Saved jobs could not refresh; showing saved results')).toBeTruthy();
  expect(screen.getByText('2 results · incomplete sources')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /try again/i }));
  expect(mockJobs.refetch).toHaveBeenCalledTimes(1);
  expect(mockMe.refetch).not.toHaveBeenCalled();
});

it('honours attention filter and restores the originating trade on clear', async () => {
  const screen = await render(<UnifiedQuoteQueue contextTrade="roofing" initialFilter="review" />);
  expect(screen.queryByText('Older customer')).toBeNull();
  expect(
    screen.getByRole('radio', { name: 'In review (1)' }).props.accessibilityState.checked,
  ).toBe(true);
  await fireEvent.press(screen.getByText('All trades'));
  await fireEvent.press(screen.getByText('Clear filters'));
  expect(screen.getByRole('radio', { name: 'roofing' }).props.accessibilityState.checked).toBe(
    true,
  );
  expect(screen.queryByText('Older customer')).toBeNull();
});

it('applies inclusive tenant-day bounds and shows an invalid range without hiding data silently', async () => {
  const screen = await render(<UnifiedQuoteQueue />);
  await fireEvent.changeText(screen.getByLabelText('From date, YYYY-MM-DD'), '2026-09-08');
  expect(screen.getByText('All (1)')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('To date, YYYY-MM-DD'), '2026-09-01');
  expect(screen.getByText('Date filtering is paused until the range is valid.')).toBeTruthy();
  expect(screen.getByText('All (2)')).toBeTruthy();
});
