import { createAccountIdentityBoundary, type AccountIdentity } from './account-identity-boundary';

const A: AccountIdentity = { userId: 'user_A', sessionId: 'session_A', tenantId: 'tenant_A' };
const B: AccountIdentity = { userId: 'user_B', sessionId: 'session_B', tenantId: 'tenant_B' };
const guest: AccountIdentity = { userId: null, sessionId: null, tenantId: null };
function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function setup() {
  const pending = deferred();
  const cleanup = jest.fn(() => pending.promise);
  const cache = jest.fn();
  const boundary = createAccountIdentityBoundary({ initialiseServerCache: cache, clearLocalState: cleanup });
  return { boundary, pending, cleanup, cache };
}
function establish(boundary: ReturnType<typeof createAccountIdentityBoundary>, identity = A) {
  boundary.observe(identity);
  boundary.observe(identity); // owned tenant read after initial cache reset
}

it('preserves same-account encrypted drafts on first hydration and initial tenant discovery', () => {
  const { boundary, cleanup, cache } = setup();
  establish(boundary);
  expect(cache).toHaveBeenCalledTimes(1);
  expect(cleanup).not.toHaveBeenCalled();
  expect(boundary.getSnapshot()).toEqual({ identity: A, status: 'ready' });
});
it('preserves guest acquisition continuation through the first sign-in', () => {
  const { boundary, cleanup } = setup();
  boundary.observe(guest); establish(boundary);
  expect(cleanup).not.toHaveBeenCalled();
  expect(boundary.getSnapshot()).toEqual({ identity: A, status: 'ready' });
});
it.each([
  ['account', B],
  ['session', { ...A, sessionId: 'session_new' }],
  ['tenant', { ...A, tenantId: 'tenant_new' }],
  ['external sign-out', guest],
] as const)('revokes old handles synchronously and gates a %s transition until cleanup resolves', async (_kind, next) => {
  const { boundary, cleanup, pending } = setup(); establish(boundary);
  boundary.observe(next);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(boundary.getSnapshot().status).toBe('cleaning');
  pending.resolve(); await flush();
  expect(boundary.getSnapshot().status).toBe('ready');
  expect(boundary.getSnapshot().identity?.userId).toBe(next.userId);
});
it('never attributes an old cached tenant to a new auth identity', async () => {
  const { boundary, pending } = setup(); establish(boundary);
  boundary.observe({ ...B, tenantId: A.tenantId });
  expect(boundary.getSnapshot().identity).toEqual({ ...B, tenantId: null });
  pending.resolve(); await flush(); boundary.observe(B);
  expect(boundary.getSnapshot()).toEqual({ identity: B, status: 'ready' });
});
it('does not repeat cleanup while a tenant query is being cleared or refetched', async () => {
  const { boundary, cleanup, pending } = setup(); establish(boundary);
  const changed = { ...A, tenantId: 'tenant_new' };
  boundary.observe(changed);
  boundary.observe({ ...A, tenantId: null });
  expect(cleanup).toHaveBeenCalledTimes(1);
  pending.resolve(); await flush(); boundary.observe(changed);
  expect(boundary.getSnapshot()).toEqual({ identity: changed, status: 'ready' });
  expect(cleanup).toHaveBeenCalledTimes(1);
});
it('keeps failed cleanup closed, does not retry on rerender, and supports an explicit retry', async () => {
  const { boundary, cleanup, pending } = setup(); establish(boundary); boundary.observe(guest);
  pending.reject(new Error('device locked')); await flush();
  expect(boundary.getSnapshot().status).toBe('failed');
  boundary.observe(guest); expect(cleanup).toHaveBeenCalledTimes(1);
  cleanup.mockResolvedValueOnce(); boundary.retry(); await flush();
  expect(cleanup).toHaveBeenCalledTimes(2);
  expect(boundary.getSnapshot()).toEqual({ identity: guest, status: 'ready' });
});
it('ignores a prior transition acknowledgement after another identity is selected', async () => {
  const { boundary, cleanup, pending } = setup(); establish(boundary);
  const latest = deferred(); cleanup.mockReturnValueOnce(pending.promise).mockReturnValueOnce(latest.promise);
  boundary.observe(B); boundary.observe({ userId: 'user_C', sessionId: 'session_C', tenantId: null });
  pending.resolve(); await flush(); expect(boundary.getSnapshot().status).toBe('cleaning');
  latest.resolve(); await flush();
  expect(boundary.getSnapshot()).toEqual({ identity: { userId: 'user_C', sessionId: 'session_C', tenantId: null }, status: 'ready' });
});
it('keeps a rapid sign-in gated while the preceding revoked session cleanup is unfinished', async () => {
  const { boundary, cleanup, pending } = setup(); establish(boundary);
  boundary.observe(guest); boundary.observe(B);
  expect(boundary.getSnapshot().status).toBe('cleaning'); expect(cleanup).toHaveBeenCalledTimes(2);
  pending.resolve(); await flush();
  expect(boundary.getSnapshot().identity?.userId).toBe(B.userId);
});
it('does not publish ready when cleanup throws synchronously', async () => {
  const { boundary, cleanup } = setup(); establish(boundary);
  cleanup.mockImplementationOnce(() => { throw new Error('unavailable'); });
  boundary.observe(B); await flush(); expect(boundary.getSnapshot().status).toBe('failed');
});
