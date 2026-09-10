import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { apiRequest } from '@/lib/api';

import { useJobQuote } from './api';
import type { JobQuoteRequest } from './schema';

const mockGetToken = jest.fn();
jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ getToken: mockGetToken, userId: 'user_a', sessionId: 'session_a' }),
}));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));

const request: JobQuoteRequest = {
  job_type: 'ev_charger',
  address: '12 Smith St',
  suburb: 'Penrith',
  answers: {},
  notes: '',
  customer_name: '',
  customer_mobile: '',
  customer_email: '',
};

it('does not dispatch an old account form when token lookup completes after unmount', async () => {
  let tokenReady!: (value: string) => void;
  mockGetToken.mockImplementation(
    () =>
      new Promise<string>(resolve => {
        tokenReady = resolve;
      }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const hook = await renderHook(() => useJobQuote(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  let outcome!: Promise<unknown>;
  await act(async () => {
    outcome = hook.result.current.mutateAsync(request).catch(error => error);
  });
  await hook.unmount();
  tokenReady('token-for-old-session');
  expect(await outcome).toMatchObject({ name: 'MissingClerkTokenError' });
  expect(apiRequest).not.toHaveBeenCalled();
  client.clear();
});
