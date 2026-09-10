import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { MissingClerkTokenError, requireClerkToken } from '@/lib/auth-token';
import { TENANT_ME_KEY } from '@/lib/tenant';
import { PaintRecoverySchema, PaintSavedSchema, PaintScopeSchema, type PaintPass, type PaintSaved, type PaintScope } from './pricing-contract';
import { acknowledgePaintDraft, loadPaintReceipt, recoverPaintDraft, savePaintDraft, type PaintReceipt, type PaintSaveInput } from './save-receipt';

const PATH = '/api/tenant/commercial-painting/save-quote';
const ScopeResultSchema = PaintScopeSchema.extend({ ok: z.literal(true) });
type State = { identity: string; loaded: boolean; busy: boolean; receipt: PaintReceipt | null; saved: PaintSaved | null; error: unknown };
const empty = (identity: string): State => ({ identity, loaded: false, busy: false, receipt: null, saved: null, error: null });
type Operation = { identity: string; epoch: number };

export function usePaintSave(scope: PaintScope) {
  const { userId, sessionId, getToken } = useAuth();
  const cache = useQueryClient();
  const identity = JSON.stringify([userId, sessionId, scope.userId, scope.tenantId]);
  const current = useRef({ identity, epoch: 0, active: false });
  current.current.identity = identity;
  const running = useRef<Operation | null>(null);
  const [view, setView] = useState<State>(() => empty(identity));
  function isActive(context: Operation) {
    return current.current.active && current.current.identity === context.identity && current.current.epoch === context.epoch && userId === scope.userId;
  }
  function assertActive(context: Operation) { if (!isActive(context)) throw new MissingClerkTokenError(); }
  function update(context: Operation, patch: Partial<State>) {
    if (isActive(context)) setView(previous => ({ ...(previous.identity === identity ? previous : empty(identity)), ...patch, identity }));
  }
  async function token(context: Operation) {
    assertActive(context); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = requireClerkToken(await Promise.race([getToken(), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); })]));
      assertActive(context);
      const owner = await apiRequest(`${PATH}?scope=1`, ScopeResultSchema, { token: value, diagnosticPath: PATH });
      assertActive(context);
      if (owner.userId !== scope.userId || owner.tenantId !== scope.tenantId) throw new Error('Your painting account changed. Reopen this screen.');
      return value;
    } finally { clearTimeout(timer); }
  }
  async function read(pass: PaintPass, context: Operation) {
    const query = Object.entries(pass).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
    const result = await apiRequest(`${PATH}?${query}`, PaintRecoverySchema, { token: await token(context), diagnosticPath: PATH });
    assertActive(context); return result;
  }
  function begin(requireLoaded = false): Operation {
    const context = { identity, epoch: current.current.epoch };
    assertActive(context);
    if ((requireLoaded && (view.identity !== identity || !view.loaded)) || (running.current && isActive(running.current)))
      throw new Error('Wait for previous quote recovery before another action.');
    running.current = context; update(context, { busy: true, error: null }); return context;
  }
  function finish(context: Operation) {
    if (running.current === context) running.current = null;
    update(context, { busy: false });
  }
  async function refresh() {
    let context: Operation;
    try { context = begin(); } catch { return; }
    try {
      const receipt = await loadPaintReceipt(scope);
      assertActive(context); update(context, { receipt, loaded: true, saved: null });
      const saved = receipt ? await recoverPaintDraft(scope, pass => read(pass, context)) : null;
      assertActive(context);
      const retained = await loadPaintReceipt(scope); assertActive(context);
      update(context, { saved, receipt: retained }); return saved;
    } catch (error) { update(context, { error }); }
    finally { finish(context); }
  }
  useEffect(() => {
    const owner = current.current;
    owner.active = true; owner.epoch += 1;
    void refresh();
    return () => { owner.active = false; owner.epoch += 1; };
    // Operation epochs fence this exact Clerk session and StrictMode replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);
  async function save(input: PaintSaveInput, mode: 'start' | 'retry' = 'start') {
    const context = begin(true);
    try {
      const bearer = await token(context); assertActive(context);
      const saved = await savePaintDraft(scope, input, mode, async body => {
        assertActive(context);
        const result = await apiRequest(PATH, PaintSavedSchema, { token: bearer, method: 'POST', body, timeoutMs: 90000 });
        assertActive(context); return result;
      });
      assertActive(context); update(context, { saved });
      void cache.invalidateQueries({ queryKey: TENANT_ME_KEY });
      void cache.invalidateQueries({ queryKey: ['tenant', 'cpaint'] });
      return saved;
    } catch (error) { update(context, { error }); throw error; }
    finally {
      if (isActive(context)) {
        try { const receipt = await loadPaintReceipt(scope); update(context, { receipt }); } catch (error) { update(context, { error }); }
      }
      finish(context);
    }
  }
  async function acknowledge(quoteId: string) {
    const context = begin(true);
    try {
      await token(context); assertActive(context);
      await acknowledgePaintDraft(scope, quoteId); assertActive(context); update(context, { receipt: null, saved: null });
    } catch (error) { update(context, { error }); throw error; }
    finally { finish(context); }
  }
  return { ...(view.identity === identity ? view : empty(identity)), save, refresh, acknowledge };
}
