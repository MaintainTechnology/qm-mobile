import { apiErrorMessage } from './api';
jest.mock('@/lib/env', () => ({
  apiUrl: () => {
    throw new Error('API not configured');
  },
}));
it('renders recovery errors without requiring API configuration', () => {
  expect(apiErrorMessage(new Error('Unknown saved outcome'), 'Check the saved record.')).toBe(
    'Check the saved record.',
  );
});
it('handles a development network error even when the API URL is missing', () => {
  expect(apiErrorMessage(new TypeError('Failed to fetch'), 'Connection unavailable.')).toContain(
    'Connection unavailable.',
  );
});
