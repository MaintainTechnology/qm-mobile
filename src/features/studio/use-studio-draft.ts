import { useEffect, useMemo, useRef, useState } from 'react';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import { StudioDraftSchema, type StudioDraft } from './studio-contract';
import { DEFAULT_CAROUSEL } from './studio-presets';

export const freshStudioDraft = (): StudioDraft => StudioDraftSchema.parse({ slides: DEFAULT_CAROUSEL, selected: 0 });

/** One encrypted working copy, not a named or remotely persisted project. */
export function useStudioDraft(scope: { userId: string; tenantId: string }) {
  const { userId, tenantId } = scope;
  const store = useMemo(() => createWorkingDraftStore({ userId, tenantId, purpose: 'studio.v1', recordId: 'fixed-carousel' }, StudioDraftSchema), [userId, tenantId]);
  const [draft, setDraft] = useState(freshStudioDraft);
  const [loaded, setLoaded] = useState(false);
  const [stored, setStored] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [restored, setRestored] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0);
  const pending = useRef(0);
  const committedKey = useRef('');
  const mounted = useRef(true);
  const loadEpoch = useRef(0);
  const key = JSON.stringify(draft);
  const currentKey = useRef(key);
  currentKey.current = key;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (loaded) return;
    let active = true;
    const epoch = ++loadEpoch.current;
    void store.load().then(saved => {
      if (!active || epoch !== loadEpoch.current) return;
      const value = saved ? StudioDraftSchema.parse(saved.value) : freshStudioDraft();
      committedKey.current = JSON.stringify(value);
      setDraft(value); setStored(JSON.stringify(value)); setRestored(!!saved); setError(''); setLoaded(true);
    }).catch(() => { if (active && epoch === loadEpoch.current) setError('The saved Studio working copy could not be opened. Retry, or explicitly discard it to start again.'); });
    return () => { active = false; };
  }, [store, loaded, retry]);
  useEffect(() => {
    if (!loaded || (key === committedKey.current && pending.current === 0)) return;
    pending.current += 1;
    setPendingWrites(pending.current);
    // Start the encrypted write immediately so an app interruption has the
    // shortest possible exposure; the shared adapter serializes generations.
    void store.save(draft).then(() => {
      committedKey.current = key;
      if (mounted.current && currentKey.current === key) { setStored(key); setError(''); }
    }).catch(() => { if (mounted.current && currentKey.current === key) setError('Your latest edits have not been saved securely. Keep this screen open and retry.'); })
      .finally(() => { pending.current -= 1; if (mounted.current) setPendingWrites(pending.current); });
  }, [store, loaded, draft, key, retry]);
  async function discard() {
    const epoch = ++loadEpoch.current;
    try {
      await store.remove();
      if (!mounted.current || epoch !== loadEpoch.current) return;
      const value = freshStudioDraft();
      committedKey.current = JSON.stringify(value);
      setDraft(value); setStored(JSON.stringify(value)); setLoaded(true); setError(''); setRestored(false);
    } catch { if (mounted.current) setError('The saved Studio working copy could not be discarded. Retry before leaving.'); }
  }
  return { draft, setDraft, loaded, error, restored, unstored: loaded && (key !== stored || pendingWrites > 0),
    retry: () => setRetry(value => value + 1), discard };
}
