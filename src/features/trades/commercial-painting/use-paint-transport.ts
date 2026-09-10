import { useAuth } from '@clerk/expo';
import { useEffect, useRef } from 'react';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { MissingClerkTokenError, requireClerkToken } from '@/lib/auth-token';
import { PaintScopeSchema, type PaintScope } from './pricing-contract';

const ScopeResultSchema = PaintScopeSchema.extend({ ok: z.literal(true) });
export class PaintScopeChangedError extends Error {
  constructor() { super('Your painting account changed. Reopen this screen.'); }
}

/** A request started by account A must never borrow account B's freshly minted
 * token. Each mutation is fenced before/after token, owner lookup and response. */
export function usePaintTransport(scope: PaintScope) {
  const { userId, sessionId, getToken } = useAuth();
  const identity = JSON.stringify([userId, sessionId, scope.userId, scope.tenantId]);
  const current = useRef({ identity, epoch: 0, active: false });
  current.current.identity = identity;
  useEffect(() => {
    const owner = current.current;
    owner.active = true; owner.epoch += 1;
    return () => { owner.active = false; owner.epoch += 1; };
  }, [identity]);
  return async <T>(path: string, schema: z.ZodType<T>, body: unknown, options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; timeoutMs?: number; signal?: AbortSignal } = {}) => {
    const epoch = current.current.epoch;
    const check = () => {
      if (options.signal?.aborted || !current.current.active || current.current.identity !== identity || current.current.epoch !== epoch || userId !== scope.userId) throw new MissingClerkTokenError();
    };
    check(); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const token = requireClerkToken(await Promise.race([getToken(), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); })]));
      check();
      const owner = await apiRequest('/api/tenant/commercial-painting/save-quote?scope=1', ScopeResultSchema, { token, diagnosticPath: '/api/tenant/commercial-painting/save-quote' });
      check();
      if (owner.userId !== scope.userId || owner.tenantId !== scope.tenantId) throw new PaintScopeChangedError();
      const result = await apiRequest(path, schema, { token, body, method: options.method ?? 'POST', timeoutMs: options.timeoutMs, signal: options.signal });
      check(); return result;
    } finally { clearTimeout(timer); }
  };
}
