import { z } from 'zod';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import { AU_STATES, MeasureAllResponseSchema } from './schema';
import type { RoofScope } from './roof-attempt';

const Inputs = z.object({ material: z.string().max(60).optional(), pitch: z.string().max(40).optional(),
  intent: z.string().max(40).optional(), building_year_built: z.number().nullable().optional() });
export const RoofInputDraftSchema = z.object({
  address: z.string().max(300), postcode: z.string().max(4), state: z.enum(AU_STATES),
  material: z.string().max(60), pitch: z.string().max(40), intent: z.string().max(40), yearBuilt: z.string().max(4),
  customerName: z.string().max(160), customerPhone: z.string().max(40),
  perBuilding: z.record(z.string().max(200), Inputs),
  included: z.record(z.string(),z.boolean()).optional(),
  accepted: z.object({ response:MeasureAllResponseSchema, request:z.object({
    address:z.object({address:z.string(),postcode:z.string(),state:z.enum(AU_STATES)}),
    inputs:z.object({material:z.string(),pitch:z.string(),intent:z.string(),building_year_built:z.number().nullable()}),
    perBuilding:z.record(z.string(),Inputs).optional(),
  }) }).nullable().optional(),
}).strict();
export function createRoofInputDraftStore(scope: Pick<RoofScope, 'userId' | 'tenantId'>) {
  return createWorkingDraftStore({ ...scope, recordId: 'new-roof', purpose: 'roof-input-v1' }, RoofInputDraftSchema);
}
