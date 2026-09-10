import { useEffect, useReducer, useRef, useState } from 'react';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import {
  FollowupDraftSchema, emptyFollowupDraft, followupKey,
  type FollowupDraft, type FollowupItem,
} from './followups';

type Scope = { userId: string; tenantId: string };
type Entry = {
  store: ReturnType<typeof createWorkingDraftStore<FollowupDraft>>;
  value: FollowupDraft;
  loaded: boolean;
  loading: boolean;
  version: number;
  savedVersion: number;
  pending: number;
  error: string | null;
};
const storageMessage = (error: unknown) => error instanceof Error
  ? error.message : 'The working copy could not be saved. Keep this screen open and retry.';

/** Mount inside an identity-keyed boundary. Working copies never represent delivery receipts. */
export function useFollowupDrafts(scope: Scope) {
  const [entries] = useState(() => new Map<string, Entry>());
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const changed = () => { if (active.current) refresh(); };

  const load = async (entry: Entry) => {
    if (entry.loading || entry.loaded) return;
    entry.loading = true;
    entry.error = null;
    changed();
    try {
      const saved = await entry.store.load();
      if (!active.current) return;
      entry.value = saved?.value ?? emptyFollowupDraft();
      entry.loaded = true;
    } catch (error) {
      if (active.current) entry.error = storageMessage(error);
    } finally {
      entry.loading = false;
      changed();
    }
  };
  const ensure = (item: FollowupItem) => {
    if (!active.current) return;
    const key = followupKey(item);
    let entry = entries.get(key);
    if (entry) return; // Failed reads require deliberate retry, never a render-driven loop.
    if (!entry) {
      const recordId = item.kind === 'quote' ? item.quote_id : item.conversation_id;
      if (!recordId) return;
      entry = {
        store: createWorkingDraftStore({ ...scope, recordId, purpose: `followup.${item.kind}.v1` }, FollowupDraftSchema),
        value: emptyFollowupDraft(), loaded: false, loading: false,
        version: 0, savedVersion: 0, pending: 0, error: null,
      };
      entries.set(key, entry);
    }
    void load(entry);
  };
  const persist = async (entry: Entry) => {
    const version = entry.version;
    const snapshot = FollowupDraftSchema.parse(entry.value);
    entry.pending += 1;
    entry.error = null;
    changed();
    try {
      if (snapshot.text === null && snapshot.logNote === '' && snapshot.outcome === 'spoke') await entry.store.remove();
      else await entry.store.save(snapshot);
      if (!active.current) return;
      entry.savedVersion = Math.max(entry.savedVersion, version);
      if (entry.version === version) entry.error = null;
    } catch (error) {
      if (active.current && entry.savedVersion < version) entry.error = storageMessage(error);
    } finally {
      entry.pending -= 1;
      changed();
    }
  };
  const update = (item: FollowupItem, patch: Partial<FollowupDraft>) => {
    const entry = entries.get(followupKey(item));
    if (!active.current || !entry?.loaded) return;
    entry.value = FollowupDraftSchema.parse({ ...entry.value, ...patch });
    entry.version += 1;
    void persist(entry);
  };
  const retry = () => {
    if (!active.current) return;
    for (const entry of entries.values()) {
      if (!entry.loaded) void load(entry);
      else if (!entry.pending && entry.savedVersion < entry.version) void persist(entry);
    }
  };
  const state = (item: FollowupItem) => {
    const entry = entries.get(followupKey(item));
    return { value: entry?.value ?? emptyFollowupDraft(), ready: !!entry?.loaded };
  };
  const all = [...entries.values()];
  return {
    ensure, update, retry, state,
    pending: all.some(entry => entry.pending > 0),
    unsaved: all.some(entry => entry.savedVersion < entry.version),
    error: all.find(entry => entry.error)?.error ?? null,
  };
}
