import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import { apiRequest } from '@/lib/api';
import { loadDeliveryReceipt, runQuoteDelivery } from './delivery-receipt';
import { useQuoteDelivery } from './use-quote-delivery';

const mockAuth = { userId: 'user_A', sessionId: 'session_A' };
const mockGetToken = jest.fn(async () => 'token_A');
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ ...mockAuth, getToken: mockGetToken }) }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_algorithm: string, text: string) =>
      crypto.createHash('sha256').update(text).digest('hex'),
  };
});
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
const Q = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const O = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const quote = { quoteId: Q, tenantId: 'tenant_A' };
const scoped = { ...quote, userId: 'user_A' };
const review = { expected_revision: 'a'.repeat(64), reviewedDestination: '+61411222333' };
const secure = new Map<string, string>();
const request = jest.mocked(apiRequest);
let client: QueryClient;
beforeEach(() => {
  secure.clear();
  jest.clearAllMocks();
  mockAuth.userId = 'user_A';
  mockAuth.sessionId = 'session_A';
  mockGetToken.mockResolvedValue('token_A');
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => secure.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    secure.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => {
    secure.delete(key);
  });
  client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
});
afterEach(() => client.clear());
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

it('sends the exact reviewed request only after durable receipt and recovers on remount with GET only', async () => {
  request.mockImplementation(async (_path, _schema, options) => {
    if (options?.method === 'POST') {
      expect((await loadDeliveryReceipt(scoped))?.state).toBe('pending');
      throw new Error('lost POST response');
    }
    const receipt = (await loadDeliveryReceipt(scoped))!;
    return {
      ok: true,
      quoteId: Q,
      requestId: receipt.requestId,
      status: 'accepted',
      outboxId: O,
      approved: true,
      message: {
        id: O,
        status: 'accepted',
        provider_status: 'sent',
        requires_attention: false,
        attempts: 1,
      },
    };
  });
  const first = await renderHook(() => useQuoteDelivery(quote), { wrapper });
  await waitFor(() => expect(first.result.current.isLoading).toBe(false));
  expect(request).not.toHaveBeenCalled();
  await act(async () => {
    await first.result.current
      .send({ ...review, channel: 'sms', resend: true })
      .catch(() => undefined);
  });
  const id = (await loadDeliveryReceipt(scoped))!.requestId;
  expect(request.mock.calls[0]?.[2]).toMatchObject({
    method: 'POST',
    token: 'token_A',
    body: {
      expected_revision: review.expected_revision,
      expected_recipient: review.reviewedDestination,
      requestId: id,
      channel: 'sms',
    },
  });
  await first.unmount();
  const second = await renderHook(() => useQuoteDelivery(quote), { wrapper });
  await waitFor(() => expect(second.result.current.receipt?.state).toBe('provider_accepted'));
  expect(request.mock.calls[1]?.[0]).toBe(`/api/tenant/sms-delivery?quoteId=${Q}&requestId=${id}`);
  expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(1);
  await second.unmount();
});
it('uses initial readback after approval and never claims sent from an approved pending response', async () => {
  request.mockResolvedValueOnce({
    ok: true,
    approved: true,
    accepted: false,
    outboxId: O,
    status: 'approved_delivery_pending',
  });
  const hook = await renderHook(() => useQuoteDelivery(quote), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  await act(async () => {
    await hook.result.current.approve(review);
  });
  expect(request.mock.calls[0]?.[2]?.body).toEqual({
    expected_revision: review.expected_revision,
    expected_recipient: review.reviewedDestination,
    channel: 'sms',
  });
  expect(hook.result.current.receipt?.state).toBe('unknown');
  request.mockResolvedValueOnce({
    ok: true,
    quoteId: Q,
    requestId: null,
    status: 'pending',
    outboxId: O,
    approved: true,
    message: {
      id: O,
      status: 'pending',
      provider_status: null,
      requires_attention: false,
      attempts: 0,
    },
  });
  await act(async () => {
    await hook.result.current.refresh();
  });
  expect(request.mock.calls[1]?.[0]).toBe(`/api/tenant/sms-delivery?quoteId=${Q}`);
  expect(hook.result.current.receipt?.state).toBe('queued');
  await hook.unmount();
});
it('does not dispatch old input when token lookup completes after account switch', async () => {
  let release!: (token: string) => void;
  mockGetToken.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        release = resolve;
      }),
  );
  const hook = await renderHook(() => useQuoteDelivery(quote), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  let promise!: Promise<unknown>;
  await act(async () => {
    promise = hook.result.current
      .send({ ...review, channel: 'sms', resend: true })
      .catch(error => error);
  });
  await waitFor(() => expect(mockGetToken).toHaveBeenCalledTimes(1));
  mockAuth.userId = 'user_B';
  mockAuth.sessionId = 'session_B';
  await hook.rerender({});
  await act(async () => {
    release('old token');
    await promise;
  });
  expect(request).not.toHaveBeenCalled();
  expect(hook.result.current.receipt).toBeNull();
  expect((await loadDeliveryReceipt(scoped))?.state).toBe('no_commit');
  await hook.unmount();
});
it('never renders an old outcome that completes after changing accounts during the POST', async () => {
  let finish!: (value: unknown) => void;
  request.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  const hook = await renderHook(() => useQuoteDelivery(quote), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  let promise!: Promise<unknown>;
  await act(async () => {
    promise = hook.result.current
      .send({ ...review, channel: 'sms', resend: true })
      .catch(error => error);
  });
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  mockAuth.userId = 'user_B';
  mockAuth.sessionId = 'session_B';
  await hook.rerender({});
  await act(async () => {
    finish({ ok: true, accepted: true, outboxId: O });
    await promise;
  });
  expect(hook.result.current.receipt).toBeNull();
  expect((await loadDeliveryReceipt(scoped))?.state).toBe('unknown');
  await hook.unmount();
});
it('keeps missing/email recovery fenced and never starts an automatic retry', async () => {
  await runQuoteDelivery(
    scoped,
    { ...review, action: 'send', channel: 'email', initial: false },
    async () => {
      throw new Error('lost');
    },
  ).catch(() => undefined);
  const hook = await renderHook(() => useQuoteDelivery(quote), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  expect(hook.result.current.receipt?.state).toBe('unknown');
  expect(hook.result.current.error).toMatchObject({ code: 'missing_readback' });
  await act(async () => {
    await hook.result.current.beginAnother().catch(() => undefined);
  });
  expect(request).not.toHaveBeenCalled();
  expect(hook.result.current.receipt?.state).toBe('unknown');
  await hook.unmount();
});

it.each([false, true])(
  'recovers the balance child through its reviewed final quote after a lost POST (resend %s)',
  async resend => {
    const balanceQuote = { ...quote, purpose: 'balance' as const };
    const balanceScope = { ...scoped, purpose: 'balance' as const };
    request.mockImplementation(async (_path, schema, options) => {
      if (options?.method === 'POST') throw new Error('lost balance response');
      const receipt = (await loadDeliveryReceipt(balanceScope))!;
      return schema.parse({
        ok: true,
        finalQuoteId: Q,
        quoteId: O,
        balancePaid: false,
        requestId: receipt.initial ? null : receipt.requestId,
        status: 'accepted',
        approved: true,
        outboxId: O,
        message: {
          id: O,
          status: 'accepted',
          provider_status: 'sent',
          requires_attention: false,
          attempts: 1,
        },
      });
    });
    const first = await renderHook(() => useQuoteDelivery(balanceQuote), { wrapper });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    await act(async () => {
      await first.result.current.requestBalance({ ...review, resend }).catch(() => undefined);
    });
    const receipt = (await loadDeliveryReceipt(balanceScope))!;
    expect(request.mock.calls[0]?.[0]).toBe(`/api/quote/${Q}/request-final-payment`);
    expect(request.mock.calls[0]?.[2]?.body).toEqual({
      expected_revision: review.expected_revision,
      expected_recipient: review.reviewedDestination,
      channel: 'sms',
      ...(resend ? { requestId: receipt.requestId } : {}),
    });
    await first.unmount();
    const second = await renderHook(() => useQuoteDelivery(balanceQuote), { wrapper });
    await waitFor(() => expect(second.result.current.receipt?.state).toBe('provider_accepted'));
    expect(request.mock.calls[1]?.[0]).toBe(
      `/api/quote/${Q}/request-final-payment${resend ? `?requestId=${receipt.requestId}` : ''}`,
    );
    expect(request.mock.calls.filter(([, , options]) => options?.method === 'POST')).toHaveLength(
      1,
    );
    expect(await loadDeliveryReceipt(scoped)).toBeNull();
    await second.unmount();
  },
);
it.each(['not_created', 'foreign_final', 'paid'])(
  'handles authoritative balance recovery %s without automatic dispatch',
  async scenario => {
    const balanceQuote = { ...quote, purpose: 'balance' as const };
    const balanceScope = { ...scoped, purpose: 'balance' as const };
    await runQuoteDelivery(
      balanceScope,
      { ...review, initial: true, channel: 'sms', action: 'request-final-payment' },
      async () => {
        throw new Error('lost');
      },
    ).catch(() => undefined);
    request.mockImplementation(async (_path, schema) =>
      schema.parse(
        scenario === 'not_created'
          ? {
              ok: true,
              finalQuoteId: Q,
              quoteId: null,
              requestId: null,
              status: 'not_created',
              message: null,
            }
          : {
              ok: true,
              finalQuoteId:
                scenario === 'foreign_final' ? 'cccccccc-3333-4333-8333-cccccccccccc' : Q,
              quoteId: O,
              requestId: null,
              balancePaid: true,
              status: 'not_found',
              approved: true,
              outboxId: null,
              message: null,
            },
      ),
    );
    const hook = await renderHook(() => useQuoteDelivery(balanceQuote), { wrapper });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    expect(hook.result.current.receipt?.state).toBe(
      scenario === 'paid' ? 'balance_paid' : 'unknown',
    );
    if (scenario !== 'paid')
      expect(hook.result.current.error).toMatchObject({
        code: scenario === 'not_created' ? 'missing_readback' : 'identity',
      });
    await act(async () => {
      await hook.result.current.beginAnother().catch(() => undefined);
    });
    expect(request.mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(true);
    await hook.unmount();
  },
);
