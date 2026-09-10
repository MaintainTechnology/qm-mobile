import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { apiRequest, ApiError } from '@/lib/api';
import { useRun } from './api';
import type { PaintScope } from './pricing-contract';

const scope: PaintScope = { userId: 'user_a', tenantId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' };
const runId = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const snapshot = { runId, extractionId: null, revision: 'a'.repeat(64), job_name: null, site_address: null, items: [], corrected_items: null, released: false };
let mockUserId = scope.userId;
const mockToken = jest.fn(async (): Promise<string | null> => 'token_a');
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ userId: mockUserId, sessionId: `session_${mockUserId}`, getToken: mockToken }) }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));
const request = jest.mocked(apiRequest);
let cache: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>;
beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mockUserId = scope.userId; mockToken.mockReset().mockResolvedValue('token_a');
  request.mockReset().mockImplementation(async path => path.endsWith('?scope=1') ? { ok: true, userId: mockUserId, tenantId: scope.tenantId } :
    path.endsWith('/corrections') ? { ok: true, snapshot } : { ok: true, run: { id: runId, status: 'priced' }, uploads: [], extraction: null });
});
afterEach(() => cache.clear());
it('starts a real query after the owner lifecycle initializes and caches only its owned exact run', async () => {
  const { result } = await renderHook(() => useRun(runId, scope), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.run.id).toBe(runId);
  expect(result.current.data?.edit_snapshot?.revision).toBe(snapshot.revision);
  expect(request.mock.calls.map(([path]) => path)).toEqual(['/api/tenant/commercial-painting/save-quote?scope=1', `/api/tenant/commercial-painting/run/${runId}`,
    '/api/tenant/commercial-painting/save-quote?scope=1', `/api/tenant/commercial-painting/run/${runId}/corrections`]);
});
it('rejects a different returned run without caching it as the requested job', async () => {
  request.mockImplementation(async path => path.endsWith('?scope=1') ? { ok: true, ...scope } : { ok: true, run: { id: scope.tenantId, status: 'priced' }, uploads: [] });
  const { result } = await renderHook(() => useRun(runId, scope), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(result.current.data).toBeUndefined();
});
it('rejects a foreign tenant at the scope read without asking for a run', async () => {
  request.mockResolvedValue({ ok: true, ...scope, tenantId: runId });
  const { result } = await renderHook(() => useRun(runId, scope), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(request).toHaveBeenCalledTimes(1);
});
it('does not cache late account A data when the account changes during token acquisition', async () => {
  let release!: (value: string) => void; mockToken.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const { result, rerender } = await renderHook(({ owner }: { owner: PaintScope }) => useRun(runId, owner), { initialProps: { owner: scope }, wrapper });
  await waitFor(() => expect(mockToken).toHaveBeenCalledTimes(1));
  mockUserId = 'user_b'; await rerender({ owner: { ...scope, userId: mockUserId } });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => { release('late_a'); });
  expect(request.mock.calls.some(([, , options]) => options?.token === 'late_a')).toBe(false);
  expect(cache.getQueryData(['tenant', 'cpaint', 'run', runId, scope.userId, scope.tenantId])).toBeUndefined();
});
it('clears the earlier BOM and authority when an interleaved correction changes the second GET source', async () => {
  const extractionId = 'cccccccc-1111-4111-8111-cccccccccccc';
  const item = { surface: 'walls', quantity: 10, excluded: false };
  request.mockImplementation(async path => path.endsWith('?scope=1') ? { ok: true, ...scope } : path.endsWith('/corrections') ? {
    ok: true, snapshot: { ...snapshot, extractionId, items: [item], corrected_items: [{ ...item, quantity: 0 }] },
  } : { ok: true, run: { id: runId, status: 'priced' }, uploads: [], extraction: { id: extractionId, items: [item], corrected_items: null, priced_bom: { stale: true }, priced_at: 'earlier', pricing_review: { stale: true } } });
  const { result } = await renderHook(() => useRun(runId, scope), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.edit_review_state).toBe('changed'); expect(result.current.data?.edit_snapshot).toBeNull();
  expect(result.current.data?.extraction).toMatchObject({ items: [item], corrected_items: null, priced_bom: null, priced_at: null, pricing_review: null });
});
it('keeps the owned takeoff readable with no price authority when the revision endpoint is unavailable', async () => {
  request.mockImplementation(async path => {
    if (path.endsWith('?scope=1')) return { ok: true, ...scope };
    if (path.endsWith('/corrections')) throw new ApiError('Unavailable', 503, path);
    return { ok: true, run: { id: runId, status: 'ready' }, uploads: [], extraction: null };
  });
  const { result } = await renderHook(() => useRun(runId, scope), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true)); expect(result.current.data?.edit_review_state).toBe('unavailable');
  expect(result.current.data?.edit_snapshot).toBeNull();
});
it('does not downgrade a scope failure on the second owned read to a successful preview', async () => {
  let scopes = 0;
  request.mockImplementation(async path => path.endsWith('?scope=1') ? { ok: true, ...scope, userId: ++scopes === 1 ? scope.userId : 'user_b' } :
    { ok: true, run: { id: runId, status: 'ready' }, uploads: [], extraction: null });
  const { result } = await renderHook(() => useRun(runId, scope), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(result.current.data).toBeUndefined();
  expect(request.mock.calls.some(([path]) => path.endsWith('/corrections'))).toBe(false);
});
