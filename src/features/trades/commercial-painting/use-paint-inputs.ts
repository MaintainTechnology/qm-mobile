import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import type { PaintScope } from './pricing-contract';

export const PaintInputsSchema = z.object({
  customerName: z.string().max(120), customerPhone: z.string().max(40), labour: z.string().max(16),
  jobName: z.string().max(200).default(''), siteAddress: z.string().max(300).default(''),
}).strict();
export type PaintInputs = z.infer<typeof PaintInputsSchema>;
const empty: PaintInputs = { customerName: '', customerPhone: '', labour: '', jobName: '', siteAddress: '' };
/** Contact fields are working copies, never opaque operation receipts. */
export function usePaintInputs(scope: PaintScope, runId: string | null) {
  const identity = JSON.stringify([scope.userId, scope.tenantId, runId]);
  const store = useMemo(() => createWorkingDraftStore({ ...scope, purpose: 'paint-input-v1', recordId: runId ?? 'new-paint' }, PaintInputsSchema),
    [scope.userId, scope.tenantId, runId]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = useRef({ identity, active: true });
  current.current.identity = identity;
  const [state, setState] = useState({ identity, loaded: false, value: empty, storedKey: '', error: null as unknown });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const owner = current.current; owner.active = true;
    let cancelled = false;
    setState({ identity, loaded: false, value: empty, storedKey: '', error: null });
    void store.load().then(saved => {
      if (cancelled || !owner.active || owner.identity !== identity) return;
      const value = saved?.value ?? empty;
      setState({ identity, loaded: true, value, storedKey: JSON.stringify(value), error: null });
    }).catch(error => { if (!cancelled && owner.active && owner.identity === identity) setState(previous => ({ ...previous, error })); });
    return () => { cancelled = true; owner.active = false; };
  }, [identity, store, retry]);
  const loaded = state.identity === identity && state.loaded;
  const value = loaded ? state.value : empty;
  const valueKey = JSON.stringify(value);
  const stored = loaded && state.storedKey === valueKey && !state.error;
  const [writeRetry, setWriteRetry] = useState(0);
  useEffect(() => {
    if (!loaded || state.storedKey === valueKey) return;
    let cancelled = false;
    const operation = valueKey === JSON.stringify(empty) ? store.remove() : store.save(value);
    void operation.then(() => {
      if (!cancelled && current.current.active && current.current.identity === identity)
        setState(previous => ({ ...previous, storedKey: valueKey, error: null }));
    }).catch(error => { if (!cancelled && current.current.active && current.current.identity === identity) setState(previous => ({ ...previous, error })); });
    return () => { cancelled = true; };
  }, [identity, loaded, value, valueKey, state.storedKey, store, writeRetry]);
  const update = (patch: Partial<PaintInputs>) => {
    if (!loaded || !current.current.active || current.current.identity !== identity) return;
    setState(previous => ({ ...previous, value: PaintInputsSchema.parse({ ...previous.value, ...patch }) }));
  };
  const retryStorage = () => { if (loaded) setWriteRetry(n => n + 1); else setRetry(n => n + 1); };
  return { value, loaded, stored, error: state.identity === identity ? state.error : null, update, retry: retryStorage };
}
