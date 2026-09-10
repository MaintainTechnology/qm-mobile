import { useLayoutEffect, useState, useSyncExternalStore } from 'react';

import {
  accountIdentityKey,
  createAccountIdentityBoundary,
  type AccountIdentity,
} from '@/lib/account-identity-boundary';

export function useAccountIdentityBoundary(
  identity: AccountIdentity & { isLoaded: boolean },
  dependencies: Parameters<typeof createAccountIdentityBoundary>[0],
) {
  const [boundary] = useState(() => createAccountIdentityBoundary(dependencies));
  const state = useSyncExternalStore(boundary.subscribe, boundary.getSnapshot, boundary.getSnapshot);
  const { isLoaded, userId, sessionId, tenantId } = identity;
  const effective = boundary.canonical(identity);
  const key = accountIdentityKey(effective);
  useLayoutEffect(() => {
    if (isLoaded) boundary.observe({ userId, sessionId, tenantId });
  }, [boundary, isLoaded, userId, sessionId, tenantId, key]);
  return {
    ready: identity.isLoaded && state.status === 'ready' && state.identity !== null && accountIdentityKey(state.identity) === key,
    failed: identity.isLoaded && state.status === 'failed',
    key,
    retry: boundary.retry,
  };
}
