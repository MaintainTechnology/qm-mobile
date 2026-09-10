import { z } from 'zod';
import { ProfilePatchSchema, type ProfileField } from './business-profile';
export class BusinessProfileError extends Error {
  constructor(message: string, readonly field?: ProfileField) { super(message); }
}

export const ProfileUuid = z.string().uuid().transform(value => value.toLowerCase());
const scope = { ok: z.literal(true), tenantId: ProfileUuid, userId: z.string().min(1).max(256) };
export const ProfileSnapshotSchema = z.object({ ...scope, revision: ProfileUuid,
  profile: z.object({ business_name: z.string().nullable(), owner_first_name: z.string().nullable(), owner_email: z.string().nullable(),
    owner_mobile: z.string().nullable(), state: z.string().nullable(), abn: z.string().nullable(),
    sms_estimator_enabled: z.boolean().nullable(), business_address: z.string().nullable() }).strict(),
}).strict();
export type ProfileSnapshot = z.infer<typeof ProfileSnapshotSchema>;
export const ProfileCompletionSchema = z.object({ ...scope, requestId: ProfileUuid, status: z.literal('complete'),
  expectedRevision: ProfileUuid, inputHash: z.string().regex(/^[a-f0-9]{64}$/), revision: ProfileUuid }).strict();
export type ProfileCompletion = z.infer<typeof ProfileCompletionSchema>;
export const ProfileRejectionCodeSchema = z.enum(['business_profile_email_conflict', 'business_profile_revision_conflict']);
export const ProfileRejectionSchema = ProfileCompletionSchema.extend({ status: z.literal('rejected'), errorCode: ProfileRejectionCodeSchema });
export const ProfileTerminalSchema = z.union([ProfileCompletionSchema, ProfileRejectionSchema]);
export type ProfileTerminal = z.infer<typeof ProfileTerminalSchema>;
export const ProfileOperationSchema = z.union([ProfileTerminalSchema,
  z.object({ ...scope, requestId: ProfileUuid, status: z.literal('not_found') }).strict()]);
export type ProfileOperation = z.infer<typeof ProfileOperationSchema>;
export const ProfileRequestSchema = z.object({ requestId: ProfileUuid, expectedRevision: ProfileUuid,
  patch: ProfilePatchSchema.refine(value => Object.keys(value).length > 0, 'At least one changed field is required') }).strict();
export type ProfileRequest = z.infer<typeof ProfileRequestSchema>;
/** Exact normalized UTF-8 input to the paired SQL222 service hash. */
export function profileInputText(expectedRevision: string, patch: ProfileRequest['patch']) {
  return JSON.stringify([ProfileUuid.parse(expectedRevision), Object.entries(ProfilePatchSchema.parse(patch)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)]);
}
