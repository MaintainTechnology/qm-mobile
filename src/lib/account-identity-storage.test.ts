import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

import { createAccountIdentityBoundary } from './account-identity-boundary';
import { clearAccountScopedState } from './account-storage';
import { clearAllWorkingDrafts, createWorkingDraftStore } from './working-draft-storage';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_: string, value: string) => crypto.createHash('sha256').update(value).digest('hex'), randomUUID: () => crypto.randomUUID() };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true), getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('@/features/auth/acquisition-envelope', () => ({ clearAcquisitionEnvelope: jest.fn(async () => undefined) }));
jest.mock('@/features/quotes/quote-draft-storage', () => ({ clearAllQuoteDrafts: jest.fn(async () => undefined) }));
jest.mock('@/features/studio/studio-export-cache', () => ({ clearStudioExportCache: jest.fn(async () => undefined) }));
jest.mock('@/lib/query', () => ({ queryClient: { clear: jest.fn() }, asyncStoragePersister: { removeClient: jest.fn(async () => undefined) } }));
jest.mock('@/lib/session', () => ({ clearSessionToken: jest.fn(async () => undefined) }));
const secure = new Map<string, string>();
const user = { userId: 'user_A', sessionId: 'session_A', tenantId: 'tenant_A' };
const scope = { userId: user.userId, tenantId: user.tenantId, purpose: 'review-v1', recordId: 'record_A' };
const draft = () => createWorkingDraftStore(scope, z.object({ text: z.string() }));
const identity = () => createAccountIdentityBoundary({ initialiseServerCache: jest.fn(), clearLocalState: clearAccountScopedState });
async function settled(boundary: ReturnType<typeof identity>) {
  if (boundary.getSnapshot().status !== 'cleaning') return;
  await new Promise<void>(resolve => {
    const unsubscribe = boundary.subscribe(() => {
      if (boundary.getSnapshot().status !== 'cleaning') { unsubscribe(); resolve(); }
    });
  });
}
beforeEach(async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => secure.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { secure.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { secure.delete(key); });
  secure.clear(); await clearAllWorkingDrafts(); jest.clearAllMocks();
});

it('retains a confirmed encrypted working copy across first same-account hydration and reopen', async () => {
  await draft().save({ text: 'Unsaved owner correction' });
  const boundary = identity(); boundary.observe(user); boundary.observe(user);
  expect(await draft().load()).toMatchObject({ value: { text: 'Unsaved owner correction' } });
  expect(boundary.getSnapshot().status).toBe('ready');
});
it('revokes actual old writers before an account transition cleanup promise resolves', async () => {
  const handle = draft(); await handle.save({ text: 'Account A private edit' });
  const boundary = identity(); boundary.observe(user); boundary.observe(user);
  boundary.observe({ userId: 'user_B', sessionId: 'session_B', tenantId: null });
  await expect(handle.save({ text: 'Late write from A' })).rejects.toMatchObject({ code: 'revoked' });
  await settled(boundary);
  expect(boundary.getSnapshot().status).toBe('ready');
  expect(await draft().load()).toBeNull();
});
it('preserves unknown-result operation receipts when a session expires', async () => {
  const receiptKey = 'quotemax.delivery.v1.retained-operation';
  secure.set(receiptKey, JSON.stringify({ status: 'unknown', requestId: 'opaque-request' }));
  await draft().save({ text: 'Private draft' });
  const boundary = identity(); boundary.observe(user); boundary.observe(user);
  boundary.observe({ userId: null, sessionId: null, tenantId: null });
  await settled(boundary);
  expect(secure.get(receiptKey)).toContain('unknown');
  expect(await draft().load()).toBeNull();
});
it('blocks new handles after failed purge and reopens only after successful retry', async () => {
  await draft().save({ text: 'Private draft' });
  const boundary = identity(); boundary.observe(user); boundary.observe(user);
  let rejectWorkingDraft = true;
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => {
    if (rejectWorkingDraft && key.startsWith('quotemax.working-draft.v1.')) {
      rejectWorkingDraft = false;
      throw new Error('locked device');
    }
    secure.delete(key);
  });
  boundary.observe({ ...user, sessionId: 'session_new' }); await settled(boundary);
  expect(boundary.getSnapshot().status).toBe('failed');
  await expect(draft().load()).rejects.toMatchObject({ code: 'revoked' });
  boundary.retry(); await settled(boundary);
  expect(boundary.getSnapshot().status).toBe('ready');
  expect(await draft().load()).toBeNull();
});
