import { z } from 'zod';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import type { RoofScope } from './roof-attempt';

const ChangesSchema = z.object({
  sloped_area_m2: z.string().max(32).optional(), pitch_degrees: z.string().max(32).optional(),
  storeys: z.string().max(32).optional(), hips: z.string().max(32).optional(),
  valleys: z.string().max(32).optional(), box_gutter_lm: z.string().max(32).optional(),
  gutter_lm: z.string().max(32).optional(), downpipe_count: z.string().max(32).optional(),
  fascia_lm: z.string().max(32).optional(), soffit_lm: z.string().max(32).optional(),
  form: z.string().max(32).optional(),
}).strict();
export const RoofWorkingDraftSchema = z.object({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  included: z.array(z.number().int().min(1).max(64)).max(64),
  edits: z.record(z.string().regex(/^([1-9]|[1-5][0-9]|6[0-4])$/), ChangesSchema),
}).strict();
export function createRoofWorkingDraftStore(scope: RoofScope) {
  return createWorkingDraftStore({ ...scope, purpose: 'roof-correction-v1' }, RoofWorkingDraftSchema);
}
