import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@/lib/api';
import {
  createFinalQuote,
  loadFinalQuoteAttempt,
  recoverFinalQuote,
  type FinalQuoteRecord,
} from './final-quote-attempt';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
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
const P = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const C = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const scope = { userId: 'user_a', tenantId: 'tenant_a', parentId: P };
const revision = 'a'.repeat(64);
const storage = new Map<string, string>();
function record(id: string): FinalQuoteRecord {
  return {
    quote: { id, tenant_id: scope.tenantId, quote_kind: id === P ? 'initial' : 'final' },
    chain: {
      parent:
        id === P ? null : { id: P, quote_kind: 'initial', status: 'paid', total_inc_gst: null },
    },
    eligibility: {
      issue_final: {
        allowed: false,
        reason: 'existing_final_quote',
        existing_quote_id: id === P ? C : null,
      },
    },
  };
}
const read = jest.fn(async (id: string) => record(id));
const response = { ok: true as const, already: false, quote_id: C, parent_quote_id: P };
beforeEach(() => {
  storage.clear();
  jest.clearAllMocks();
  read.mockImplementation(async id => record(id));
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    storage.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => {
    storage.delete(key);
  });
});
it('stores recovery before POST and verifies the owned child before marking the draft available', async () => {
  const dispatch = jest.fn(async body => {
    expect(body).toEqual({ expected_revision: revision });
    expect(await loadFinalQuoteAttempt(scope)).toEqual({ version: 1, state: 'unknown' });
    return response;
  });
  expect(await createFinalQuote(scope, revision, dispatch, read)).toEqual({
    version: 1,
    state: 'available',
    quoteId: C,
  });
  expect(read).toHaveBeenCalledWith(C);
  expect([...storage.values()].join('')).not.toContain(revision);
  expect([...storage.values()].join('')).not.toContain('token');
});
it('recovers a lost response using parent and child GETs without another POST', async () => {
  const dispatch = jest.fn(async () => {
    throw new Error('lost response');
  });
  await expect(createFinalQuote(scope, revision, dispatch, read)).rejects.toThrow('lost response');
  read.mockClear();
  expect(await recoverFinalQuote(scope, read)).toMatchObject({ state: 'available', quoteId: C });
  expect(read.mock.calls).toEqual([[P], [C]]);
  await expect(createFinalQuote(scope, revision, dispatch, read)).rejects.toThrow(
    'previous final quote',
  );
  expect(dispatch).toHaveBeenCalledTimes(1);
});
it('does not infer no commit from a missing child or a failed read', async () => {
  await createFinalQuote(
    scope,
    revision,
    async () => {
      throw new Error('lost');
    },
    read,
  ).catch(() => undefined);
  read.mockImplementation(async id => ({
    ...record(id),
    eligibility: { issue_final: { allowed: true, reason: null, existing_quote_id: null } },
  }));
  await expect(recoverFinalQuote(scope, read)).rejects.toThrow('not confirmed');
  read.mockRejectedValueOnce(new Error('offline'));
  await expect(recoverFinalQuote(scope, read)).rejects.toThrow('offline');
  expect((await loadFinalQuoteAttempt(scope))?.state).toBe('unknown');
});
it.each(['parent', 'tenant', 'kind', 'self'])(
  'rejects a returned child with incorrect %s proof',
  async problem => {
    read.mockImplementation(async id => {
      const child = record(id);
      if (problem === 'parent') child.chain.parent!.id = C;
      if (problem === 'tenant') child.quote.tenant_id = 'other';
      if (problem === 'kind') child.quote.quote_kind = 'balance';
      if (problem === 'self') child.quote.id = P;
      return child;
    });
    await expect(createFinalQuote(scope, revision, async () => response, read)).rejects.toThrow(
      'ownership and parent',
    );
    expect((await loadFinalQuoteAttempt(scope))?.state).toBe('unknown');
  },
);
it('keeps corrupt or unavailable storage fenced before any creation', async () => {
  const dispatch = jest.fn(async () => response);
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('locked'));
  await expect(createFinalQuote(scope, revision, dispatch, read)).rejects.toThrow('locked');
  expect(dispatch).not.toHaveBeenCalled();
  jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('{broken');
  await expect(createFinalQuote(scope, revision, dispatch, read)).rejects.toThrow();
  expect(dispatch).not.toHaveBeenCalled();
});
it('allows fresh review after a known pre-create rejection but retains unconfirmed atomic outcomes', async () => {
  await createFinalQuote(
    scope,
    revision,
    async () => {
      throw new ApiError('changed', 409, '/issue-final', { error: 'quote_review_required' });
    },
    read,
  ).catch(() => undefined);
  expect(await loadFinalQuoteAttempt(scope)).toBeNull();
  await createFinalQuote(
    scope,
    revision,
    async () => {
      throw new ApiError('unknown', 409, '/issue-final', { error: 'final_prepare_unconfirmed' });
    },
    read,
  ).catch(() => undefined);
  expect((await loadFinalQuoteAttempt(scope))?.state).toBe('unknown');
});
it('isolates account, tenant and paid-parent recovery across signout', async () => {
  await createFinalQuote(
    scope,
    revision,
    async () => {
      throw new Error('lost');
    },
    read,
  ).catch(() => undefined);
  expect(await loadFinalQuoteAttempt({ ...scope, userId: 'other' })).toBeNull();
  expect(await loadFinalQuoteAttempt({ ...scope, tenantId: 'other' })).toBeNull();
  expect(await loadFinalQuoteAttempt({ ...scope, parentId: C })).toBeNull();
  expect((await loadFinalQuoteAttempt(scope))?.state).toBe('unknown');
});
it('blocks concurrent duplicate creation while the first response is outstanding', async () => {
  let finish!: () => void;
  const dispatch = jest.fn(
    () =>
      new Promise<typeof response>(resolve => {
        finish = () => resolve(response);
      }),
  );
  const first = createFinalQuote(scope, revision, dispatch, read);
  while (!finish) await new Promise(resolve => setTimeout(resolve, 1));
  await expect(createFinalQuote(scope, revision, dispatch, read)).rejects.toThrow('in progress');
  finish();
  await first;
  expect(dispatch).toHaveBeenCalledTimes(1);
});
