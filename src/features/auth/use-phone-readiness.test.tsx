import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { usePhoneReadiness } from './use-phone-readiness';
import type { PhoneReadiness } from './provisioning';
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiRequest: jest.fn(),
  apiErrorMessage: (error: Error) => error.message,
}));
const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  B = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const pending: PhoneReadiness = {
  version: 1,
  tenantId: A,
  operationId: null,
  state: 'not_started',
  setupComplete: false,
  retryable: true,
  phoneNumber: null,
  smsReady: false,
  voiceReady: false,
  provisioningMode: { twilio: 'real', vapi: 'real' },
  message: 'Not started',
};
const request = jest.mocked(apiRequest);
const token = jest.fn<Promise<string>, []>(async () => 'token_A');
let client: QueryClient;
let current: PhoneReadiness;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
  jest.clearAllMocks();
  current = pending;
  token.mockResolvedValue('token_A');
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  request.mockImplementation(async (_path, _schema, options) =>
    options?.method === 'POST'
      ? { ok: true, tenantId: A, phoneReadiness: current }
      : { ok: true, tenantId: current.tenantId, phoneReadiness: current },
  );
});
afterEach(async () => {
  await act(async () => {
    client.clear();
  });
});
const render = () =>
  renderHook(() => usePhoneReadiness({ ownerKey: 'A:session', tenantId: A, getToken: token }), {
    wrapper,
  });
it('mount/restart reads status and never starts provisioning automatically', async () => {
  const first = await render();
  await waitFor(() => expect(first.result.current.data?.state).toBe('not_started'));
  await first.unmount();
  const next = await render();
  await waitFor(() => expect(next.result.current.data).toBeTruthy());
  expect(request.mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(true);
});
it('requires a fresh no-attempt read before an explicit start', async () => {
  const screen = await render();
  await waitFor(() => expect(screen.result.current.data).toBeTruthy());
  current = { ...pending, state: 'processing', operationId: B, retryable: false };
  await act(() => screen.result.current.start());
  expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(0);
});
it('does not treat ok:false setupComplete:true as ready', async () => {
  const screen = await render();
  await waitFor(() => expect(screen.result.current.data).toBeTruthy());
  request.mockImplementation(async (_path, _schema, options) =>
    options?.method === 'POST'
      ? { ok: false, setupComplete: true, warning: 'Provider unconfirmed' }
      : { ok: true, tenantId: A, phoneReadiness: current },
  );
  await act(() => screen.result.current.start());
  expect(screen.result.current.data).toBeUndefined();
  expect(screen.result.current.error).toContain('unconfirmed');
});
it('keeps a lost POST unknown until explicit status read; remount remains read-only', async () => {
  const screen = await render();
  await waitFor(() => expect(screen.result.current.data).toBeTruthy());
  request.mockImplementation(async (_path, _schema, options) => {
    if (options?.method === 'POST') {
      current = { ...pending, state: 'unknown', operationId: B, retryable: false };
      throw new Error('Response lost');
    }
    return { ok: true, tenantId: A, phoneReadiness: current };
  });
  await act(() => screen.result.current.start());
  expect(screen.result.current.data).toBeUndefined();
  await act(async () => {
    await screen.result.current.refresh();
  });
  expect(screen.result.current.data?.state).toBe('unknown');
  await screen.unmount();
  const next = await render();
  await waitFor(() => expect(next.result.current.data?.state).toBe('unknown'));
  expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(1);
});
it('blocks stale account work while its token is pending', async () => {
  let selected = { owner: 'A', tenantId: A };
  const screen = await renderHook(
    () =>
      usePhoneReadiness({ ownerKey: selected.owner, tenantId: selected.tenantId, getToken: token }),
    { wrapper },
  );
  await waitFor(() => expect(screen.result.current.data).toBeTruthy());
  let resolve!: (token: string) => void;
  token.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  let work!: Promise<void>;
  await act(async () => {
    work = screen.result.current.start();
  });
  current = { ...pending, tenantId: B };
  selected = { owner: 'B', tenantId: B };
  await screen.rerender({});
  await act(async () => {
    resolve('token_A');
    await work;
  });
  await waitFor(() => expect(screen.result.current.data?.tenantId).toBe(B));
  expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(0);
});
it('rejects a status result from another tenant', async () => {
  current = { ...pending, tenantId: B };
  const screen = await render();
  await waitFor(() => expect(screen.result.current.error).toContain('different account'));
  expect(screen.result.current.data).toBeUndefined();
});
