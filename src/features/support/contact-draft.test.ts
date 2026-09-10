import * as SecureStore from 'expo-secure-store';
import { clearAllWorkingDrafts } from '@/lib/working-draft-storage';
import { clearLegacyContactDraft, createContactDraftStore } from './contact-draft';
import { EMPTY_CONTACT_DRAFT } from './contact-contract';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_: string, s: string) => crypto.createHash('sha256').update(s).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true), getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const get = jest.mocked(SecureStore.getItemAsync), set = jest.mocked(SecureStore.setItemAsync), remove = jest.mocked(SecureStore.deleteItemAsync);
const input = { ...EMPTY_CONTACT_DRAFT, name: 'Alex', email: 'private@example.invalid', message: 'Private support request' };
beforeEach(async () => {
  get.mockImplementation(async key => storage.get(key) ?? null);
  set.mockImplementation(async (key, value) => { storage.set(key, value); });
  remove.mockImplementation(async key => { storage.delete(key); });
  storage.clear(); await clearAllWorkingDrafts(); jest.clearAllMocks();
});
it('keeps guest and each account separate without supplying a fabricated tenant', async () => {
  await createContactDraftStore({ userId: 'user_A' }).save(input);
  for (const userId of [null, 'user_B']) expect(await createContactDraftStore({ userId }).load()).toBeNull();
  expect(await createContactDraftStore({ userId: 'user_A' }).load()).toMatchObject({ value: input });
  await createContactDraftStore({ userId: null }).save({ ...input, message: 'Guest draft' });
  expect(await createContactDraftStore({ userId: 'guest' }).load()).toBeNull();
});
it('chunks a maximum-size Unicode support message and restores it exactly', async () => {
  const draft = { ...input, message: '漢'.repeat(4000) };
  await createContactDraftStore({ userId: null }).save(draft);
  expect(await createContactDraftStore({ userId: null }).load()).toMatchObject({ value: draft });
  for (const [key, part] of storage) if (!key.endsWith('.manifest')) expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(1800);
});
it('fails a storage read without overwriting or claiming an empty draft', async () => {
  await createContactDraftStore({ userId: 'user_A' }).save(input);
  const before = [...storage.entries()];
  get.mockImplementation(async key => { if (key.endsWith('.manifest')) throw new Error('Unreadable'); return storage.get(key) ?? null; });
  await expect(createContactDraftStore({ userId: 'user_A' }).load()).rejects.toThrow();
  expect([...storage.entries()]).toEqual(before);
});
it('preserves previous input after a failed write and rejects over-limit data', async () => {
  const store = createContactDraftStore({ userId: 'user_A' });
  await store.save(input);
  await expect(store.save({ ...input, message: 'x'.repeat(4001) })).rejects.toThrow();
  set.mockRejectedValueOnce(new Error('Disk full'));
  await expect(store.save({ ...input, name: 'New name' })).rejects.toThrow();
  expect(await store.load()).toMatchObject({ value: input });
});
it('purges only unowned legacy content and reports failed cleanup', async () => {
  storage.set('quotemax.public-contact-draft.v1', JSON.stringify(input));
  storage.set('quotemax.support-attempt.v1.fixture', 'opaque');
  remove.mockResolvedValueOnce(undefined);
  await expect(clearLegacyContactDraft()).rejects.toThrow('cleanup could not finish');
  await clearLegacyContactDraft();
  expect(storage.has('quotemax.public-contact-draft.v1')).toBe(false);
  expect(storage.get('quotemax.support-attempt.v1.fixture')).toBe('opaque');
});
