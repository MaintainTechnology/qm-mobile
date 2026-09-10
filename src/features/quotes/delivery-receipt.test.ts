import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@/lib/api';
import { MissingClerkTokenError } from '@/lib/auth-token';
import {
  beginAnotherQuoteDelivery,
  deliveryReceiptKey,
  loadDeliveryReceipt,
  reconcileQuoteDelivery,
  retryQuoteDelivery,
  runQuoteDelivery,
  deliveryReceiptNotice,
  observeDelivery,
  type DeliveryInput,
} from './delivery-receipt';
import {
  FinalPaymentReadbackSchema,
  QuoteDeliveryReadbackSchema,
  type QuoteDeliveryReadback,
} from './delivery-schema';

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
const secure = new Map<string, string>();
const Q = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const O = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const scope = { userId: 'user_A', tenantId: 'tenant_A', quoteId: Q };
const input: DeliveryInput = {
  action: 'send',
  channel: 'sms',
  initial: false,
  expected_revision: 'a'.repeat(64),
  reviewedDestination: '+61411222333',
  to: '+61411222333',
};
beforeEach(() => {
  secure.clear();
  jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => secure.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    secure.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => {
    secure.delete(key);
  });
});
async function readback(
  status: QuoteDeliveryReadback['status'] = 'delivered',
): Promise<QuoteDeliveryReadback> {
  const receipt = (await loadDeliveryReceipt(scope))!;
  return {
    ok: true,
    quoteId: Q,
    requestId: receipt.initial ? null : receipt.requestId,
    status,
    outboxId: status === 'not_found' ? null : O,
    approved: true,
    message:
      status === 'not_found'
        ? null
        : {
            id: O,
            status,
            provider_status: status === 'delivered' ? 'delivered' : null,
            requires_attention: false,
            attempts: 1,
          },
  };
}
async function unknown(overrides: Partial<DeliveryInput> = {}) {
  await expect(
    runQuoteDelivery(scope, { ...input, ...overrides }, async () => {
      throw new Error('lost response');
    }),
  ).rejects.toThrow('lost response');
}
it('persists an opaque receipt before dispatch, with exact review/recipient fence and fresh resend UUID', async () => {
  const dispatch = jest.fn(async body => {
    const receipt = (await loadDeliveryReceipt(scope))!;
    expect(receipt.state).toBe('pending');
    expect(body.requestId).toBe(receipt.requestId);
    expect(body.expected_revision).toBe(input.expected_revision);
    expect(body.expected_recipient).toBe(input.reviewedDestination);
    return { ok: true as const, status: 'sent', accepted: true, outboxId: O, quote_id: Q };
  });
  await runQuoteDelivery(scope, input, dispatch);
  expect((await loadDeliveryReceipt(scope))?.state).toBe('provider_accepted');
  const stored = [...secure.values()].join('');
  expect(stored).not.toContain('+61411222333');
  expect(stored).not.toContain(input.expected_revision);
  expect(dispatch).toHaveBeenCalledTimes(1);
});
it('uses the shared initial intent for approve and first send', async () => {
  const dispatch = jest.fn(async (_body: unknown) => ({
    ok: true as const,
    already_actioned: true,
    status: 'sent',
  }));
  await runQuoteDelivery(scope, { ...input, action: 'approve', initial: true }, dispatch);
  expect(dispatch.mock.calls[0]?.[0]).not.toHaveProperty('requestId');
  expect((await loadDeliveryReceipt(scope))?.initial).toBe(true);
  await beginAnotherQuoteDelivery(scope);
  await runQuoteDelivery(scope, { ...input, initial: true }, dispatch);
  expect(dispatch.mock.calls[1]?.[0]).not.toHaveProperty('requestId');
});
it('blocks concurrent double taps and changed recipient/channel/revision after a lost response', async () => {
  let resolve!: (value: { ok: true }) => void;
  const dispatch = jest.fn(
    () =>
      new Promise<{ ok: true }>(done => {
        resolve = done;
      }),
  );
  const first = runQuoteDelivery(scope, input, dispatch);
  while (!resolve) await new Promise(done => setTimeout(done, 1));
  await expect(runQuoteDelivery(scope, input, dispatch)).rejects.toMatchObject({ code: 'blocked' });
  resolve({ ok: true });
  await first;
  for (const changed of [
    { to: 'another@example.com' },
    { channel: 'email' as const },
    { expected_revision: 'b'.repeat(64) },
  ])
    await expect(runQuoteDelivery(scope, { ...input, ...changed }, dispatch)).rejects.toMatchObject(
      { code: 'blocked' },
    );
  expect(dispatch).toHaveBeenCalledTimes(1);
});
it('recovers a lost POST response via exact request readback without replaying POST', async () => {
  await unknown();
  const original = (await loadDeliveryReceipt(scope))!;
  const read = jest.fn(async () => readback());
  const result = await reconcileQuoteDelivery(scope, read);
  expect(result).toMatchObject({ requestId: original.requestId, outboxId: O, state: 'delivered' });
  expect(read).toHaveBeenCalledTimes(1);
  await beginAnotherQuoteDelivery(scope);
  await unknown();
  expect((await loadDeliveryReceipt(scope))?.requestId).not.toBe(original.requestId);
});
it.each([
  'pending',
  'retry',
  'sending',
  'accepted',
  'delivered',
  'failed',
  'undelivered',
  'unknown',
] as const)('maps authoritative %s without inventing customer delivery', async status => {
  await unknown();
  const result = (await reconcileQuoteDelivery(scope, () => readback(status)))!;
  const states = {
    pending: 'queued',
    retry: 'queued',
    sending: 'sending',
    accepted: 'provider_accepted',
    delivered: 'delivered',
    failed: 'failed',
    undelivered: 'failed',
    unknown: 'unknown',
  };
  expect(result.state).toBe(states[status]);
  if (status !== 'delivered')
    expect(deliveryReceiptNotice(result)).not.toBe(
      'The carrier confirmed delivery to the customer.',
    );
});
it('rejects missing, foreign-quote, foreign-request and inconsistent readback without clearing its fence', async () => {
  await unknown();
  await expect(reconcileQuoteDelivery(scope, () => readback('not_found'))).rejects.toMatchObject({
    code: 'missing_readback',
  });
  for (const changed of [{ quoteId: O }, { requestId: O }]) {
    await expect(
      reconcileQuoteDelivery(scope, async () => ({ ...(await readback()), ...changed })),
    ).rejects.toMatchObject({ code: 'identity' });
  }
  expect(
    QuoteDeliveryReadbackSchema.safeParse({ ...(await readback()), outboxId: Q }).success,
  ).toBe(false);
  await expect(beginAnotherQuoteDelivery(scope)).rejects.toMatchObject({ code: 'blocked' });
});
it('permits explicit original-outbox retry only after a fresh failed read and survives retry timeout', async () => {
  await unknown();
  const retry = jest.fn(async () => undefined);
  await expect(retryQuoteDelivery(scope, () => readback('unknown'), retry)).rejects.toMatchObject({
    code: 'blocked',
  });
  expect(retry).not.toHaveBeenCalled();
  const result = await retryQuoteDelivery(scope, () => readback('failed'), retry);
  expect(result.state).toBe('queued');
  expect(retry).toHaveBeenCalledWith(O);
  await expect(
    retryQuoteDelivery(
      scope,
      () => readback('failed'),
      async () => {
        throw new Error('timeout');
      },
    ),
  ).rejects.toThrow('timeout');
  expect((await loadDeliveryReceipt(scope))?.state).toBe('unknown');
});
it('keeps unknown email fenced and never mistakes an SMS receipt for email recovery', async () => {
  await unknown({ channel: 'email' });
  const read = jest.fn(async () => readback());
  await expect(reconcileQuoteDelivery(scope, read)).rejects.toMatchObject({
    code: 'missing_readback',
  });
  expect(read).not.toHaveBeenCalled();
  await expect(beginAnotherQuoteDelivery(scope)).rejects.toMatchObject({ code: 'blocked' });
});
it('allows reviewed no-commit errors, while ambiguous release errors remain blocked', async () => {
  for (const error of [
    new MissingClerkTokenError(),
    new ApiError('revision', 409, '/send', { error: 'quote_review_required' }),
  ]) {
    await expect(
      runQuoteDelivery(scope, input, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect((await loadDeliveryReceipt(scope))?.state).toBe('no_commit');
    await beginAnotherQuoteDelivery(scope);
  }
  await expect(
    runQuoteDelivery(scope, input, async () => {
      throw new ApiError('ambiguous', 409, '/send', { error: 'approval_unavailable' });
    }),
  ).rejects.toBeInstanceOf(ApiError);
  expect((await loadDeliveryReceipt(scope))?.state).toBe('unknown');
});
it('fails before dispatch when storage is unavailable and retains pending if outcome persistence fails', async () => {
  const dispatch = jest.fn(async () => ({ ok: true as const, accepted: true, outboxId: O }));
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('device locked'));
  await expect(runQuoteDelivery(scope, input, dispatch)).rejects.toMatchObject({ code: 'storage' });
  expect(dispatch).not.toHaveBeenCalled();
  jest
    .mocked(SecureStore.setItemAsync)
    .mockImplementationOnce(async (key, value) => {
      secure.set(key, value);
    })
    .mockRejectedValueOnce(new Error('device locked'));
  await expect(runQuoteDelivery(scope, input, dispatch)).rejects.toMatchObject({ code: 'storage' });
  expect((await loadDeliveryReceipt(scope))?.state).toBe('pending');
});
it('does not expose another account receipt and treats corrupt storage as blocked', async () => {
  await unknown();
  expect(await loadDeliveryReceipt({ ...scope, userId: 'B' })).toBeNull();
  expect(await loadDeliveryReceipt({ ...scope, tenantId: 'B' })).toBeNull();
  expect(await loadDeliveryReceipt({ ...scope, quoteId: O })).toBeNull();
  secure.set(await deliveryReceiptKey(scope), 'broken');
  await expect(runQuoteDelivery(scope, input, jest.fn())).rejects.toMatchObject({
    code: 'storage',
  });
});

it('separates the paid-final balance intent from its quote delivery while preserving existing receipt keys', async () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  const legacy = crypto
    .createHash('sha256')
    .update(JSON.stringify([scope.userId, scope.tenantId.toLowerCase(), Q]))
    .digest('hex');
  expect(await deliveryReceiptKey(scope)).toBe(`quotemax.quote-delivery.v1.${legacy}`);
  await unknown();
  const balanceScope = { ...scope, purpose: 'balance' as const };
  expect(await loadDeliveryReceipt(balanceScope)).toBeNull();
  const dispatch = jest.fn(async () => ({
    ok: true as const,
    accepted: true,
    outboxId: O,
    finalQuoteId: Q,
    quote_id: O,
  }));
  await runQuoteDelivery(
    balanceScope,
    { ...input, action: 'request-final-payment', initial: true },
    dispatch,
  );
  expect(dispatch.mock.calls).toHaveLength(1);
  expect((await loadDeliveryReceipt(scope))?.state).toBe('unknown');
  expect((await loadDeliveryReceipt(balanceScope))?.state).toBe('provider_accepted');
});
it.each([{ finalQuoteId: O, quote_id: O }, { finalQuoteId: Q, quote_id: Q }, { quote_id: O }])(
  'fences a balance POST without exact final/child identity: %j',
  async response => {
    const balanceScope = { ...scope, purpose: 'balance' as const };
    await expect(
      runQuoteDelivery(balanceScope, { ...input, action: 'request-final-payment' }, async () => ({
        ok: true,
        accepted: true,
        ...response,
      })),
    ).rejects.toMatchObject({ code: 'identity' });
    expect((await loadDeliveryReceipt(balanceScope))?.state).toBe('unknown');
  },
);
it('requires the balance action and SMS channel for a balance receipt', async () => {
  const dispatch = jest.fn();
  await expect(
    runQuoteDelivery({ ...scope, purpose: 'balance' }, input, dispatch),
  ).rejects.toMatchObject({ code: 'identity' });
  await expect(
    runQuoteDelivery(scope, { ...input, action: 'request-final-payment' }, dispatch),
  ).rejects.toMatchObject({ code: 'identity' });
  await expect(
    runQuoteDelivery(
      { ...scope, purpose: 'balance' },
      { ...input, action: 'request-final-payment', channel: 'email' },
      dispatch,
    ),
  ).rejects.toMatchObject({ code: 'identity' });
  expect(dispatch).not.toHaveBeenCalled();
});
it('recognizes a proven paid balance without an outbox and blocks every new payment request', async () => {
  const balanceScope = { ...scope, purpose: 'balance' as const };
  await runQuoteDelivery(
    balanceScope,
    { ...input, action: 'request-final-payment', initial: true },
    async () => ({ ok: true, finalQuoteId: Q, quote_id: O }),
  );
  const read = async () => ({
    ok: true as const,
    quoteId: Q,
    requestId: null,
    status: 'not_found' as const,
    outboxId: null,
    approved: true,
    message: null,
    balancePaid: true,
  });
  const receipt = (await reconcileQuoteDelivery(balanceScope, read))!;
  expect(receipt.state).toBe('balance_paid');
  expect(deliveryReceiptNotice(receipt)).toContain('payment is confirmed');
  expect(() => observeDelivery(scope, receipt, { ...awaitablePaidRead(), quoteId: Q })).toThrow();
  await expect(beginAnotherQuoteDelivery(balanceScope)).rejects.toMatchObject({ code: 'blocked' });
  const retry = jest.fn();
  await expect(retryQuoteDelivery(balanceScope, read, retry)).rejects.toMatchObject({
    code: 'blocked',
  });
  expect(retry).not.toHaveBeenCalled();
});
function awaitablePaidRead() {
  return {
    ok: true as const,
    quoteId: Q,
    requestId: null,
    status: 'not_found' as const,
    outboxId: null,
    approved: true,
    message: null,
    balancePaid: true,
  };
}
it.each(['quote_contact_unavailable', 'quote_pricing_review_required', 'pricing_unavailable'])(
  'allows safe review retry for pre-send %s but retains the balance-purpose fence',
  async code => {
    const fail = async () => {
      throw new ApiError('review', 503, '/send', { error: code });
    };
    await runQuoteDelivery(scope, input, fail).catch(() => undefined);
    expect((await loadDeliveryReceipt(scope))?.state).toBe('no_commit');
    const balanceScope = { ...scope, purpose: 'balance' as const };
    await runQuoteDelivery(balanceScope, { ...input, action: 'request-final-payment' }, fail).catch(
      () => undefined,
    );
    expect((await loadDeliveryReceipt(balanceScope))?.state).toBe('unknown');
  },
);
it('rejects final-payment readback that substitutes the final record for its child', () => {
  expect(
    FinalPaymentReadbackSchema.safeParse({ ...awaitablePaidRead(), finalQuoteId: Q }).success,
  ).toBe(false);
  expect(
    FinalPaymentReadbackSchema.safeParse({ ...awaitablePaidRead(), quoteId: O, finalQuoteId: Q })
      .success,
  ).toBe(true);
});
