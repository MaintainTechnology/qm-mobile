import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { MissingClerkTokenError, requireClerkToken } from '@/lib/auth-token';
import {
  FollowupOperationResultSchema, loadFollowupOperation, recoverFollowupOperation, runFollowupOperation,
  type FollowupOperationInput, type FollowupOperationReceipt, type FollowupOperationScope,
} from './followup-operation';
import { FOLLOWUPS_KEY, followupEventsKey } from './followups';

type Action = FollowupOperationScope['action'];
type View = { loading: boolean; busy: boolean; receipt: FollowupOperationReceipt | null; error: unknown };
const initial = (): View => ({ loading: true, busy: false, receipt: null, error: null });
const paths = { text: '/api/tenant/followups/text', call: '/api/tenant/followups/call', note: '/api/tenant/followups/events' };

export function useFollowupActions(tenantId: string, target: FollowupOperationScope['target']) {
  const { userId, sessionId, getToken } = useAuth();
  const cache = useQueryClient();
  const key = JSON.stringify([userId, sessionId, tenantId, target.kind, target.id]);
  const current = useRef({ key, active: true });
  current.current.key = key;
  const [view, setView] = useState({ key, text: initial(), call: initial(), note: initial() });
  const active = () => current.current.active && current.current.key === key;
  const assertActive = () => { if (!userId || !active()) throw new MissingClerkTokenError(); };
  const scope = (action: Action): FollowupOperationScope => {
    assertActive(); return { userId: userId!, tenantId, target, action };
  };
  const update = (action: Action, patch: Partial<View>) => {
    if (active()) setView(previous => ({ ...previous, key, [action]: { ...previous[action], ...patch } }));
  };
  const token = async () => {
    assertActive(); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = requireClerkToken(await Promise.race([getToken(), new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), 5000);
      })]));
      assertActive(); return value;
    } finally { clearTimeout(timer); }
  };
  const read = async (action: Action, requestId: string) => {
    assertActive();
    const field = target.kind === 'quote' ? 'quoteId' : 'conversationId';
    const result = await apiRequest(`${paths[action]}?${field}=${encodeURIComponent(target.id)}&requestId=${encodeURIComponent(requestId)}`,
      FollowupOperationResultSchema, { token: await token(), diagnosticPath: paths[action] });
    assertActive(); return result;
  };
  const invalidate = () => {
    if (!active()) return;
    void cache.invalidateQueries({ queryKey: FOLLOWUPS_KEY });
    if (target.kind === 'quote') void cache.invalidateQueries({ queryKey: followupEventsKey(target.id) });
  };
  const refresh = async (action: Action) => {
    const owned = scope(action);
    update(action, { loading: true, error: null });
    try {
      const receipt = await loadFollowupOperation(owned);
      update(action, { receipt });
      const recovered = receipt ? await recoverFollowupOperation(owned, id => read(action, id)) : null;
      update(action, { receipt: recovered });
      invalidate();
      return recovered;
    } catch (error) { update(action, { error }); }
    finally { update(action, { loading: false }); }
  };
  useEffect(() => {
    const identity = current.current;
    identity.active = true;
    setView({ key, text: initial(), call: initial(), note: initial() });
    if (userId) for (const action of ['text', 'call', ...(target.kind === 'quote' ? ['note'] : [])] as Action[])
      void refresh(action);
    return () => { identity.active = false; };
    // Functions capture this exact account/session/target. Old completions are discarded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const run = async (input: FollowupOperationInput, mode: 'start' | 'retry' = 'start') => {
    const owned = scope(input.action);
    update(input.action, { busy: true, error: null });
    try {
      const receipt = await runFollowupOperation(owned, input, mode, async body => {
        const result = await apiRequest(paths[input.action], FollowupOperationResultSchema, {
          token: await token(), method: 'POST', body, timeoutMs: 30000,
        });
        assertActive(); return result;
      });
      assertActive(); update(input.action, { receipt }); invalidate(); return receipt;
    } catch (error) {
      update(input.action, { error });
      try { update(input.action, { receipt: await loadFollowupOperation(owned) }); } catch { /* Keep the storage error visible. */ }
      throw error;
    } finally { update(input.action, { busy: false }); }
  };
  const result = view.key === key ? view : { key, text: initial(), call: initial(), note: initial() };
  return { ...result, run, refresh, busy: result.text.busy || result.call.busy || result.note.busy };
}
