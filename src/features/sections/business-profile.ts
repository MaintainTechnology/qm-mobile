import { z } from 'zod';

export const PROFILE_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
export const PROFILE_FIELDS = ['business_name', 'owner_first_name', 'owner_email', 'owner_mobile', 'state', 'abn', 'sms_estimator_enabled', 'business_address'] as const;
export type ProfileField = typeof PROFILE_FIELDS[number];
const ValuesSchema = z.object({
  business_name: z.string().max(80), owner_first_name: z.string().max(40), owner_email: z.string().max(120),
  owner_mobile: z.string().max(20), state: z.string().max(3), abn: z.string().max(20), sms_estimator_enabled: z.boolean(), business_address: z.string().max(200).default(''),
}).strict();
export type BusinessProfile = z.infer<typeof ValuesSchema>;
export const BusinessDraftSchema = z.object({ baseline: ValuesSchema, value: ValuesSchema, baselineRevision: z.string().uuid().nullable().default(null) }).strict();
export const ProfilePatchSchema = z.object({
  business_name: z.string().trim().min(2).max(80).optional(), owner_first_name: z.string().trim().min(1).max(40).optional(),
  owner_email: z.string().trim().email().max(120).optional(), owner_mobile: z.string().trim().min(8).max(20).optional(),
  state: z.enum(PROFILE_STATES).optional(), abn: z.string().trim().max(20).optional(), sms_estimator_enabled: z.boolean().optional(), business_address: z.string().trim().max(200).optional(),
}).strict();
export type ProfilePatch = z.infer<typeof ProfilePatchSchema>;
export function profileFromTenant(tenant: Record<string, unknown>): BusinessProfile {
  const text = (field: ProfileField) => typeof tenant[field] === 'string' ? tenant[field] as string : '';
  return ValuesSchema.parse({ business_name: text('business_name'), owner_first_name: text('owner_first_name'),
    owner_email: text('owner_email'), owner_mobile: text('owner_mobile'), state: text('state'), abn: text('abn'),
    sms_estimator_enabled: tenant.sms_estimator_enabled === true, business_address: text('business_address') });
}
export function profileChanges(value: BusinessProfile, baseline: BusinessProfile): ProfilePatch {
  const changed = Object.fromEntries(PROFILE_FIELDS.filter(key => value[key] !== baseline[key]).map(key => [key, value[key]]));
  // Validate only edited fields. Missing legacy details are not rewritten by an unrelated edit.
  return ProfilePatchSchema.parse(changed);
}
export function profileMatches(value: BusinessProfile, patch: ProfilePatch) {
  return Object.entries(patch).every(([field, expected]) => value[field as ProfileField] === expected);
}
export function profileConflicts(current: BusinessProfile, baseline: BusinessProfile, patch: ProfilePatch) {
  return (Object.keys(patch) as ProfileField[]).filter(field => current[field] !== baseline[field] && current[field] !== patch[field]);
}
export function profileKey(value: BusinessProfile) { return JSON.stringify(PROFILE_FIELDS.map(field => value[field])); }
