import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { clearAllWorkingDrafts, createWorkingDraftStore, WORKING_DRAFT_MAX_SLOTS, WORKING_DRAFT_RETENTION_MS } from './working-draft-storage';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_: string, s: string) => crypto.createHash('sha256').update(s).digest('hex'), randomUUID: () => crypto.randomUUID() };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true), getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const secure = new Map<string, string>();
const get = jest.mocked(SecureStore.getItemAsync), set = jest.mocked(SecureStore.setItemAsync), remove = jest.mocked(SecureStore.deleteItemAsync);
const scope = { userId: 'user_A', tenantId: 'tenant_A', purpose: 'roof-v1', recordId: 'record_A' };
const schema = z.object({ text: z.string().max(300000), quantity: z.string().max(32) }).strict();
const value = (text = 'Private working copy') => ({ text, quantity: '1.' });
const store = () => createWorkingDraftStore(scope, schema);
beforeEach(async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  get.mockImplementation(async key => secure.get(key) ?? null);
  set.mockImplementation(async (key, data) => { secure.set(key, data); });
  remove.mockImplementation(async key => { secure.delete(key); });
  secure.clear(); await clearAllWorkingDrafts(); jest.clearAllMocks();
});

it('restores the schema-validated working copy after reopening without plaintext storage', async () => {
  await store().save(value());
  expect(await store().load()).toMatchObject({ value: value() });
  const restored = await store().load();
  expect(restored!.expiresAt - restored!.savedAt).toBe(WORKING_DRAFT_RETENTION_MS);
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(set.mock.calls.every(([, , options]) => options?.keychainAccessible === SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY)).toBe(true);
});
it('partitions account, tenant, purpose and record', async () => {
  await store().save(value());
  for (const field of ['userId','tenantId','purpose','recordId'] as const) {
    expect(await createWorkingDraftStore({ ...scope, [field]: 'other' }, schema).load()).toBeNull();
  }
});
it('supports public account drafts without a tenant and preserves real-tenant scope hashes', async () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  await store().save(value());
  const expected = crypto.createHash('sha256').update(JSON.stringify([scope.userId, scope.tenantId, scope.purpose, scope.recordId])).digest('hex');
  expect([...secure.entries()].filter(([key]) => key.endsWith('.manifest')).map(([, raw]) => JSON.parse(raw).scopeHash)).toContain(expected);
  const publicScope = { userId: scope.userId, purpose: scope.purpose, recordId: scope.recordId };
  expect(await createWorkingDraftStore(publicScope, schema).load()).toBeNull();
  await createWorkingDraftStore(publicScope, schema).save(value('Public enquiry'));
  expect(await createWorkingDraftStore(publicScope, schema).load()).toMatchObject({ value: value('Public enquiry') });
  expect(await store().load()).toMatchObject({ value: value() });
});
it('validates caller schema before writing and while loading', async () => {
  await store().save(value());
  await expect(store().save({ text: 'bad', quantity: 'x'.repeat(33) })).rejects.toMatchObject({ code: 'too_large' });
  await expect(createWorkingDraftStore(scope, z.object({ somethingElse: z.string() })).load()).rejects.toMatchObject({ code: 'io' });
  expect(await store().load()).toMatchObject({ value: value() });
});
it('chunks UTF-8 under native limits and switches manifest last', async () => {
  const data = value('🔧漢字'.repeat(2500)); await store().save(data);
  for (const [key, part] of secure) if (!key.endsWith('.manifest')) expect(Buffer.byteLength(part,'utf8')).toBeLessThanOrEqual(1800);
  expect(JSON.parse(set.mock.calls[0]![1]).current).toBeNull();
  expect(set.mock.calls.at(-1)![0]).toMatch(/manifest$/);
  expect(JSON.parse(set.mock.calls.at(-1)![1]).pending).toBeNull();
  expect(await store().load()).toMatchObject({ value: data });
});
it('retains prior committed content after interrupted chunk or manifest writes', async () => {
  await store().save(value('prior'));
  set.mockImplementation(async (key,data) => { if (!key.endsWith('.manifest')) throw new Error('full'); secure.set(key,data); });
  await expect(store().save(value('new'))).rejects.toMatchObject({ code: 'io' });
  expect(await store().load()).toMatchObject({ value: value('prior') });
  set.mockImplementation(async (key,data) => { secure.set(key,data); });
  await clearAllWorkingDrafts(); expect(secure.size).toBe(0);
});
it('recovers a manifest that committed before its acknowledgement was lost', async () => {
  await store().save(value('prior'));
  set.mockImplementation(async (key,data) => { secure.set(key,data); if (key.endsWith('.manifest') && JSON.parse(data).pending === null) throw new Error('lost ack'); });
  await expect(store().save(value('new'))).rejects.toMatchObject({ code:'io' });
  expect(await store().load()).toMatchObject({ value: value('new') });
});
it('rejects missing or corrupted chunks without discarding other copies', async () => {
  await store().save(value());
  const chunk = [...secure.keys()].find(key => !key.endsWith('.manifest'))!;
  secure.set(chunk, 'corrupted');
  await expect(store().load()).rejects.toMatchObject({ code: 'corrupt' });
  expect(secure.size).toBeGreaterThan(0);
});
it('bounds capacity and refuses oversize without replacing current content', async () => {
  await store().save(value('prior'));
  await expect(store().save(value('x'.repeat(250000)))).rejects.toMatchObject({ code: 'too_large' });
  expect(await store().load()).toMatchObject({ value: value('prior') });
  for (let i=1;i<WORKING_DRAFT_MAX_SLOTS;i++) await createWorkingDraftStore({ ...scope, recordId: `record_${i}` }, schema).save(value());
  await expect(createWorkingDraftStore({ ...scope, recordId:'overflow' }, schema).save(value())).rejects.toMatchObject({ code:'full' });
});
it('expires working copies at seven days', async () => {
  await store().save(value());
  const now = jest.spyOn(Date,'now').mockReturnValue(Date.now() + WORKING_DRAFT_RETENTION_MS + 1);
  expect(await store().load()).toBeNull(); expect(secure.size).toBe(0); now.mockRestore();
});
it('revokes existing handles synchronously on logout and purges all generations', async () => {
  const handle = store(); await handle.save(value());
  const purge = clearAllWorkingDrafts();
  await expect(handle.save(value('late'))).rejects.toMatchObject({ code:'revoked' });
  await purge; expect(secure.size).toBe(0); expect(await store().load()).toBeNull();
});
it('refuses web fallback', async () => {
  Object.defineProperty(Platform,'OS',{ configurable:true,value:'web' });
  await expect(store().save(value())).rejects.toMatchObject({ code:'unavailable' });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
