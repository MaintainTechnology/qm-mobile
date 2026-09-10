import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiRequest } from '@/lib/api';
import { requireClerkToken } from '@/lib/auth-token';
import { pickImageForUpload } from '@/lib/media';
import { MediaResponseSchema, readMediaResponse, type BusinessMediaKind, type MediaResponse, type MediaScope } from './business-media-contract';
import { MediaInputError, readBusinessMediaFile, type BusinessMediaSelection } from './business-media-file';
import { BUSINESS_MEDIA_POLICY } from './business-media-policy';
import { acknowledgeMediaWrite, cancelMediaWrite, loadMediaReceipt, recoverMediaWrite, writeBusinessMedia, type LocalMediaReceipt } from './business-media-write';

const ENDPOINT = '/api/tenant/business-media';
type Selection = { kind: BusinessMediaKind; image: BusinessMediaSelection; expectedRevision: string };
type Operation = { active: () => boolean; request: (method: 'GET' | 'POST' | 'DELETE', body?: unknown, requestId?: string) => Promise<MediaResponse> };

export function useBusinessMedia(rawTenantId: string) {
  // Validation occurs inside the recoverable operation boundary, not render.
  const tenantId = rawTenantId.toLowerCase();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const scope: MediaScope = { tenantId, userId: auth.userId ?? '' };
  const key = JSON.stringify([tenantId, auth.userId ?? null, auth.sessionId ?? null]);
  const owner = useRef({ key, active: false, epoch: 0, busy: false, controller: null as AbortController | null });
  owner.current.key = key;
  const [snapshot, setSnapshot] = useState<MediaResponse | null>(null);
  const snapshotRef = useRef<MediaResponse | null>(null);
  const [receipt, setReceipt] = useState<LocalMediaReceipt | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  const [stateKey, setStateKey] = useState(key);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState('');

  async function run(action: (operation: Operation) => Promise<void>) {
    const current = owner.current;
    if (!current.active || current.key !== key || current.busy || !scope.userId) return;
    const epoch = ++current.epoch;
    const active = () => current.active && current.key === key && current.epoch === epoch;
    const controller = new AbortController();
    current.controller = controller; current.busy = true;
    setBusy(true); setError(null); setNote('');
    const request: Operation['request'] = async (method, body, requestId) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        if (!active() || controller.signal.aborted) throw new Error('This image action was interrupted.');
        const token = requireClerkToken(await Promise.race([auth.getToken(), new Promise<null>(resolve => {
          timer = setTimeout(() => resolve(null), 5000);
        })]));
        clearTimeout(timer);
        if (!active() || controller.signal.aborted) throw new Error('This image action was interrupted.');
        const response = await apiRequest(requestId ? `${ENDPOINT}?requestId=${encodeURIComponent(requestId)}` : ENDPOINT,
          MediaResponseSchema, { method, body, token, signal: controller.signal, timeoutMs: method === 'GET' ? 15000 : 45000, diagnosticPath: ENDPOINT });
        if (!active()) throw new Error('This image action belongs to an ended session.');
        return response;
      } finally { clearTimeout(timer); }
    };
    try { await action({ active, request }); }
    catch (failure) {
      if (!active()) return;
      setError(failure);
      try { const stored = await loadMediaReceipt(scope); if (active()) setReceipt(stored); }
      catch { if (active()) setLoaded(false); }
    } finally {
      if (active()) { current.busy = false; current.controller = null; setBusy(false); }
    }
  }

  async function settle(response: MediaResponse, operation: Operation) {
    if (!operation.active()) return;
    snapshotRef.current = response; setSnapshot(response); setLoaded(true);
    const saved = response.operation;
    if (saved && ['complete', 'cancelled', 'rejected'].includes(saved.status)) {
      // The bound server terminal outcome permits clearing this one reference.
      await acknowledgeMediaWrite(scope, saved.requestId);
      if (!operation.active()) return;
      setReceipt(null);
      if (saved.status === 'complete') {
        if (selectionRef.current?.kind === saved.kind && selectionRef.current.image.sourceSha256 === saved.sourceSha256) {
          selectionRef.current = null; setSelection(null);
        }
        setNote('The image change is confirmed. The saved images below show your current account.');
        void queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      } else if (saved.status === 'cancelled') setNote('The original image change is cancelled. It cannot apply later.');
      else setNote('Your saved business images changed before this upload finished. Review them before applying your selected image.');
    } else {
      const retained = await loadMediaReceipt(scope);
      if (!operation.active()) return;
      setReceipt(retained);
      if (saved) setNote('This image change is not confirmed. Check its status again, retry the exact image, or cancel the original change.');
    }
  }
  async function refresh() {
    await run(async operation => {
      const pending = await loadMediaReceipt(scope);
      if (!operation.active()) return;
      setReceipt(pending);
      const result = pending
        ? await recoverMediaWrite(scope, requestId => operation.request('GET', undefined, requestId))
        : readMediaResponse(await operation.request('GET'), scope);
      if (result) await settle(result, operation);
    });
  }
  const refreshRef = useRef(refresh); refreshRef.current = refresh;
  useEffect(() => {
    const current = owner.current;
    current.active = true; current.epoch += 1; current.busy = false;
    selectionRef.current = null;
    snapshotRef.current = null;
    setStateKey(key); setSnapshot(null); setReceipt(null); setSelection(null); setLoaded(false); setBusy(false); setError(null); setNote('');
    const generation = current.epoch;
    void Promise.resolve().then(() => { if (current.active && current.epoch === generation) return refreshRef.current(); });
    const subscription = AppState.addEventListener('change', state => { if (state === 'background') current.controller?.abort(); });
    return () => { current.active = false; current.epoch += 1; current.controller?.abort(); subscription.remove(); };
  }, [key]);

  async function pick(kind: BusinessMediaKind) {
    if (!loaded || !snapshot || receipt) return;
    const expectedRevision = snapshot.revision;
    await run(async operation => {
      const picked = await pickImageForUpload('library', BUSINESS_MEDIA_POLICY);
      if (!operation.active() || picked.kind === 'cancelled') return;
      if (picked.kind !== 'selected') throw new MediaInputError(picked.kind === 'rejected' ? picked.problem.message : picked.message);
      const image = await readBusinessMediaFile(picked.files[0]);
      if (operation.active()) { selectionRef.current = { kind, image, expectedRevision }; setSelection(selectionRef.current); }
    });
  }
  async function save() {
    const selected = selectionRef.current;
    if (!loaded || !selected) return;
    await run(async operation => {
      // Reopening and this preflight perform reads only. Never replace an older
      // request just because it is not yet visible in the database.
      const pending = await loadMediaReceipt(scope);
      if (!operation.active()) return;
      if (pending) {
        const recovered = await recoverMediaWrite(scope, requestId => operation.request('GET', undefined, requestId));
        if (!operation.active()) return;
        if (recovered && recovered.operation && ['complete', 'cancelled', 'rejected'].includes(recovered.operation.status)) {
          await settle(recovered, operation); return;
        }
      }
      const result = await writeBusinessMedia(scope, { kind: selected.kind, selection: selected.image, expectedRevision: selected.expectedRevision },
        (identity, dataBase64) => operation.request('POST', { ...identity, dataBase64 }));
      await settle(result, operation);
    });
  }
  async function cancel() {
    const requestId = receipt?.identity.requestId;
    if (!requestId) return;
    await run(async operation => {
      const result = await cancelMediaWrite(scope, identity => operation.request('DELETE', identity), requestId);
      await settle(result, operation);
    });
  }
  function discard() {
    if (!owner.current.active || owner.current.key !== key || owner.current.busy || receipt || selectionRef.current !== selection) return;
    selectionRef.current = null; setSelection(null); setError(null); setNote('');
  }
  function rebase() {
    if (!owner.current.active || owner.current.key !== key || owner.current.busy || receipt || !snapshot ||
      snapshotRef.current?.revision !== snapshot.revision || selectionRef.current !== selection) return;
    if (selectionRef.current) { selectionRef.current = { ...selectionRef.current, expectedRevision: snapshot.revision }; setSelection(selectionRef.current); }
    setError(null); setNote('Your selected image will use the current saved version when you press Save.');
  }
  const visible = stateKey === key;
  return { snapshot: visible ? snapshot : null, receipt: visible ? receipt : null, selection: visible ? selection : null,
    busy: visible && busy, loaded: visible && loaded, error: visible ? error : null, note: visible ? note : '',
    pick, save, cancel, refresh, discard, rebase,
    needsReview: visible && !!selection && !!snapshot && selection.expectedRevision !== snapshot.revision && !receipt };
}
