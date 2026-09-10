import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  clearAllQuoteDrafts,
  createQuoteDraftStore,
  QUOTE_DRAFT_RETENTION_MS,
  QUOTE_DRAFT_MAX_SLOTS,
} from './quote-draft-storage';
import type { QuoteDraftInput } from './quote-draft-storage';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: jest.fn(async (_algorithm: string, text: string) =>
      crypto.createHash('sha256').update(text).digest('hex'),
    ),
    randomUUID: () => crypto.randomUUID(),
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
const get = jest.mocked(SecureStore.getItemAsync);
const set = jest.mocked(SecureStore.setItemAsync);
const remove = jest.mocked(SecureStore.deleteItemAsync);
const available = jest.mocked(SecureStore.isAvailableAsync);
const scope = { userId: 'user_A', tenantId: 'tenant_A', quoteId: 'quote_A' };
function input(description = 'Customer kitchen socket'): QuoteDraftInput {
  const originalTiers = {
    good: {
      label: 'Good',
      lines: [
        {
          key: 'good:0',
          originalIndex: 0,
          description: 'Original',
          quantity: '1',
          price: '125',
          source: 'catalogue',
          safety_note: 'Isolation required',
        },
      ],
    },
  };
  return {
    revision: 'a'.repeat(64),
    originalTiers,
    workingTiers: {
      good: {
        label: 'Edited',
        lines: [
          {
            ...originalTiers.good.lines[0],
            key: 'new:manual:1/with spaces',
            originalIndex: null,
            description,
            quantity: '1.',
            price: '',
          },
        ],
      },
    },
  };
}
const manifests = () => [...secure.entries()].filter(([key]) => key.endsWith('.manifest'));
const chunkEntries = () => [...secure.entries()].filter(([key]) => !key.endsWith('.manifest'));

beforeEach(async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  get.mockImplementation(async key => secure.get(key) ?? null);
  set.mockImplementation(async (key, value) => {
    secure.set(key, value);
  });
  remove.mockImplementation(async key => {
    secure.delete(key);
  });
  available.mockResolvedValue(true);
  secure.clear();
  await clearAllQuoteDrafts();
  jest.clearAllMocks();
});

it('restores both editor baselines and incomplete numeric text after a new handle, without plaintext storage', async () => {
  const data = input();
  await createQuoteDraftStore(scope).save(data);
  const restored = await createQuoteDraftStore(scope).load();
  expect(restored).toMatchObject(data);
  expect(restored!.expiresAt - restored!.savedAt).toBe(QUOTE_DRAFT_RETENTION_MS);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(
    set.mock.calls.every(
      ([, , options]) => options?.keychainAccessible === SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    ),
  ).toBe(true);
});

it('cannot read another user, tenant, or quote working copy', async () => {
  await createQuoteDraftStore(scope).save(input());
  for (const other of [
    { ...scope, userId: 'user_B' },
    { ...scope, tenantId: 'tenant_B' },
    { ...scope, quoteId: 'quote_B' },
  ]) {
    expect(await createQuoteDraftStore(other).load()).toBeNull();
  }
  expect(await createQuoteDraftStore(scope).load()).not.toBeNull();
});

it('recovers formatted narrative and appearance alongside independent unsaved prices', async () => {
  const data: QuoteDraftInput = {
    ...input(),
    narrative: {
      originalDoc: { version: 1, blocks: [{ type: 'pricing' }] },
      workingDoc: {
        version: 1,
        blocks: [
          { type: 'heading', content: [{ text: 'Agreed scope', marks: ['bold', 'underline'] }] },
          {
            type: 'bulletList',
            items: [[{ text: 'Owner-supplied charger', marks: ['highlight'] }]],
          },
          { type: 'pricing' },
        ],
      },
      originalStyle: null,
      workingStyle: { fontFamily: 'serif', accentColor: '#2563EB', headingStyle: 'bar' },
    },
  };
  await createQuoteDraftStore(scope).save(data);
  expect(await createQuoteDraftStore(scope).load()).toMatchObject(data);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('bounds UTF-8 chunks and commits a manifest only after all chunks are durable', async () => {
  const data = input('🔧漢字'.repeat(1500));
  await createQuoteDraftStore(scope).save(data);
  expect(chunkEntries().length).toBeGreaterThan(3);
  for (const [, value] of chunkEntries())
    expect(Buffer.byteLength(value, 'utf8')).toBeLessThanOrEqual(1800);
  const calls = set.mock.calls;
  expect(calls[0]![0]).toMatch(/\.manifest$/); // discoverable pending generation
  expect(JSON.parse(calls[0]![1]).current).toBeNull();
  expect(calls.at(-1)![0]).toMatch(/\.manifest$/);
  expect(JSON.parse(calls.at(-1)![1]).pending).toBeNull();
  expect(await createQuoteDraftStore(scope).load()).toMatchObject(data);
});

it('preserves the previous good copy after a chunk failure and can later replace it', async () => {
  const store = createQuoteDraftStore(scope);
  await store.save(input('previous'));
  set.mockImplementation(async (key, value) => {
    if (!key.endsWith('.manifest')) throw new Error('disk full');
    secure.set(key, value);
  });
  await expect(store.save(input('new'))).rejects.toMatchObject({ code: 'io' });
  expect(await store.load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'previous' }] } },
  });
  set.mockImplementation(async (key, value) => {
    secure.set(key, value);
  });
  await store.save(input('recovered'));
  expect(await store.load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'recovered' }] } },
  });
  await store.remove();
  expect(secure.size).toBe(0);
});

it('keeps a complete generation after an ambiguous final-manifest acknowledgement', async () => {
  const store = createQuoteDraftStore(scope);
  await store.save(input('previous'));
  set.mockImplementation(async (key, value) => {
    secure.set(key, value);
    if (key.endsWith('.manifest') && JSON.parse(value).pending === null)
      throw new Error('lost acknowledgement');
  });
  await expect(store.save(input('committed'))).rejects.toMatchObject({ code: 'io' });
  expect(await store.load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'committed' }] } },
  });
  expect(JSON.parse(manifests()[0]![1]).retired).not.toBeNull();
});

it('retains the old manifest when the final switch fails before committing', async () => {
  const store = createQuoteDraftStore(scope);
  await store.save(input('previous'));
  set.mockImplementation(async (key, value) => {
    if (key.endsWith('.manifest') && JSON.parse(value).pending === null)
      throw new Error('manifest refused');
    secure.set(key, value);
  });
  await expect(store.save(input('uncommitted'))).rejects.toMatchObject({ code: 'io' });
  expect(await createQuoteDraftStore(scope).load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'previous' }] } },
  });
  expect(JSON.parse(manifests()[0]![1]).pending).not.toBeNull();
  await clearAllQuoteDrafts();
  expect(secure.size).toBe(0);
});

it('serializes rapid edits and snapshots input at invocation', async () => {
  const store = createQuoteDraftStore(scope);
  const first = input('first');
  const writing = store.save(first);
  first.workingTiers.good!.lines[0]!.description = 'mutated';
  await writing;
  expect(await store.load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'first' }] } },
  });
  await Promise.all([store.save(input('second')), store.save(input('third'))]);
  expect(await store.load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'third' }] } },
  });
});

it('expires the editable working copy after seven days and removes all generations', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1000000);
  const store = createQuoteDraftStore(scope);
  await store.save(input('first'));
  await store.save(input('second'));
  now.mockReturnValue(1000000 + QUOTE_DRAFT_RETENTION_MS);
  expect(await store.load()).toBeNull();
  expect(secure.size).toBe(0);
  now.mockRestore();
});

it('fails closed on missing, altered or wrong-scope chunks without deleting the record', async () => {
  const store = createQuoteDraftStore(scope);
  await store.save(input());
  const [key, value] = chunkEntries()[0]!;
  secure.delete(key);
  await expect(store.load()).rejects.toMatchObject({ code: 'corrupt' });
  secure.set(key, value + 'changed');
  await expect(store.load()).rejects.toMatchObject({ code: 'corrupt' });
  expect(manifests()).toHaveLength(1);
});

it('rejects oversized or unexpected customer fields before overwriting the previous copy', async () => {
  const store = createQuoteDraftStore(scope);
  await store.save(input('previous'));
  await expect(
    store.save({ ...input(), caller: { name: 'PII' } } as QuoteDraftInput),
  ).rejects.toMatchObject({ code: 'too_large' });
  const large = input();
  large.workingTiers.good!.lines = Array.from({ length: 80 }, () => ({
    ...large.workingTiers.good!.lines[0]!,
    description: 'x'.repeat(8000),
  }));
  await expect(store.save(large)).rejects.toMatchObject({ code: 'too_large' });
  expect(await store.load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'previous' }] } },
  });
});

it('keeps twenty drafts intact and reports capacity instead of silently evicting one', async () => {
  for (let index = 0; index < QUOTE_DRAFT_MAX_SLOTS; index++)
    await createQuoteDraftStore({ ...scope, quoteId: `quote_${index}` }).save(input());
  await expect(createQuoteDraftStore(scope).save(input())).rejects.toMatchObject({ code: 'full' });
  expect(manifests()).toHaveLength(QUOTE_DRAFT_MAX_SLOTS);
  await createQuoteDraftStore({ ...scope, quoteId: 'quote_0' }).remove();
  await createQuoteDraftStore(scope).save(input());
});

it('reclaims slots occupied by failed first writes without evicting any committed draft', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1000000);
  set.mockImplementation(async (key, value) => {
    if (!key.endsWith('.manifest')) throw new Error('first chunk failed');
    secure.set(key, value);
  });
  for (let index = 0; index < QUOTE_DRAFT_MAX_SLOTS; index++) {
    await expect(
      createQuoteDraftStore({ ...scope, quoteId: `failed_${index}` }).save(input()),
    ).rejects.toMatchObject({ code: 'io' });
  }
  expect(manifests()).toHaveLength(QUOTE_DRAFT_MAX_SLOTS);
  expect(manifests().every(([, raw]) => JSON.parse(raw).current === null)).toBe(true);
  now.mockReturnValue(1000000 + QUOTE_DRAFT_RETENTION_MS);
  set.mockImplementation(async (key, value) => {
    secure.set(key, value);
  });
  await createQuoteDraftStore(scope).save(input('recoverable'));
  expect(await createQuoteDraftStore(scope).load()).toMatchObject({
    workingTiers: { good: { lines: [{ description: 'recoverable' }] } },
  });
  now.mockRestore();
});

it('revokes a write already awaiting native storage and purges its incomplete generation on logout', async () => {
  const store = createQuoteDraftStore(scope);
  let release!: () => void;
  let notify!: () => void;
  const started = new Promise<void>(resolve => {
    notify = resolve;
  });
  set.mockImplementationOnce(async (key, value) => {
    notify();
    await new Promise<void>(resolve => {
      release = resolve;
    });
    secure.set(key, value);
  });
  const writing = store.save(input());
  const assertion = expect(writing).rejects.toMatchObject({ code: 'revoked' });
  await started;
  const clearing = clearAllQuoteDrafts();
  const duringPurge = createQuoteDraftStore(scope);
  release();
  await assertion;
  await clearing;
  expect(secure.size).toBe(0);
  await expect(store.load()).rejects.toMatchObject({ code: 'revoked' });
  await expect(duringPurge.save(input())).rejects.toMatchObject({ code: 'revoked' });
  expect(await createQuoteDraftStore(scope).load()).toBeNull();
});

it('retains purge metadata on deletion failure, blocks access, and retries cleanup', async () => {
  await createQuoteDraftStore(scope).save(input());
  remove.mockRejectedValueOnce(new Error('device locked'));
  await expect(clearAllQuoteDrafts()).rejects.toMatchObject({ code: 'io' });
  expect(manifests()).toHaveLength(1);
  expect(secure.get('quotemax.quote-draft.v1.purging')).toBe('1');
  await expect(createQuoteDraftStore(scope).load()).rejects.toMatchObject({ code: 'revoked' });
  await clearAllQuoteDrafts();
  expect(secure.size).toBe(0);
});

it('completes a persisted interrupted logout before a new process can restore a draft', async () => {
  await createQuoteDraftStore(scope).save(input('must be purged'));
  // A previous process persisted its logout marker but stopped before deletion.
  secure.set('quotemax.quote-draft.v1.purging', '1');
  expect(await createQuoteDraftStore(scope).load()).toBeNull();
  expect(secure.size).toBe(0);
});

it('does not return an old account draft if logout happens while its chunks are loading', async () => {
  const store = createQuoteDraftStore(scope);
  await store.save(input());
  let release!: () => void;
  let notify!: () => void;
  const started = new Promise<void>(resolve => {
    notify = resolve;
  });
  get.mockImplementation(async key => {
    if (!key.endsWith('.manifest')) {
      notify();
      await new Promise<void>(resolve => {
        release = resolve;
      });
    }
    return secure.get(key) ?? null;
  });
  const loading = store.load();
  const assertion = expect(loading).rejects.toMatchObject({ code: 'revoked' });
  await started;
  const clearing = clearAllQuoteDrafts();
  release();
  await assertion;
  await clearing;
  expect(secure.size).toBe(0);
});

it('has no plaintext fallback when encryption is unavailable or running on web', async () => {
  available.mockResolvedValueOnce(false);
  await expect(createQuoteDraftStore(scope).save(input())).rejects.toMatchObject({
    code: 'unavailable',
  });
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  await expect(createQuoteDraftStore(scope).save(input())).rejects.toMatchObject({
    code: 'unavailable',
  });
  expect(set).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('purges encrypted manifests without relying on an AsyncStorage index', async () => {
  await createQuoteDraftStore(scope).save(input('first'));
  await createQuoteDraftStore(scope).save(input('second'));
  await AsyncStorage.clear(); // Models iOS reinstall retaining its Keychain.
  expect(await createQuoteDraftStore(scope).load()).not.toBeNull();
  await clearAllQuoteDrafts();
  expect(secure.size).toBe(0);
});
