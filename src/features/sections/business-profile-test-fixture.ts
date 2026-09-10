import type { TenantMe } from '@/lib/tenant';
import { profileFromTenant } from './business-profile';
import { profileWriteHash } from './business-profile-write';
import type { ProfileCompletion, ProfileRequest, ProfileSnapshot } from './business-profile-contract';

export const PROFILE_TENANT_A = '10000000-0000-4000-8000-000000000001';
export const PROFILE_TENANT_B = '10000000-0000-4000-8000-000000000002';
export const PROFILE_REV_A = '20000000-0000-4000-8000-000000000001';
export const PROFILE_REV_B = '20000000-0000-4000-8000-000000000002';
export const PROFILE_REV_C = '20000000-0000-4000-8000-000000000003';
export const profileScope = { userId: 'user_A', tenantId: PROFILE_TENANT_A };
export const profileTenant = { id: PROFILE_TENANT_A, business_name: 'Original business', owner_first_name: 'Alex',
  owner_email: 'office@example.invalid', owner_mobile: '0412345678', state: 'NSW', abn: '', sms_estimator_enabled: false,
  business_address: '1 Example Street' };
export const profileMe = { tenant: profileTenant, quotes: [] } as unknown as TenantMe;
export const profileBase = profileFromTenant(profileTenant);
export const profileSnapshot = (overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot => ({
  ok: true, ...profileScope, revision: PROFILE_REV_A, profile: { ...profileBase }, ...overrides,
});
export async function profileCompletion(request: ProfileRequest, overrides: Partial<ProfileCompletion> = {}): Promise<ProfileCompletion> {
  return { ok: true, ...profileScope, requestId: request.requestId, status: 'complete', expectedRevision: request.expectedRevision,
    inputHash: await profileWriteHash(request.expectedRevision, request.patch), revision: PROFILE_REV_B, ...overrides };
}
export const profileDeferred = <T,>() => {
  let resolve!:(value:T)=>void; let reject!:(reason: unknown)=>void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
