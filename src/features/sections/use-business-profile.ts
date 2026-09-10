import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { MissingClerkTokenError, requireClerkToken } from '@/lib/auth-token';
import { TENANT_ME_KEY, type TenantMe } from '@/lib/tenant';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import { BusinessDraftSchema, PROFILE_FIELDS, profileChanges, profileFromTenant, profileKey, type BusinessProfile } from './business-profile';
import { BusinessProfileError, ProfileTerminalSchema, ProfileOperationSchema, ProfileSnapshotSchema, type ProfileTerminal, type ProfileSnapshot } from './business-profile-contract';
import { acknowledgeProfileWrite, loadProfileReceipt, profileWriteHash, recoverProfileWrite, writeBusinessProfile, type ProfileReceipt } from './business-profile-write';

const PATH = '/api/tenant/business-profile';
type Context = { identity: string; epoch: number };
type Saved = { value: BusinessProfile; revision: string };
const copyKey = (baseline: BusinessProfile, value: BusinessProfile, revision: string | null) => JSON.stringify([revision, profileKey(baseline), profileKey(value)]);
const savedValues = (snapshot: ProfileSnapshot): Saved => ({ value: profileFromTenant(snapshot.profile), revision: snapshot.revision });
export function useBusinessProfile(me: TenantMe) {
  const { userId, sessionId, getToken } = useAuth();
  const cache = useQueryClient();
  const tenantId = me.tenant.id;
  const identity = JSON.stringify([userId, sessionId, tenantId]);
  const scope = useMemo(() => ({ userId: userId ?? '', tenantId }), [userId, tenantId]);
  const store = useMemo(() => createWorkingDraftStore({ ...scope, purpose: 'business-profile-v1', recordId: 'profile' }, BusinessDraftSchema), [scope]);
  const owner = useRef({ identity, epoch: 0, active: false });
  owner.current.identity = identity;
  const initial = profileFromTenant(me.tenant);
  const [state, setState] = useState({ identity, value: initial, baseline: initial, baselineRevision: null as string | null,
    loaded: false, storedKey: '', pending: 0, receipt: null as ProfileReceipt | null, error: null as unknown,
    storageError: null as unknown, note: '', busy: false, latest: null as Saved | null });
  const [reload, setReload] = useState(0);
  const [writeRetry, setWriteRetry] = useState(0);
  const inFlight = useRef<Context | null>(null);
  const writes = useRef(0);
  const committedKey = useRef('');
  const context = (): Context => ({ identity, epoch: owner.current.epoch });
  const active = (run: Context) => owner.current.active && owner.current.identity === run.identity && owner.current.epoch === run.epoch;
  const assertActive = (run: Context) => { if (!userId || !active(run)) throw new MissingClerkTokenError(); };
  const update = (run: Context, patch: Partial<typeof state>) => { if (active(run)) setState(previous => ({ ...previous, ...patch, identity })); };
  const draftKey = copyKey(state.baseline, state.value, state.baselineRevision);
  const loaded = state.identity === identity && state.loaded;
  const dirty = loaded && profileKey(state.baseline) !== profileKey(state.value);
  const stored = loaded && state.storedKey === draftKey && !state.pending && !state.storageError;
  const token = async (run: Context) => {
    assertActive(run); let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = requireClerkToken(await Promise.race([getToken(), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); })]));
      assertActive(run); return value;
    } finally { clearTimeout(timer); }
  };
  const read = async (run: Context) => {
    const snapshot = await apiRequest(PATH, ProfileSnapshotSchema, { token: await token(run) });
    assertActive(run);
    if (snapshot.tenantId !== tenantId || snapshot.userId !== userId) throw new BusinessProfileError('Your business account changed. Reopen Account before editing.');
    return savedValues(snapshot);
  };
  useEffect(() => {
    const current = owner.current; current.active = true; current.epoch += 1;
    const run = context(); let cancelled = false;
    void (async () => {
      try {
        const [copy, receipt] = await Promise.all([store.load(), loadProfileReceipt(scope)]);
        assertActive(run);
        const saved = copy ? null : await read(run);
        if (cancelled) return;
        const value = copy?.value.value ?? saved!.value;
        const baseline = copy?.value.baseline ?? saved!.value;
        const baselineRevision = copy?.value.baselineRevision ?? saved?.revision ?? null;
        const key = copyKey(baseline, value, baselineRevision); committedKey.current = key;
        update(run, { value, baseline, baselineRevision, receipt, loaded: true, storedKey: key, pending: 0,
          storageError: null, error: null, note: baselineRevision ? '' : 'This older working copy needs review against the current business details before saving.', busy: false, latest: null });
      } catch (error) { if (!cancelled) update(run, { storageError: error }); }
    })();
    return () => { cancelled = true; current.active = false; current.epoch += 1; };
    // Refetch never overwrites a restored working baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, scope, store, reload]);
  useEffect(() => {
    if (!loaded || (committedKey.current === draftKey && !writes.current)) return;
    const run = context(); let cancelled = false;
    writes.current += 1; update(run, { pending: writes.current });
    const operation = dirty ? store.save({ baseline: state.baseline, value: state.value, baselineRevision: state.baselineRevision }) : store.remove();
    void operation.then(() => {
      if (!active(run)) return;
      committedKey.current = draftKey;
      if (!cancelled) update(run, { storedKey: draftKey, storageError: null });
    }).catch(storageError => { if (!cancelled) update(run, { storageError }); })
      .finally(() => { writes.current -= 1; update(run, { pending: writes.current }); });
    return () => { cancelled = true; };
    // The committed-key and pending count prevent A-to-B-to-A losing its last write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, dirty, state.baseline, state.value, state.baselineRevision, draftKey, store, identity, writeRetry]);
  const begin = () => {
    const run = context(); assertActive(run);
    if (inFlight.current && active(inFlight.current)) return null;
    inFlight.current = run; update(run, { busy: true, error: null, note: '' }); return run;
  };
  const finish = async (run: Context) => {
    if (active(run)) {
      try { const receipt = await loadProfileReceipt(scope); update(run, { receipt }); } catch (storageError) { update(run, { storageError }); }
    }
    if (inFlight.current === run) inFlight.current = null;
    update(run, { busy: false });
  };
  const accept = async (saved: Saved, run: Context, requestId?: string) => {
    await store.remove(); assertActive(run);
    if (requestId) { await acknowledgeProfileWrite(scope, requestId); assertActive(run); }
    const key = copyKey(saved.value, saved.value, saved.revision); committedKey.current = key;
    update(run, { baseline: saved.value, value: saved.value, baselineRevision: saved.revision, receipt: null,
      storedKey: key, latest: null, note: requestId ? 'Business update confirmed. Current saved details are shown.' : 'Current saved business details loaded.', error: null, storageError: null });
    void cache.invalidateQueries({ queryKey: TENANT_ME_KEY });
  };
  const lookup = async (requestId: string, run: Context) => {
    const value = await apiRequest(PATH + '?requestId=' + encodeURIComponent(requestId), ProfileOperationSchema, { token: await token(run), diagnosticPath: PATH });
    assertActive(run); return value;
  };
  const settle = async (complete: ProfileTerminal, run: Context) => {
    const current = await read(run);
    if (complete.status === 'rejected') {
      await acknowledgeProfileWrite(scope, complete.requestId); assertActive(run);
      update(run, { receipt: null, latest: current, error: complete.errorCode === 'business_profile_email_conflict'
        ? new BusinessProfileError('This business contact email is already in use. Choose another email and review the current details before saving.', 'owner_email')
        : new BusinessProfileError('The saved business details changed before your update. Review the current values before saving your edit.') });
      return;
    }
    const receipt = await loadProfileReceipt(scope); assertActive(run);
    let sameInput = false;
    try {
      const changed = profileChanges(state.value, state.baseline);
      const fields = receipt?.version === 2 ? receipt.fields : [];
      const submitted = Object.fromEntries(fields.map(field => [field, state.value[field]]));
      sameInput = Object.keys(changed).every(field => fields.some(target => target === field)) &&
        await profileWriteHash(complete.expectedRevision, submitted) === complete.inputHash;
    }
    catch { /* Newer incomplete fields stay editable; the completed receipt is still valid. */ }
    assertActive(run);
    if (sameInput || !dirty) await accept(current, run, complete.requestId);
    else {
      await acknowledgeProfileWrite(scope, complete.requestId); assertActive(run);
      update(run, { receipt: null, latest: current, note: 'The previous update is confirmed. Your newer unsaved fields are retained; review current details before saving them.' });
    }
  };
  const refresh = async (discard = false) => {
    if (!loaded || !stored) return;
    const run = begin(); if (!run) return;
    try {
      const receipt = await loadProfileReceipt(scope); assertActive(run);
      if (receipt) {
        const complete = await recoverProfileWrite(scope, requestId => lookup(requestId, run)); assertActive(run);
        if (!complete) throw new BusinessProfileError('The previous update is not confirmed yet. Checking again will not submit another update.');
        await settle(complete, run);
      } else {
        const current = await read(run);
        if (!dirty || discard) await accept(current, run);
        else update(run, { latest: current, note: 'Review the current saved details below. Your unsaved fields are retained.' });
      }
    } catch (error) { update(run, { error }); }
    finally { await finish(run); }
  };
  const save = async () => {
    if (!loaded || !stored) return;
    const run = begin(); if (!run) return;
    try {
      const receipt = await loadProfileReceipt(scope); assertActive(run);
      const patch = receipt?.version === 2 ? Object.fromEntries(receipt.fields.map(field => [field, state.value[field]])) : profileChanges(state.value, state.baseline);
      if (!Object.keys(patch).length && !receipt) { update(run, { note: 'There are no changed business details.' }); return; }
      if (receipt) {
        const complete = await recoverProfileWrite(scope, requestId => lookup(requestId, run)); assertActive(run);
        if (complete) { await settle(complete, run); return; }
      } else {
        const current = await read(run);
        if (!state.baselineRevision || current.revision !== state.baselineRevision) {
          update(run, { latest: current });
          throw new BusinessProfileError('Your saved business details changed. Review the current values before saving your edit.');
        }
      }
      const expectedRevision = receipt?.version === 2 ? receipt.expectedRevision : state.baselineRevision;
      if (!expectedRevision) throw new BusinessProfileError('Review the current business details before saving this older edit.');
      const complete = await writeBusinessProfile(scope, { expectedRevision, patch }, async body => {
        const result = await apiRequest(PATH, ProfileTerminalSchema, { method: 'PATCH', body, token: await token(run) });
        assertActive(run); return result;
      });
      assertActive(run); await settle(complete, run);
    } catch (error) { update(run, { error }); }
    finally { await finish(run); }
  };
  const edit = (patch: Partial<BusinessProfile>) => {
    const run = context();
    if (loaded && active(run) && !(inFlight.current && active(inFlight.current)))
      setState(previous => previous.identity === identity ? { ...previous, value: { ...previous.value, ...patch }, note: '', error: null } : previous);
  };
  const rebase = () => {
    const run = context();
    if (!loaded || !stored || !active(run) || state.receipt || !state.latest || (inFlight.current && active(inFlight.current))) return;
    const edited = Object.fromEntries(PROFILE_FIELDS.filter(field => state.value[field] !== state.baseline[field]).map(field => [field, state.value[field]]));
    update(run, { baseline: state.latest.value, value: { ...state.latest.value, ...edited }, baselineRevision: state.latest.revision,
      latest: null, error: null, note: 'Your edit now uses the reviewed business details. Save to apply your changed fields.' });
  };
  const retryStorage = async () => {
    const run = context();
    if (!active(run) || (inFlight.current && active(inFlight.current))) return;
    if (!loaded) { setReload(value => value + 1); return; }
    try {
      const receipt = await loadProfileReceipt(scope); assertActive(run);
      update(run, { receipt, storageError: null }); setWriteRetry(value => value + 1);
    } catch (storageError) { update(run, { storageError }); }
  };
  const visible = state.identity === identity ? state : { ...state, identity, value: initial, baseline: initial, receipt: null, error: null, storageError: null, note: '', busy: false, latest: null };
  return { ...visible, error: visible.storageError ?? visible.error, loaded, dirty, stored, edit, save, refresh, rebase, retryStorage };
}
