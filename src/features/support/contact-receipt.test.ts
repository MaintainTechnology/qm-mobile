import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@/lib/api';
import { EMPTY_CONTACT_DRAFT } from './contact-contract';
import { acknowledgeContact, loadContactReceipt, submitContact } from './contact-receipt';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_: string, s: string) => crypto.createHash('sha256').update(s).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true), getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const scope = { userId: 'user_A' };
const input = { ...EMPTY_CONTACT_DRAFT, name: 'Alex', email: 'private@example.invalid', message: 'Private support request' };
beforeEach(() => {
  storage.clear(); jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { storage.delete(key); });
});
it('verifies an opaque receipt before POST and never sends its local reference as a server ticket', async () => {
  const dispatch = jest.fn(async body => {
    expect(body).toEqual(input);
    expect((await loadContactReceipt(scope))?.status).toBe('unknown');
    return { ok: true };
  });
  const receipt = await submitContact(scope, input, dispatch);
  expect(receipt.status).toBe('confirmed');
  expect([...storage.values()].join('')).not.toContain(input.message);
  expect([...storage.values()].join('')).not.toContain(input.email);
  expect([...storage.keys()].join('')).not.toContain(scope.userId);
});
it.each([
  ['lost response', () => { throw new TypeError('Lost response'); }],
  ['malformed acknowledgement', () => ({ ok: false })],
  ['unknown provider failure', () => { throw new ApiError('Failed', 502, '/api/contact', { error: 'send_failed' }); }],
] as const)('retains %s across remount and blocks every new or changed submission', async (_name, response) => {
  await expect(submitContact(scope, input, async () => response())).rejects.toThrow();
  const receipt = (await loadContactReceipt(scope))!;
  const before = [...storage.entries()];
  const dispatch = jest.fn();
  for (const next of [input, { ...input, message: 'A different message' }]) await expect(submitContact(scope, next, dispatch)).rejects.toThrow('previous support message');
  await expect(acknowledgeContact(scope, receipt.requestId)).rejects.toThrow('not confirmed');
  expect(dispatch).not.toHaveBeenCalled(); expect([...storage.entries()]).toEqual(before);
});
it('allows a deliberate new attempt only after a recognized pre-send rejection', async () => {
  await expect(submitContact(scope, input, async () => { throw new ApiError('Limit', 429, '/api/contact', { error: 'rate_limited' }); })).rejects.toThrow();
  expect((await loadContactReceipt(scope))?.status).toBe('rejected');
  expect((await submitContact(scope, input, async () => ({ ok: true }))).status).toBe('confirmed');
});
it('requires explicit acknowledgement of confirmed receipt before another enquiry', async () => {
  const receipt = await submitContact(scope, input, async () => ({ ok: true }));
  await expect(submitContact(scope, input, jest.fn())).rejects.toThrow('previous support message');
  await acknowledgeContact(scope, receipt.requestId);
  expect((await submitContact(scope, { ...input, message: 'Another enquiry' }, async () => ({ ok: true }))).requestId).not.toBe(receipt.requestId);
});
it('does not dispatch when a receipt write or readback verification fails', async () => {
  jest.mocked(SecureStore.setItemAsync).mockResolvedValueOnce(undefined);
  const dispatch = jest.fn();
  await expect(submitContact(scope, input, dispatch)).rejects.toThrow('could not be stored');
  expect(dispatch).not.toHaveBeenCalled();
});
it('keeps a committed unknown receipt when storing the confirmed acknowledgement fails', async () => {
  const write = jest.mocked(SecureStore.setItemAsync);
  write.mockImplementation(async (key, raw) => { if (JSON.parse(raw).status === 'confirmed') throw new Error('Disk full'); storage.set(key, raw); });
  await expect(submitContact(scope, input, async () => ({ ok: true }))).rejects.toThrow('Disk full');
  expect((await loadContactReceipt(scope))?.status).toBe('unknown');
  await expect(submitContact(scope, input, jest.fn())).rejects.toThrow('previous support message');
});
it('serializes simultaneous taps while the first dispatch remains unresolved', async () => {
  let finish!: (value: unknown) => void;
  const dispatch = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const first = submitContact(scope, input, dispatch);
  for (let i = 0; i < 40 && !finish; i++) await Promise.resolve();
  await expect(submitContact(scope, input, dispatch)).rejects.toThrow('still in progress');
  finish({ ok: true }); await first;
  expect(dispatch).toHaveBeenCalledTimes(1);
});
it('separates guest and account receipts and never expires an unknown result', async () => {
  await expect(submitContact(scope, input, async () => { throw new Error('Lost'); })).rejects.toThrow();
  for (const userId of [null, 'user_B']) expect(await loadContactReceipt({ userId })).toBeNull();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 365 * 86400000);
  expect((await loadContactReceipt(scope))?.status).toBe('unknown');
  clock.mockRestore();
});
