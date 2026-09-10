/** Local identity transitions, separate from server-mutation recovery receipts. */
export type AccountIdentity = {
  userId: string | null;
  sessionId: string | null;
  tenantId: string | null;
};
export type IdentityBoundaryState = {
  identity: AccountIdentity | null;
  status: 'initial' | 'ready' | 'cleaning' | 'failed';
};
export const accountAuthKey = (identity: Pick<AccountIdentity, 'userId' | 'sessionId'>) =>
  JSON.stringify([identity.userId, identity.userId ? identity.sessionId : null]);
export const accountIdentityKey = (identity: AccountIdentity) =>
  JSON.stringify([identity.userId, identity.userId ? identity.sessionId : null, identity.tenantId]);

export function createAccountIdentityBoundary(deps: {
  initialiseServerCache: () => void;
  clearLocalState: () => Promise<void>;
}) {
  let state: IdentityBoundaryState = { identity: null, status: 'initial' };
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: IdentityBoundaryState) => {
    state = next;
    listeners.forEach(listener => listener());
  };
  function canonical(identity: AccountIdentity): AccountIdentity {
    if (!identity.userId) return { userId: null, sessionId: null, tenantId: null };
    // A cache entry still present during an auth change belongs to the old
    // identity. Establish the new account before observing its tenant result.
    if (!state.identity || accountAuthKey(state.identity) !== accountAuthKey(identity))
      return { ...identity, tenantId: null };
    // Clearing/refetching the query cache is unknown tenant identity, not a
    // switch back to the old tenant or an instruction to run cleanup again.
    return { ...identity, tenantId: identity.tenantId ?? state.identity.tenantId };
  }
  function clean(identity: AccountIdentity) {
    const attempt = ++generation;
    publish({ identity, status: 'cleaning' });
    let cleanup: Promise<void>;
    try {
      // clearAccountScopedState revokes encrypted working-copy handles before
      // its first await. Start it in this call, never after a queued microtask.
      cleanup = deps.clearLocalState();
    } catch { cleanup = Promise.reject(new Error('Account cleanup failed')); }
    void cleanup.then(
      () => { if (generation === attempt) publish({ identity, status: 'ready' }); },
      () => { if (generation === attempt) publish({ identity, status: 'failed' }); },
    );
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    canonical,
    observe(input: AccountIdentity) {
      const identity = canonical(input);
      if (state.identity && accountIdentityKey(identity) === accountIdentityKey(state.identity)) return;
      const previous = state;
      if (!previous.identity) {
        // First Clerk hydration must retain encrypted same-account edits.
        deps.initialiseServerCache();
        publish({ identity, status: 'ready' });
        return;
      }
      const authChanged = accountAuthKey(previous.identity) !== accountAuthKey(identity);
      const tenantChanged = previous.identity.tenantId !== null && identity.tenantId !== previous.identity.tenantId;
      if (previous.status !== 'ready' || (previous.identity.userId && (authChanged || tenantChanged))) {
        clean(identity);
      } else {
        // Guest -> first sign-in keeps the eligible acquisition continuation.
        // Initial tenant discovery also keeps the freshly restored draft.
        if (authChanged) deps.initialiseServerCache();
        publish({ identity, status: 'ready' });
      }
    },
    retry() {
      if (state.status === 'failed' && state.identity) clean(state.identity);
    },
  };
}
