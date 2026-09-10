import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiErrorMessage, apiRequest } from '@/lib/api';
import { ContactResponseSchema, EMPTY_CONTACT_DRAFT, validateContactDraft, type ContactDraft, type ContactFieldErrors } from './contact-contract';
import { ContactDraftSchema, contactDraftKey, createContactDraftStore, type ContactScope } from './contact-draft';
import { acknowledgeContact, ContactNotStartedError, contactInputHash, loadContactReceipt, submitContact, type ContactReceipt } from './contact-receipt';

const message = (error: unknown) => error instanceof Error ? error.message : 'Encrypted support storage could not finish. Keep this screen open and retry.';
/** Mount under the exact Clerk-session key. Epochs also fence StrictMode replay. */
export function useContactSupport(scope: ContactScope) {
  const [store] = useState(() => createContactDraftStore(scope));
  const current = useRef({ active: false, epoch: 0, loadingEpoch: 0, loaded: false, submitting: false, pending: 0, storedKey: '',
    draft: { ...EMPTY_CONTACT_DRAFT }, receipt: null as ContactReceipt | null });
  const transport = useRef<AbortController | null>(null);
  const [view, setView] = useState({ loaded: false, busy: false, pending: 0, draft: { ...EMPTY_CONTACT_DRAFT }, storedKey: '',
    receipt: null as ContactReceipt | null, storageError: null as string | null,
    error: null as string | null, fieldErrors: {} as ContactFieldErrors });
  const active = (epoch: number) => current.current.active && current.current.epoch === epoch;
  const assertActive = (epoch: number) => { if (!active(epoch)) throw new Error('This support screen has closed. Reopen it from the current account.'); };
  const update = (epoch: number, patch: Partial<typeof view>) => { if (active(epoch)) setView(previous => ({ ...previous, ...patch })); };
  const persist = async (draft: ContactDraft, epoch: number) => {
    assertActive(epoch);
    const key = contactDraftKey(draft);
    // Background/Back/Send may flush, but already durable unchanged input must
    // not renew its seven-day retention. Pending writes prevent an A→B→A skip.
    if (!current.current.pending && current.current.storedKey === key) {
      // A background flush must not erase a separate failed receipt/readback
      // or confirmed-draft removal. Explicit retry reconciles that operation.
      return;
    }
    current.current.pending += 1;
    update(epoch, { pending: current.current.pending });
    try {
      await store.save(draft);
      assertActive(epoch);
      current.current.storedKey = key;
      if (contactDraftKey(current.current.draft) === key) update(epoch, { storedKey: key, storageError: null });
    } catch (error) {
      if (contactDraftKey(current.current.draft) === key) update(epoch, { storageError: message(error) });
      throw error;
    } finally {
      current.current.pending -= 1;
      update(epoch, { pending: current.current.pending });
    }
  };
  const reconcile = async (receipt: ContactReceipt | null, epoch: number) => {
    if (receipt?.status !== 'confirmed') return;
    const draft = current.current.draft;
    const key = contactDraftKey(draft);
    if (await contactInputHash(draft) !== receipt.inputHash) return;
    assertActive(epoch);
    await store.remove();
    assertActive(epoch);
    if (contactDraftKey(current.current.draft) === key) {
      current.current.draft = { ...EMPTY_CONTACT_DRAFT };
      current.current.storedKey = contactDraftKey(current.current.draft);
      update(epoch, { draft: current.current.draft, storedKey: contactDraftKey(current.current.draft), storageError: null });
    }
  };
  const load = async (epoch: number) => {
    if (!active(epoch) || current.current.loadingEpoch === epoch) return;
    current.current.loadingEpoch = epoch;
    update(epoch, { storageError: null });
    try {
      const [saved, receipt] = await Promise.all([store.load(), loadContactReceipt(scope)]);
      assertActive(epoch);
      current.current.draft = saved?.value ?? { ...EMPTY_CONTACT_DRAFT };
      current.current.storedKey = contactDraftKey(current.current.draft);
      current.current.receipt = receipt;
      current.current.loaded = true;
      update(epoch, { loaded: true, draft: current.current.draft, storedKey: contactDraftKey(current.current.draft), receipt });
      await reconcile(receipt, epoch);
    } catch (error) { update(epoch, { storageError: message(error) }); }
    finally { if (current.current.loadingEpoch === epoch) current.current.loadingEpoch = 0; }
  };
  useEffect(() => {
    const owner = current.current;
    owner.active = true;
    const epoch = ++owner.epoch;
    void load(epoch);
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' && owner.loaded) void persist(owner.draft, epoch).catch(() => undefined);
    });
    return () => { owner.active = false; owner.epoch += 1; transport.current?.abort(); subscription.remove(); };
    // The parent remounts this controller for every account/session change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const edit = (patch: Partial<ContactDraft>) => {
    const owner = current.current;
    if (!owner.active || !owner.loaded || owner.submitting || (owner.receipt && owner.receipt.status !== 'rejected')) return;
    owner.draft = ContactDraftSchema.parse({ ...owner.draft, ...patch });
    update(owner.epoch, { draft: owner.draft, error: null, fieldErrors: {} });
    void persist(owner.draft, owner.epoch).catch(() => undefined);
  };
  const retryStorage = async () => {
    const owner = current.current;
    if (!owner.active || owner.submitting) return;
    const epoch = owner.epoch;
    if (!owner.loaded) { await load(epoch); return; }
    try {
      // Re-read only the opaque result, never overwrite the edited working copy.
      const receipt = await loadContactReceipt(scope);
      assertActive(epoch);
      owner.receipt = receipt;
      update(epoch, { receipt });
      await persist(owner.draft, epoch);
      await reconcile(receipt, epoch);
      // Only the explicit retry can clear errors once both the durable input
      // and any confirmed-send cleanup have actually succeeded.
      update(epoch, { storageError: null });
    } catch (error) { update(epoch, { storageError: message(error) }); }
  };
  const send = async () => {
    const owner = current.current;
    if (!owner.active || !owner.loaded || owner.submitting || (owner.receipt && owner.receipt.status !== 'rejected')) return;
    const validation = validateContactDraft(owner.draft);
    if (!validation.ok) { update(owner.epoch, { fieldErrors: validation.errors, error: 'Check the highlighted fields before sending.' }); return; }
    owner.submitting = true; // Synchronous; a second tap cannot get past persistence.
    const epoch = owner.epoch;
    const snapshot = ContactDraftSchema.parse(owner.draft);
    update(epoch, { busy: true, error: null, fieldErrors: {} });
    try {
      await persist(snapshot, epoch);
      assertActive(epoch);
      const receipt = await submitContact(scope, validation.value, async body => {
        if (!active(epoch)) throw new ContactNotStartedError('The support screen closed before sending.');
        const controller = new AbortController(); transport.current = controller;
        const response = await apiRequest('/api/contact', ContactResponseSchema.strict(), {
          method: 'POST', body, timeoutMs: 20000, signal: controller.signal,
        });
        assertActive(epoch); return response;
      });
      assertActive(epoch);
      owner.receipt = receipt;
      update(epoch, { receipt });
      try { await reconcile(receipt, epoch); }
      catch (error) { update(epoch, { storageError: message(error) }); }
    } catch (error) {
      update(epoch, { error: apiErrorMessage(error, 'The result is not confirmed. Your draft and device reference have been kept.') });
    } finally {
      transport.current = null;
      try {
        const receipt = await loadContactReceipt(scope);
        if (active(epoch)) { owner.receipt = receipt; update(epoch, { receipt }); }
      } catch (error) { update(epoch, { storageError: message(error) }); }
      owner.submitting = false;
      update(epoch, { busy: false });
    }
  };
  const newMessage = async () => {
    const owner = current.current;
    if (!owner.active || owner.submitting || owner.receipt?.status !== 'confirmed') return;
    owner.submitting = true;
    const epoch = owner.epoch;
    update(epoch, { busy: true, error: null });
    try {
      await reconcile(owner.receipt, epoch);
      assertActive(epoch);
      await acknowledgeContact(scope, owner.receipt.requestId);
      assertActive(epoch);
      owner.receipt = null;
      update(epoch, { receipt: null, storageError: null });
    } catch (error) { update(epoch, { storageError: message(error) }); }
    finally { owner.submitting = false; update(epoch, { busy: false }); }
  };
  return { ...view, stored: view.loaded && !view.pending && view.storedKey === contactDraftKey(view.draft) && !view.storageError,
    edit, send, retryStorage, newMessage };
}
