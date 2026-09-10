import { createHash } from 'node:crypto';
import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@/lib/api';
import { acknowledgeProfileWrite, loadProfileReceipt, recoverProfileWrite, writeBusinessProfile } from './business-profile-write';
import { profileCompletion, profileDeferred, profileScope as scope, PROFILE_REV_A, PROFILE_REV_C, PROFILE_TENANT_B } from './business-profile-test-fixture';
import type { ProfileRequest } from './business-profile-contract';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_: string, text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const patch = { business_name: 'Private name', owner_email: 'private@example.test' };
const input = { expectedRevision: PROFILE_REV_A, patch };
beforeEach(() => {
  storage.clear(); jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { storage.delete(key); });
});
it('stores and verifies an opaque operation before PATCH, retaining exact completion until acknowledged', async () => {
  const dispatch = jest.fn(async (request: ProfileRequest) => {
    expect(request).toMatchObject(input); expect(request.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(await loadProfileReceipt(scope)).toMatchObject({ version: 2, requestId: request.requestId, expectedRevision: PROFILE_REV_A, status: 'unknown' });
    expect([...storage.values()].join('')).not.toContain(patch.owner_email); expect([...storage.values()].join('')).not.toContain(patch.business_name);
    return profileCompletion(request);
  });
  const complete = await writeBusinessProfile(scope, input, dispatch);
  expect(await loadProfileReceipt(scope)).toMatchObject({ status: 'complete', revision: complete.revision });
  expect(await writeBusinessProfile(scope, input, dispatch)).toEqual(complete); expect(dispatch).toHaveBeenCalledTimes(1);
  await acknowledgeProfileWrite(scope, complete.requestId); expect(await loadProfileReceipt(scope)).toBeNull();
});
it('recovers an unknown operation through exact GET evidence without dispatching it again', async () => {
  let request!: ProfileRequest;
  await expect(writeBusinessProfile(scope, input, async value => { request = value; throw new TypeError('Lost acknowledgement'); })).rejects.toThrow();
  const original = await loadProfileReceipt(scope);
  const complete = await profileCompletion(request);
  const lookup = jest.fn(async () => complete);
  expect(await recoverProfileWrite(scope, lookup)).toEqual(complete);
  expect(lookup).toHaveBeenCalledWith(request.requestId);
  expect(await loadProfileReceipt(scope)).toMatchObject({ ...original, status: 'complete', revision: complete.revision });
});
it('keeps not_found ambiguous and fences changed retries by exact normalized input hash', async () => {
  let request!: ProfileRequest;
  await expect(writeBusinessProfile(scope, input, async value => { request = value; throw new Error('Lost'); })).rejects.toThrow();
  const original = await loadProfileReceipt(scope);
  expect(await recoverProfileWrite(scope, async () => ({ ok: true, ...scope, requestId: request.requestId, status: 'not_found' }))).toBeNull();
  expect(await loadProfileReceipt(scope)).toEqual(original);
  const dispatch = jest.fn();
  await expect(writeBusinessProfile(scope, { ...input, patch: { ...patch, business_name: 'Changed retry' } }, dispatch)).rejects.toThrow(/exact original/);
  await expect(writeBusinessProfile(scope, { ...input, expectedRevision: PROFILE_REV_C }, dispatch)).rejects.toThrow(/exact original/);
  expect(dispatch).not.toHaveBeenCalled(); expect(await loadProfileReceipt(scope)).toEqual(original);
});
it.each(['tenant', 'user', 'request', 'hash', 'revision'] as const)('rejects mismatched %s in a completion without retiring unknown recovery', async field => {
  let request!: ProfileRequest;
  await expect(writeBusinessProfile(scope, input, async value => { request = value; throw new Error('Lost'); })).rejects.toThrow();
  const complete = await profileCompletion(request);
  const bad = { ...complete, ...(field === 'tenant' ? { tenantId: PROFILE_TENANT_B } : field === 'user' ? { userId: 'user_B' }
    : field === 'request' ? { requestId: PROFILE_REV_C } : field === 'hash' ? { inputHash: 'f'.repeat(64) } : { expectedRevision: PROFILE_REV_C }) };
  await expect(recoverProfileWrite(scope, async () => bad)).rejects.toThrow();
  expect(await loadProfileReceipt(scope)).toMatchObject({ status: 'unknown' });
});
it('does not discard an older unknown after a rejected retry', async () => {
  await expect(writeBusinessProfile(scope, input, async () => { throw new Error('Lost'); })).rejects.toThrow();
  const original = await loadProfileReceipt(scope);
  await expect(writeBusinessProfile(scope, input, async () => { throw new ApiError('Denied', 403, '/api/tenant/business-profile'); })).rejects.toThrow();
  expect(await loadProfileReceipt(scope)).toEqual(original);
});
it.each([
  [409, { error: 'business_profile_operation_conflict' }],
  [400, { error: 'unknown_failure' }], [401, null], [403, null], [404, null], [422, null],
] as const)('retains a first HTTP %s failure reference and reuses the same request for explicit retry', async (status, body) => {
  let first!: ProfileRequest;
  await expect(writeBusinessProfile(scope, input, async request => {
    first = request; throw new ApiError('Unbound failure', status, '/api/tenant/business-profile', body);
  })).rejects.toThrow('Unbound failure');
  expect(await loadProfileReceipt(scope)).toMatchObject({ status: 'unknown', requestId: first.requestId });
  const dispatch = jest.fn(async (request: ProfileRequest) => profileCompletion(request));
  await writeBusinessProfile(scope, input, dispatch);
  expect(dispatch).toHaveBeenCalledWith(first); expect(dispatch).toHaveBeenCalledTimes(1);
});
it.each(['business_profile_email_conflict', 'business_profile_revision_conflict'] as const)('retains verified %s as terminal evidence without dispatching it again', async errorCode => {
  let request!: ProfileRequest;
  await expect(writeBusinessProfile(scope, input, async value => { request = value; throw new TypeError('Lost rejection'); })).rejects.toThrow();
  const rejection = { ...await profileCompletion(request), status: 'rejected' as const, errorCode };
  expect(await recoverProfileWrite(scope, async () => rejection)).toEqual(rejection);
  expect(await loadProfileReceipt(scope)).toMatchObject({ status: 'rejected', errorCode, requestId: request.requestId });
  const dispatch = jest.fn();
  expect(await writeBusinessProfile(scope, input, dispatch)).toEqual(rejection); expect(dispatch).not.toHaveBeenCalled();
  await acknowledgeProfileWrite(scope, request.requestId); expect(await loadProfileReceipt(scope)).toBeNull();
});
it('cannot dispatch without verified secure storage and isolates both user and tenant receipts', async () => {
  const send = jest.fn(); jest.mocked(SecureStore.setItemAsync).mockResolvedValueOnce(undefined);
  await expect(writeBusinessProfile(scope, input, send)).rejects.toThrow(/protected/); expect(send).not.toHaveBeenCalled();
  await expect(writeBusinessProfile(scope, input, async () => { throw new Error('Lost'); })).rejects.toThrow();
  expect(await loadProfileReceipt({ ...scope, userId: 'user_B' })).toBeNull();
  expect(await loadProfileReceipt({ ...scope, tenantId: PROFILE_TENANT_B })).toBeNull();
});
it.each(['rejected', 'revision', 'not_found'] as const)('preserves a completed receipt against contradictory %s recovery', async conflict => {
  const complete = await writeBusinessProfile(scope, input, profileCompletion);
  const before = [...storage.entries()];
  const response = conflict === 'not_found' ? { ok: true, ...scope, requestId: complete.requestId, status: 'not_found' }
    : conflict === 'revision' ? { ...complete, revision: PROFILE_REV_C }
    : { ...complete, status: 'rejected', errorCode: 'business_profile_revision_conflict' };
  await expect(recoverProfileWrite(scope, async () => response)).rejects.toThrow('conflicting business-update outcome');
  expect([...storage.entries()]).toEqual(before);
  expect(await recoverProfileWrite(scope, async () => complete)).toEqual(complete);
});
it.each(['complete', 'reason', 'revision', 'not_found'] as const)('preserves a rejected receipt against contradictory %s recovery', async conflict => {
  const rejected = await writeBusinessProfile(scope, input, async request => ({ ...await profileCompletion(request),
    status: 'rejected', errorCode: 'business_profile_revision_conflict' }));
  const before = [...storage.entries()];
  const response = conflict === 'not_found' ? { ok: true, ...scope, requestId: rejected.requestId, status: 'not_found' }
    : conflict === 'revision' ? { ...rejected, revision: PROFILE_REV_C }
    : conflict === 'reason' ? { ...rejected, errorCode: 'business_profile_email_conflict' }
    : { ok: true, ...scope, requestId: rejected.requestId, expectedRevision: rejected.expectedRevision,
      inputHash: rejected.inputHash, revision: rejected.revision, status: 'complete' };
  await expect(recoverProfileWrite(scope, async () => response)).rejects.toThrow('conflicting business-update outcome');
  expect([...storage.entries()]).toEqual(before);
  expect(await recoverProfileWrite(scope, async () => rejected)).toEqual(rejected);
});
it('serializes simultaneous taps while the first operation is unresolved', async () => {
  const pending = profileDeferred<unknown>(); let request!: ProfileRequest;
  const dispatch = jest.fn((value: ProfileRequest) => { request = value; return pending.promise; });
  const first = writeBusinessProfile(scope, input, dispatch);
  for (let index = 0; index < 80 && !request; index++) await Promise.resolve();
  await expect(writeBusinessProfile(scope, input, dispatch)).rejects.toThrow('still in progress');
  pending.resolve(await profileCompletion(request)); await first; expect(dispatch).toHaveBeenCalledTimes(1);
});
it('preserves a legacy v1 unknown receipt even when current business values happen to match', async () => {
  const id = createHash('sha256').update(JSON.stringify([scope.userId, scope.tenantId])).digest('hex');
  const legacy = { version: 1, hash: 'a'.repeat(64), fields: ['business_name'] };
  storage.set(`quotemax.business-write.v1.${id}`, JSON.stringify(legacy));
  const lookup = jest.fn(), dispatch = jest.fn();
  await expect(recoverProfileWrite(scope, lookup)).rejects.toThrow(/older/);
  await expect(writeBusinessProfile(scope, input, dispatch)).rejects.toThrow(/older/);
  expect(lookup).not.toHaveBeenCalled(); expect(dispatch).not.toHaveBeenCalled(); expect(await loadProfileReceipt(scope)).toEqual(legacy);
});
