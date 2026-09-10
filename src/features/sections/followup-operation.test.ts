import * as SecureStore from 'expo-secure-store';
import {
  loadFollowupOperation, recoverFollowupOperation, runFollowupOperation,
  followupOperationFinished, followupOperationMatches, type FollowupOperationScope, type FollowupOperationResult,
} from './followup-operation';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_algorithm: string, text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(), setItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const scope: FollowupOperationScope = { userId: 'user_a', tenantId: 'tenant_a', action: 'text',
  target: { kind: 'quote', id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' } };
const input = { action: 'text' as const, text: 'Private follow-up text', expectedRecipient: '+61412345678' };
const outboxId = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const eventId = 'cccccccc-3333-4333-8333-cccccccccccc';
const result = (requestId: string, patch: Partial<FollowupOperationResult> = {}): FollowupOperationResult => ({
  ok: true, requestId, action: scope.action, target: scope.target, status: 'accepted', accepted: true,
  history: 'complete', eventId, outboxId, providerSid: 'SM' + '1'.repeat(32), message: 'Provider accepted', ...patch,
});
beforeEach(() => {
  storage.clear(); jest.clearAllMocks();
  jest.mocked(SecureStore.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
});

it('writes an opaque receipt before dispatch and preserves the exact reviewed input in the request only', async () => {
  const dispatch = jest.fn(async body => {
    expect((await loadFollowupOperation(scope))?.requestId).toBe(body.requestId);
    expect(body).toEqual({ quoteId: scope.target.id, text: input.text, expectedRecipient: input.expectedRecipient, requestId: expect.any(String) });
    return result(body.requestId);
  });
  expect((await runFollowupOperation(scope, input, 'start', dispatch)).accepted).toBe(true);
  expect([...storage.values()].join('')).not.toContain(input.text);
  expect([...storage.values()].join('')).not.toContain(input.expectedRecipient);
  expect([...storage.keys()].join('')).not.toContain(scope.target.id);
});

it('keeps unknown outcomes through remount and GET-only not_found, then reuses the same id for explicit retry', async () => {
  const dispatch = jest.fn(async () => { throw new TypeError('Lost response'); });
  await expect(runFollowupOperation(scope, input, 'start', dispatch)).rejects.toThrow('Lost response');
  const receipt = (await loadFollowupOperation(scope))!;
  const read = jest.fn(async (id: string) => result(id, { status: 'not_found', accepted: false, history: 'not_applicable', eventId: null, outboxId: null, providerSid: null }));
  const unresolved = await recoverFollowupOperation(scope, read);
  expect(followupOperationFinished(unresolved!)).toBe(false);
  await expect(runFollowupOperation(scope, input, 'start', dispatch)).rejects.toThrow('Check the previous outcome');
  const retry = jest.fn(async body => result(body.requestId));
  await runFollowupOperation(scope, input, 'retry', retry);
  expect(retry.mock.calls[0]?.[0].requestId).toBe(receipt.requestId);
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it('rejects a changed retry body or recipient without dispatching', async () => {
  await expect(runFollowupOperation(scope, input, 'start', async () => { throw new Error('Lost'); })).rejects.toThrow();
  const dispatch = jest.fn();
  for (const changed of [{ ...input, text: 'Different' }, { ...input, expectedRecipient: '+61499999999' }]) {
    await expect(runFollowupOperation(scope, changed, 'retry', dispatch)).rejects.toThrow('Restore the original');
  }
  expect(dispatch).not.toHaveBeenCalled();
});

it('rejects unrelated success evidence and retains the original operation for recovery', async () => {
  await expect(runFollowupOperation(scope, input, 'start', async body => result(body.requestId as string, {
    target: { ...scope.target, id: outboxId },
  }))).rejects.toThrow('does not match');
  expect((await loadFollowupOperation(scope))?.status).toBe('unknown');
});

it('blocks a new operation while provider acceptance still needs history repair', async () => {
  await runFollowupOperation(scope, input, 'start', async body => result(body.requestId as string, { history: 'pending', eventId: null }));
  await expect(runFollowupOperation(scope, input, 'start', jest.fn())).rejects.toThrow('Check the previous outcome');
  const recovered = await recoverFollowupOperation(scope, async id => result(id));
  expect(followupOperationFinished(recovered!)).toBe(true);
});

it('prevents double taps from dispatching twice, including while storage is being read', async () => {
  let finish!: (value: FollowupOperationResult) => void;
  let requestId = '';
  const dispatch = jest.fn(async body => { requestId = body.requestId; return new Promise<FollowupOperationResult>(resolve => { finish = resolve; }); });
  const first = runFollowupOperation(scope, input, 'start', dispatch);
  for (let i = 0; i < 30 && !finish; i++) await Promise.resolve();
  await expect(runFollowupOperation(scope, input, 'start', dispatch)).rejects.toThrow('still in progress');
  finish(result(requestId)); await first;
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it('fails before provider I/O when secure persistence is unavailable', async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('Storage failed'));
  const dispatch = jest.fn();
  await expect(runFollowupOperation(scope, input, 'start', dispatch)).rejects.toThrow('Storage failed');
  expect(dispatch).not.toHaveBeenCalled();
});

it('separates accounts, tenants, actions and lead targets without expiring a pending receipt', async () => {
  await expect(runFollowupOperation(scope, input, 'start', async () => { throw new Error('Lost'); })).rejects.toThrow();
  for (const changed of [{ ...scope, userId: 'user_b' }, { ...scope, tenantId: 'tenant_b' },
    { ...scope, action: 'call' as const }, { ...scope, target: { ...scope.target, kind: 'conversation' as const } }]) {
    expect(await loadFollowupOperation(changed)).toBeNull();
  }
  const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 365 * 24 * 60 * 60 * 1000);
  expect((await loadFollowupOperation(scope))?.status).toBe('unknown');
  clock.mockRestore();
});

it('logs one quote touch with the existing chase state and never calls a quote-only endpoint for a lead', async () => {
  const noteScope = { ...scope, action: 'note' as const };
  const note = { action: 'note' as const, kind: 'note' as const, outcome: 'spoke' as const, note: 'Call Friday', preserveChase: true };
  const dispatch = jest.fn(async body => result(body.requestId, { action: 'note', status: 'complete', accepted: false, providerSid: null, outboxId: null }));
  await runFollowupOperation(noteScope, note, 'start', dispatch);
  expect(dispatch.mock.calls[0]?.[0].preserveChase).toBe(true);
  await expect(runFollowupOperation({ ...noteScope, target: { ...scope.target, kind: 'conversation' } }, note, 'start', dispatch)).rejects.toThrow('no quote contact log');
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it('retries a lost first-touch acknowledgement with its original policy bit after the queue changes', async () => {
  const noteScope = { ...scope, action: 'note' as const };
  const note = { action: 'note' as const, kind: 'note' as const, outcome: 'spoke' as const, note: 'Call Friday', preserveChase: false };
  await expect(runFollowupOperation(noteScope, note, 'start', async () => { throw new Error('Lost'); })).rejects.toThrow();
  const receipt = (await loadFollowupOperation(noteScope))!;
  expect(await followupOperationMatches(scope.target, { ...note, preserveChase: true }, receipt)).toBe(true);
  expect(await followupOperationMatches(scope.target, { ...note, note: 'A newer note', preserveChase: true }, receipt)).toBe(false);
  const retry = jest.fn(async body => result(body.requestId, { action: 'note', status: 'complete', accepted: false, providerSid: null, outboxId: null }));
  await runFollowupOperation(noteScope, { ...note, preserveChase: true }, 'retry', retry);
  expect(retry.mock.calls[0]?.[0].preserveChase).toBe(false);
});

const contradictoryResults: [string, Partial<FollowupOperationResult>][] = [
  ['failed with completed history', { status: 'failed', accepted: false, providerSid: null }],
  ['unknown with completed history', { status: 'unknown', accepted: false, providerSid: null }],
  ['pending with completed history', { status: 'pending', accepted: false, providerSid: null }],
  ['not found with pending history', { status: 'not_found', history: 'pending', accepted: false, eventId: null, outboxId: null, providerSid: null }],
  ['not found with durable evidence', { status: 'not_found', history: 'not_applicable', accepted: false, eventId: null, providerSid: null }],
  ['failed with acceptance', { status: 'failed', history: 'pending', eventId: null }],
  ['accepted without provider evidence', { providerSid: null }],
  ['accepted with malformed provider evidence', { providerSid: 'SMaccepted' }],
  ['text with call evidence', { providerSid: 'CA' + '1'.repeat(32) }],
  ['text without durable outbox evidence', { outboxId: null }],
  ['completed quote without event', { status: 'complete', eventId: null }],
  ['accepted without history applicability', { history: 'not_applicable', eventId: null }],
];

it.each(contradictoryResults)('retains unknown receipt and blocks a new send after readback reports %s', async (_description, patch) => {
  await expect(runFollowupOperation(scope, input, 'start', async () => { throw new Error('Lost'); })).rejects.toThrow('Lost');
  const before = [...storage.entries()];
  await expect(recoverFollowupOperation(scope, async id => result(id, patch))).rejects.toThrow();
  expect([...storage.entries()]).toEqual(before);
  const dispatch = jest.fn();
  await expect(runFollowupOperation(scope, input, 'start', dispatch)).rejects.toThrow('Check the previous outcome');
  expect(dispatch).not.toHaveBeenCalled();
  expect((await loadFollowupOperation(scope))?.status).toBe('unknown');
});

it('keeps the pre-dispatch receipt when a malformed initial acknowledgement claims the request failed', async () => {
  let initial = '';
  await expect(runFollowupOperation(scope, input, 'start', async body => {
    initial = [...storage.values()][0]!;
    return result(body.requestId as string, { status: 'failed', accepted: false, providerSid: null });
  })).rejects.toThrow();
  expect([...storage.values()]).toEqual([initial]);
  const next = jest.fn();
  await expect(runFollowupOperation(scope, input, 'start', next)).rejects.toThrow('Check the previous outcome');
  expect(next).not.toHaveBeenCalled();
});

it('requires call provider evidence and forbids text evidence before releasing a bridge receipt', async () => {
  const callScope = { ...scope, action: 'call' as const };
  const callInput = { action: 'call' as const, expectedRecipient: input.expectedRecipient };
  await expect(runFollowupOperation(callScope, callInput, 'start', async body => result(body.requestId as string, {
    action: 'call', outboxId: null,
  }))).rejects.toThrow();
  const before = [...storage.entries()];
  await expect(runFollowupOperation(callScope, callInput, 'start', jest.fn())).rejects.toThrow('Check the previous outcome');
  expect([...storage.entries()]).toEqual(before);
  const recovered = await recoverFollowupOperation(callScope, async id => result(id, {
    action: 'call', outboxId: null, providerSid: 'CA' + 'a'.repeat(32),
  }));
  expect(followupOperationFinished(recovered!)).toBe(true);
});

it('rejects provider evidence on a note and preserves its unknown event identity', async () => {
  const noteScope = { ...scope, action: 'note' as const };
  const note = { action: 'note' as const, kind: 'note' as const, outcome: 'spoke' as const, note: 'Call Friday', preserveChase: true };
  await expect(runFollowupOperation(noteScope, note, 'start', async body => result(body.requestId as string, {
    action: 'note', status: 'complete', outboxId: null,
  }))).rejects.toThrow();
  const before = [...storage.entries()];
  const dispatch = jest.fn();
  await expect(runFollowupOperation(noteScope, note, 'start', dispatch)).rejects.toThrow('Check the previous outcome');
  expect(dispatch).not.toHaveBeenCalled();
  expect([...storage.entries()]).toEqual(before);
});

it('requires lead history to have no quote event and accepts its exact conversation recovery', async () => {
  const leadScope = { ...scope, target: { ...scope.target, kind: 'conversation' as const } };
  await expect(runFollowupOperation(leadScope, input, 'start', async body => result(body.requestId as string, {
    target: leadScope.target,
  }))).rejects.toThrow();
  const before = [...storage.entries()];
  await expect(runFollowupOperation(leadScope, input, 'start', jest.fn())).rejects.toThrow('Check the previous outcome');
  expect([...storage.entries()]).toEqual(before);
  const recovered = await recoverFollowupOperation(leadScope, async id => result(id, {
    target: leadScope.target, eventId: null,
  }));
  expect(followupOperationFinished(recovered!)).toBe(true);
});

it('canonicalizes uppercase UUIDs across dispatch, remount recovery and same-request retry', async () => {
  const upperScope = { ...scope, target: { ...scope.target, id: scope.target.id.toUpperCase() } };
  let dispatchedId = '';
  await expect(runFollowupOperation(upperScope, input, 'start', async body => {
    expect(body.quoteId).toBe(scope.target.id);
    dispatchedId = body.requestId as string;
    throw new Error('Lost');
  })).rejects.toThrow('Lost');
  expect((await loadFollowupOperation(scope))?.requestId).toBe(dispatchedId);
  await recoverFollowupOperation(scope, async id => result(id.toUpperCase(), {
    target: upperScope.target, status: 'not_found', history: 'not_applicable', accepted: false,
    eventId: null, outboxId: null, providerSid: null,
  }));
  const dispatch = jest.fn(async body => result(body.requestId.toUpperCase(), {
    target: upperScope.target, eventId: eventId.toUpperCase(), outboxId: outboxId.toUpperCase(),
  }));
  const recovered = await runFollowupOperation(upperScope, input, 'retry', dispatch);
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(dispatch.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ quoteId: scope.target.id, requestId: dispatchedId }));
  expect(recovered).toEqual(expect.objectContaining({ requestId: dispatchedId, eventId, outboxId }));
  expect(storage.size).toBe(1);
});
