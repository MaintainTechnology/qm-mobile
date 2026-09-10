import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import { apiRequest, ApiError } from '@/lib/api';
import { clearAllWorkingDrafts, createWorkingDraftStore } from '@/lib/working-draft-storage';
import { usePaintSave } from './use-paint-save';
import { usePaintTransport } from './use-paint-transport';
import { PaintInputsSchema, usePaintInputs } from './use-paint-inputs';
import { createPaintRunResume } from './run-resume';
import { loadPaintReceipt, preparePaintSaveRetryInput, savePaintDraft } from './save-receipt';
import type { PaintPass, PaintScope } from './pricing-contract';

const scope = { userId: 'user_a', tenantId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' };
const scopeB = { ...scope, userId: 'user_b' };
let mockAuth = { userId: scope.userId, sessionId: 'session_a' };
const mockToken = jest.fn(async (): Promise<string | null> => 'token_a');
const mockInvalidate = jest.fn();
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ ...mockAuth, getToken: mockToken }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_: string, text: string) => crypto.createHash('sha256').update(text).digest('hex'), randomUUID: () => crypto.randomUUID() };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const pass: PaintPass = { paintRunId: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', extractionId: 'cccccccc-1111-4111-8111-cccccccccccc', pricingProof: 'a'.repeat(64), pricedAt: '2026-09-09T00:00:00.123456Z' };
const input = { ...pass, customerName: 'Private Contact', customerPhone: '0412345678' };
const saved = () => ({ ...pass, ok: true as const, quoteId: 'dddddddd-1111-4111-8111-dddddddddddd', shareToken: 'share-token-private', quoteViewUrl: '/q/share-token-private', pdfUrl: '/api/q/share-token-private/pdf', delivery: { attempted: false as const } });
const request = jest.mocked(apiRequest);
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const lost = () => savePaintDraft(scope, input, 'start', async () => { throw new Error('Lost response'); }).catch(() => undefined);
beforeEach(async () => {
  jest.clearAllMocks(); mockAuth = { userId: scope.userId, sessionId: 'session_a' }; mockToken.mockReset().mockResolvedValue('token_a');
  storage.clear();
  jest.mocked(SecureStore.getItemAsync).mockReset().mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockReset().mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockReset().mockImplementation(async key => { storage.delete(key); });
  await clearAllWorkingDrafts();
  request.mockReset().mockImplementation(async path => path.endsWith('?scope=1') ? { ok: true, userId: mockAuth.userId, tenantId: scope.tenantId } : { ...saved(), status: 'saved' });
});

it('resumes an unknown Save through GET only, then requires acknowledgement of its verified quote', async () => {
  await lost(); const { result } = await renderHook(() => usePaintSave(scope));
  await waitFor(() => expect(result.current.saved?.quoteId).toBe(saved().quoteId));
  expect(request.mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(true);
  expect(request.mock.calls.find(([path]) => path.includes('pricedAt='))?.[0]).toContain(encodeURIComponent(pass.pricedAt));
  expect((await loadPaintReceipt(scope))?.quoteId).toBe(saved().quoteId);
  await act(async () => { await result.current.acknowledge(saved().quoteId); });
  expect(result.current.receipt).toBeNull(); expect(await loadPaintReceipt(scope)).toBeNull();
});
it.each(['not_found', 'foreign'])('keeps an unresolved %s receipt and blocks new Save', async kind => {
  await lost(); request.mockImplementation(async path => path.endsWith('?scope=1') ? { ok: true, ...scope } : kind === 'not_found' ? { ...pass, ok: true, status: 'not_found' } : { ...saved(), status: 'saved', extractionId: pass.paintRunId });
  const { result } = await renderHook(() => usePaintSave(scope));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(result.current.receipt?.pass).toEqual(pass); expect(result.current.saved).toBeNull();
  await act(async () => { await expect(result.current.save(input)).rejects.toThrow('previous quote save'); });
  expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
});
it('does not POST before the initial receipt read is complete', async () => {
  const read = deferred<string | null>(); jest.mocked(SecureStore.getItemAsync).mockImplementationOnce(() => read.promise);
  const { result } = await renderHook(() => usePaintSave(scope));
  await act(async () => { await expect(result.current.save(input)).rejects.toThrow('previous quote recovery'); });
  expect(request).not.toHaveBeenCalled();
  await act(async () => { read.resolve(null); });
  await waitFor(() => expect(result.current.loaded).toBe(true));
});
it('fences delayed token completion across A to B to A in the same mounted hook', async () => {
  const { result, rerender } = await renderHook(({ owner }: { owner: PaintScope }) => usePaintSave(owner), { initialProps: { owner: scope } });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  const token = deferred<string | null>(); mockToken.mockImplementationOnce(() => token.promise);
  let operation!: Promise<unknown>;
  await act(async () => { operation = result.current.save(input).catch(error => error); });
  mockAuth = { userId: scopeB.userId, sessionId: 'session_b' }; await rerender({ owner: scopeB });
  await waitFor(() => expect(result.current.loaded).toBe(true)); expect(result.current.receipt).toBeNull();
  mockAuth = { userId: scope.userId, sessionId: 'session_a2' }; await rerender({ owner: scope });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(async () => { token.resolve('late_a'); await operation; });
  expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
  expect(await loadPaintReceipt(scope)).toBeNull();
});
it('retains a receipt after a late POST success arrives following unmount', async () => {
  const response = deferred<ReturnType<typeof saved>>();
  request.mockImplementation(async (path, _schema, options) => options?.method === 'POST' ? response.promise : { ok: true, ...scope });
  const { result, unmount } = await renderHook(() => usePaintSave(scope));
  await waitFor(() => expect(result.current.loaded).toBe(true)); let operation!: Promise<unknown>;
  await act(async () => { operation = result.current.save(input).catch(error => error); });
  await waitFor(() => expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(true));
  expect((await loadPaintReceipt(scope))?.quoteId).toBeNull(); await unmount();
  await act(async () => { response.resolve(saved()); await operation; });
  expect((await loadPaintReceipt(scope))?.quoteId).toBeNull(); expect(mockInvalidate).not.toHaveBeenCalled();
});
it('requires the exact retained customer inputs for an explicit retry', async () => {
  await lost(); request.mockImplementation(async (path, _schema, options) => path.endsWith('?scope=1') ? { ok: true, ...scope } : options?.method === 'POST' ? saved() : { ...pass, ok: true, status: 'not_found' });
  const { result } = await renderHook(() => usePaintSave(scope)); await waitFor(() => expect(result.current.busy).toBe(false));
  await act(async () => { await expect(result.current.save({ ...input, customerName: 'Different' }, 'retry')).rejects.toThrow('Restore the original'); });
  expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
  await act(async () => { await result.current.save(input, 'retry'); });
  expect(request.mock.calls.find(([, , options]) => options?.method === 'POST')?.[2]?.body).toEqual(input);
});
it('expires the seven-day contact copy without expiring unknown Save, then accepts re-entry for that same pass', async () => {
  const value = { customerName: input.customerName, customerPhone: input.customerPhone, labour: '', jobName: '', siteAddress: '' };
  await createWorkingDraftStore({ ...scope, purpose: 'paint-input-v1', recordId: pass.paintRunId }, PaintInputsSchema).save(value);
  await lost(); const later = Date.now() + 8 * 24 * 60 * 60 * 1000;
  const clock = jest.spyOn(Date, 'now').mockReturnValue(later);
  try {
    request.mockImplementation(async (path, _schema, options) => path.endsWith('?scope=1') ? { ok: true, ...scope } : options?.method === 'POST' ? saved() : { ...pass, ok: true, status: 'not_found' });
    const { result } = await renderHook(() => ({ inputs: usePaintInputs(scope, pass.paintRunId), saving: usePaintSave(scope) }));
    await waitFor(() => expect(result.current.inputs.stored && !result.current.saving.busy).toBe(true));
    expect(result.current.inputs.value.customerName).toBe(''); expect(result.current.saving.receipt?.pass).toEqual(pass);
    await expect(preparePaintSaveRetryInput(result.current.saving.receipt!, result.current.inputs.value)).rejects.toThrow('Restore the original');
    expect(request.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(false);
    await act(async () => { result.current.inputs.update(value); });
    await waitFor(() => expect(result.current.inputs.stored).toBe(true));
    const restored = await preparePaintSaveRetryInput(result.current.saving.receipt!, result.current.inputs.value);
    await act(async () => { await result.current.saving.save(restored, 'retry'); });
    expect(request.mock.calls.find(([, , options]) => options?.method === 'POST')?.[2]?.body).toEqual(input);
  } finally { clock.mockRestore(); }
});
it('rejects foreign current ownership before mutation and preserves old receipt', async () => {
  const { result } = await renderHook(() => usePaintSave(scope)); await waitFor(() => expect(result.current.loaded).toBe(true));
  request.mockResolvedValue({ ok: true, ...scopeB });
  await act(async () => { await expect(result.current.save(input)).rejects.toThrow('account changed'); });
  expect(request).toHaveBeenCalledTimes(1); expect(await loadPaintReceipt(scope)).toBeNull();
});
it.each([401, 422])('retains auth uncertainty and releases only initial validation failure (%s)', async status => {
  const { result } = await renderHook(() => usePaintSave(scope)); await waitFor(() => expect(result.current.loaded).toBe(true));
  request.mockImplementation(async (_path, _schema, options) => { if (options?.method === 'POST') throw new ApiError('Rejected', status, '/save', { error: status === 401 ? 'unauthorised' : 'invalid_pricing' }); return { ok: true, ...scope }; });
  await act(async () => { await expect(result.current.save(input)).rejects.toThrow(); });
  expect(!!(await loadPaintReceipt(scope))).toBe(status === 401);
});
it('scoped transport never borrows a token after account replacement', async () => {
  const token = deferred<string | null>(); mockToken.mockImplementationOnce(() => token.promise);
  const { result, rerender } = await renderHook(({ owner }: { owner: PaintScope }) => usePaintTransport(owner), { initialProps: { owner: scope } });
  const operation = result.current('/price', z.object({ ok: z.literal(true) }), { paintRunId: pass.paintRunId }).catch(error => error);
  mockAuth = { userId: scopeB.userId, sessionId: 'session_b' }; await rerender({ owner: scopeB });
  mockAuth = { userId: scope.userId, sessionId: 'session_a' }; await rerender({ owner: scope });
  await act(async () => { token.resolve('late'); await operation; }); expect(request).not.toHaveBeenCalled();
});
it('scoped transport checks owner and forwards the exact method/body without retries', async () => {
  const { result } = await renderHook(() => usePaintTransport(scope));
  await result.current('/price', z.unknown(), { labourRatePerHr: 95.25 }, { method: 'POST' });
  expect(request.mock.calls[0]?.[0]).toContain('?scope=1'); expect(request.mock.calls[1]?.[2]).toMatchObject({ token: 'token_a', method: 'POST', body: { labourRatePerHr: 95.25 } });
});
it('encrypted run resume is account/tenant scoped and old handles are revoked on cleanup', async () => {
  const store = createPaintRunResume(scope); await store.save(pass.paintRunId);
  expect(await createPaintRunResume(scope).load()).toBe(pass.paintRunId);
  expect(await createPaintRunResume(scopeB).load()).toBeNull();
  expect(await createPaintRunResume({ ...scope, tenantId: pass.extractionId }).load()).toBeNull();
  await clearAllWorkingDrafts(); await expect(store.save(pass.paintRunId)).rejects.toThrow();
  expect(await createPaintRunResume(scope).load()).toBeNull();
});
it('restores encrypted inputs after an initial read failure, with dirty text intact', async () => {
  const value = { customerName: 'Private Contact', customerPhone: '0412345678', labour: '1.', jobName: 'Job', siteAddress: 'Address' };
  await createWorkingDraftStore({ ...scope, purpose: 'paint-input-v1', recordId: pass.paintRunId }, PaintInputsSchema).save(value);
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('Keychain unavailable'));
  const { result } = await renderHook(() => usePaintInputs(scope, pass.paintRunId));
  await waitFor(() => expect(result.current.error).toBeTruthy()); expect(result.current.loaded).toBe(false);
  await act(async () => { result.current.retry(); }); await waitFor(() => expect(result.current.stored).toBe(true));
  expect(result.current.value).toEqual(value);
});
it('keeps the last edit on secure write failure and retries without replacing it from storage', async () => {
  const { result } = await renderHook(() => usePaintInputs(scope, pass.paintRunId)); await waitFor(() => expect(result.current.stored).toBe(true));
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('Full'));
  await act(async () => { result.current.update({ customerName: 'Last edit' }); });
  await waitFor(() => expect(result.current.error).toBeTruthy()); expect(result.current.stored).toBe(false);
  await act(async () => { result.current.retry(); }); await waitFor(() => expect(result.current.stored).toBe(true));
  expect(result.current.value.customerName).toBe('Last edit');
});
