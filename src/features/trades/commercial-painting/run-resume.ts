import { z } from 'zod';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import type { PaintScope } from './pricing-contract';

const RunPointerSchema = z.object({ runId: z.string().uuid() }).strict();
/** Construct once for the account subtree, so logout revokes the handle before
 * a late upload callback can write a new resume pointer. Legacy global IDs are
 * deliberately not read because they do not identify an owning account. */
export function createPaintRunResume(scope: PaintScope) {
  const store = createWorkingDraftStore({ ...scope, purpose: 'paint-resume-v1', recordId: 'workspace' }, RunPointerSchema);
  return { load: async () => (await store.load())?.value.runId ?? null,
    save: async (runId: string | null) => { if (runId) await store.save({ runId }); else await store.remove(); } };
}
