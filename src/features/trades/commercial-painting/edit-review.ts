import { z } from 'zod';
import { paintInputKey } from './pricing-contract';

const Id = z.string().uuid().transform(value => value.toLowerCase());
export const PaintEditSnapshotSchema = z.object({
  runId: Id, extractionId: Id.nullable(), revision: z.string().regex(/^[a-f0-9]{64}$/),
  job_name: z.string().nullable(), site_address: z.string().nullable(), items: z.array(z.unknown()),
  corrected_items: z.array(z.unknown()).nullable(), released: z.boolean(),
}).strict();
export type PaintEditSnapshot = z.infer<typeof PaintEditSnapshotSchema>;
export const PaintEditReadSchema = z.object({ ok: z.literal(true), snapshot: PaintEditSnapshotSchema }).strict();

/** Only the exact source already displayed can supply an observed revision.
 * A GET performed immediately before Price is not evidence of user review. */
export function paintEditMatchesDisplay(snapshot: PaintEditSnapshot, run: unknown, extraction: unknown) {
  const r = z.object({ id: Id, job_name: z.string().nullish(), site_address: z.string().nullish() }).safeParse(run);
  if (!r.success || r.data.id !== snapshot.runId || (r.data.job_name ?? null) !== snapshot.job_name ||
      (r.data.site_address ?? null) !== snapshot.site_address) return false;
  if (!extraction) return snapshot.extractionId === null && snapshot.items.length === 0 && snapshot.corrected_items === null;
  const e = z.object({ id: Id, items: z.array(z.unknown()).nullish(), corrected_items: z.array(z.unknown()).nullish() }).safeParse(extraction);
  return e.success && e.data.id === snapshot.extractionId &&
    paintInputKey(e.data.items ?? []) === paintInputKey(snapshot.items) &&
    paintInputKey(e.data.corrected_items ?? null) === paintInputKey(snapshot.corrected_items);
}
