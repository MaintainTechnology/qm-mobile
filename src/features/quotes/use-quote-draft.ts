import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createQuoteDraftStore,
  type QuoteDraftInput,
  type QuoteDraftScope,
  type QuoteDraftSnapshot,
} from './quote-draft-storage';

/** Coalesce rapid typing into the newest encrypted snapshot; explicit navigation waits for it. */
export function useQuoteDraft(
  scope: QuoteDraftScope | null,
  input: QuoteDraftInput,
  dirty: boolean,
  restore: (saved: QuoteDraftSnapshot) => void,
) {
  const userId = scope?.userId;
  const tenantId = scope?.tenantId;
  const quoteId = scope?.quoteId;
  const store = useMemo(
    () =>
      userId && tenantId && quoteId ? createQuoteDraftStore({ userId, tenantId, quoteId }) : null,
    [userId, tenantId, quoteId],
  );
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const lifecycle = useRef({ active: true, store });
  lifecycle.current.store = store;
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const inputRef = useRef(input);
  inputRef.current = input;
  const wanted = useRef<QuoteDraftInput | null>(null);
  const writing = useRef<Promise<void> | null>(null);
  const savedIdentity = useRef<string | null>(null);
  const showError = (cause: unknown) =>
    cause instanceof Error
      ? cause.message
      : 'The encrypted draft could not be stored. Keep this editor open.';

  const drain = useCallback((): Promise<void> => {
    if (writing.current) return writing.current;
    if (!store) return Promise.reject(new Error('Sign in before storing a quote draft.'));
    const current = () => lifecycle.current.active && lifecycle.current.store === store;
    setSaving(true);
    const run = async () => {
      try {
        while (wanted.current && current()) {
          const snapshot = wanted.current;
          wanted.current = null;
          const saved = await store.save(snapshot);
          if (!current()) return;
          savedIdentity.current = JSON.stringify(snapshot);
          setSavedAt(saved.savedAt);
          setError(null);
        }
      } catch (cause) {
        if (current()) setError(showError(cause));
        throw cause;
      } finally {
        writing.current = null;
        if (current()) setSaving(false);
      }
    };
    writing.current = run();
    return writing.current;
  }, [store]);

  useEffect(() => {
    const state = lifecycle.current;
    state.active = true;
    let active = true;
    setLoaded(false);
    setError(null);
    setSavedAt(null);
    savedIdentity.current = null;
    if (!store) {
      setError('Sign in to recover this quote draft.');
      return;
    }
    void store
      .load()
      .then(saved => {
        if (!active || state.store !== store) return;
        if (saved) {
          savedIdentity.current = JSON.stringify({
            revision: saved.revision,
            originalTiers: saved.originalTiers,
            workingTiers: saved.workingTiers,
            ...(saved.narrative ? { narrative: saved.narrative } : {}),
          });
          setSavedAt(saved.savedAt);
          restoreRef.current(saved);
        }
        setLoaded(true);
      })
      .catch(cause => {
        if (active && state.store === store) setError(showError(cause));
      });
    return () => {
      active = false;
      state.active = false;
      wanted.current = null;
    };
  }, [store, reload]);

  const identity = JSON.stringify(input);
  useEffect(() => {
    if (!loaded || identity === savedIdentity.current) return;
    // A user can undo all changes while an older dirty copy is still being written.
    // Queue the baseline too, so recovery never resurrects the undone edit.
    if (!dirty && !savedIdentity.current && !writing.current && !wanted.current) return;
    wanted.current = inputRef.current;
    void drain().catch(() => undefined);
  }, [loaded, dirty, identity, drain]);

  async function flush() {
    if (!loaded) throw new Error(error || 'Wait for encrypted draft recovery to finish.');
    wanted.current = inputRef.current;
    await drain();
    if (wanted.current) await drain();
  }
  async function remove() {
    wanted.current = null;
    if (writing.current) await writing.current.catch(() => undefined);
    if (!store || !loaded) throw new Error(error || 'Encrypted draft recovery is unavailable.');
    await store.remove();
    savedIdentity.current = null;
    if (lifecycle.current.active) {
      setSavedAt(null);
      setError(null);
    }
  }
  async function replace(next: QuoteDraftInput) {
    if (!loaded) throw new Error(error || 'Wait for encrypted draft recovery to finish.');
    wanted.current = next;
    await drain();
    if (wanted.current) await drain();
  }
  return {
    loaded,
    saving,
    error,
    savedAt,
    flush,
    remove,
    replace,
    retry: () => {
      if (loaded) void flush().catch(() => undefined);
      else setReload(value => value + 1);
    },
  };
}
