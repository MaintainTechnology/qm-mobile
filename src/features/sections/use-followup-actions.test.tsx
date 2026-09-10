import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '@/lib/api';
import { useFollowupActions } from './use-followup-actions';
import { loadFollowupOperation, type FollowupOperationResult } from './followup-operation';

let mockUser = 'user_a';
const mockToken = jest.fn();
const mockInvalidate = jest.fn();
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ userId: mockUser, sessionId: `session_${mockUser}`, getToken: mockToken }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));
jest.mock('@/lib/api', () => ({ apiRequest: jest.fn() }));
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_algorithm: string, text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true), getItemAsync: jest.fn(), setItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const target = { kind: 'quote' as const, id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' };
const input = { action: 'text' as const, text: 'Keep this draft', expectedRecipient: '+61412345678' };
const scope = { userId: 'user_a', tenantId: 'tenant_a', target, action: 'text' as const };
const result = (id: string): FollowupOperationResult => ({ ok: true, requestId: id, action: 'text', target, status: 'accepted', accepted: true,
  history: 'complete', eventId: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', outboxId: 'cccccccc-3333-4333-8333-cccccccccccc', providerSid: 'SM' + '1'.repeat(32), message: 'Accepted' });
beforeEach(() => {
  jest.clearAllMocks(); storage.clear(); mockUser = 'user_a'; mockToken.mockReset().mockResolvedValue('token_a');
  jest.mocked(apiRequest).mockReset();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
});
async function ready(hook: Awaited<ReturnType<typeof renderHook<ReturnType<typeof useFollowupActions>, unknown>>>) {
  await waitFor(() => expect(hook.result.current.text.loading).toBe(false));
}

it('reopens a lost request using only the authenticated status GET and does not resend', async () => {
  const first = await renderHook(() => useFollowupActions(scope.tenantId, target));
  await ready(first);
  jest.mocked(apiRequest).mockRejectedValueOnce(new TypeError('Response lost'));
  await act(async () => { await expect(first.result.current.run(input)).rejects.toThrow('Response lost'); });
  const receipt = (await loadFollowupOperation(scope))!;
  await first.unmount();
  jest.mocked(apiRequest).mockClear().mockResolvedValueOnce(result(receipt.requestId));
  const reopened = await renderHook(() => useFollowupActions(scope.tenantId, target));
  await ready(reopened);
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith(`/api/tenant/followups/text?quoteId=${target.id}&requestId=${receipt.requestId}`, expect.anything(),
    expect.objectContaining({ token: 'token_a', diagnosticPath: '/api/tenant/followups/text' }));
  expect(reopened.result.current.text.receipt?.accepted).toBe(true);
});

it('does not dispatch with a token returned after an account switch', async () => {
  const hook = await renderHook(() => useFollowupActions(scope.tenantId, target));
  await ready(hook);
  let finish!: (value: string) => void;
  mockToken.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
  let pending!: Promise<unknown>;
  await act(async () => { pending = hook.result.current.run(input).catch(error => error); });
  await waitFor(() => expect(mockToken).toHaveBeenCalledTimes(1));
  mockUser = 'user_b';
  await hook.rerender(undefined);
  await act(async () => { finish('old_a_token'); await pending; });
  expect(apiRequest).not.toHaveBeenCalled();
  expect(hook.result.current.text.receipt).toBeNull();
  expect((await loadFollowupOperation(scope))?.status).toBe('unknown');
});

it('ignores a late accepted response after the original screen unmounts and preserves recovery', async () => {
  const hook = await renderHook(() => useFollowupActions(scope.tenantId, target));
  await ready(hook);
  let finish!: (value: FollowupOperationResult) => void;
  jest.mocked(apiRequest).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<unknown>;
  await act(async () => { pending = hook.result.current.run(input).catch(error => error); });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  const receipt = (await loadFollowupOperation(scope))!;
  await hook.unmount();
  await act(async () => { finish(result(receipt.requestId)); await pending; });
  expect((await loadFollowupOperation(scope))?.status).toBe('unknown');
});

it('never runs note recovery for an unquoted lead and routes its text to the exact conversation', async () => {
  const lead = { ...target, kind: 'conversation' as const };
  const hook = await renderHook(() => useFollowupActions(scope.tenantId, lead));
  await ready(hook);
  jest.mocked(apiRequest).mockImplementationOnce(async (_path, _schema, options) => {
    const body = options?.body as { requestId: string; conversationId: string; quoteId?: string };
    expect(body.conversationId).toBe(lead.id); expect(body.quoteId).toBeUndefined();
    return { ...result(body.requestId), target: lead, eventId: null };
  });
  await act(async () => { await hook.result.current.run(input); });
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith('/api/tenant/followups/text', expect.anything(), expect.objectContaining({ method: 'POST', token: 'token_a' }));
});
