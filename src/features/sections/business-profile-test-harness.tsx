/** Real C13 hook, writer and encrypted working-copy adapter. Only native
 * storage/crypto and the HTTP transport are isolated; no live tenant writes. */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@/lib/api';
import { clearAllWorkingDrafts, createWorkingDraftStore } from '@/lib/working-draft-storage';
import { themes as mockThemes } from '@/lib/theme';
import { useBusinessProfile } from './use-business-profile';
import { BusinessDraftSchema, type BusinessProfile } from './business-profile';
import { ProfileRequestSchema, type ProfileTerminal, type ProfileRequest, type ProfileSnapshot } from './business-profile-contract';
import { profileCompletion, profileMe, profileScope, profileSnapshot, PROFILE_REV_A, PROFILE_REV_B, PROFILE_TENANT_A, PROFILE_TENANT_B } from './business-profile-test-fixture';
import type { TenantMe } from '@/lib/tenant';

let mockUser = 'user_A', mockSession = 'session_A';
export const mockProfileToken = jest.fn(async () => `token:${mockUser}:${mockSession}`);
export const mockProfileApi = jest.fn();
export const mockProfileInvalidate = jest.fn();
export const mockProfilePrevent = jest.fn();
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ userId: mockUser, sessionId: mockSession, getToken: mockProfileToken }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockProfileInvalidate }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: (...args: unknown[]) => mockProfilePrevent(...args) }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: mockThemes.dark }) }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: (...args: unknown[]) => mockProfileApi(...args) }));
jest.mock('@/lib/tenant', () => ({ TENANT_ME_KEY: ['tenant', 'me'] }));
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_: string, value: string) => crypto.createHash('sha256').update(value).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

export const profileSecure = new Map<string, string>();
// Export the installed mock itself so callers cannot retain a native module
// loaded before this harness registered the transport/storage boundaries.
export const profileNativeStorage = SecureStore;
export const profileOperations = new Map<string, ProfileTerminal>();
export const profileRequests: ProfileRequest[] = [];
export const profileMutations: ProfileRequest[] = [];
export const profileServers = new Map<string, ProfileSnapshot>();
export const profileFailures = { beforeCommit: false, afterCommit: false, rejectNextEmail: false };
export const profileStore = () => createWorkingDraftStore({ ...profileScope, purpose: 'business-profile-v1', recordId: 'profile' }, BusinessDraftSchema);
export function setProfileIdentity(userId: string, sessionId: string) { mockUser = userId; mockSession = sessionId; }
export const profileBMe = { tenant: { ...profileMe.tenant, id: PROFILE_TENANT_B }, quotes: [] } as unknown as TenantMe;
export function setProfileServer(value: Partial<BusinessProfile>, revision = PROFILE_REV_B, userId = 'user_A') {
  const existing = profileServers.get(userId)!;
  profileServers.set(userId, { ...existing, revision, profile: { ...existing.profile, ...value } });
}
export async function resetProfileHarness() {
  mockUser = 'user_A'; mockSession = 'session_A'; profileSecure.clear();
  jest.mocked(SecureStore.getItemAsync).mockReset().mockImplementation(async key => profileSecure.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockReset().mockImplementation(async (key, raw) => { profileSecure.set(key, raw); });
  jest.mocked(SecureStore.deleteItemAsync).mockReset().mockImplementation(async key => { profileSecure.delete(key); });
  await clearAllWorkingDrafts();
  profileOperations.clear(); profileRequests.length = 0; profileMutations.length = 0;
  profileFailures.beforeCommit = false; profileFailures.afterCommit = false; profileFailures.rejectNextEmail = false;
  profileServers.clear(); profileServers.set('user_A', profileSnapshot());
  profileServers.set('user_B', profileSnapshot({ userId: 'user_B', tenantId: PROFILE_TENANT_B, profile: { ...profileSnapshot().profile, business_name: 'Business B' } }));
  mockProfileInvalidate.mockClear(); mockProfilePrevent.mockClear();
  mockProfileToken.mockReset().mockImplementation(async () => `token:${mockUser}:${mockSession}`);
  mockProfileApi.mockReset().mockImplementation(async (path: string, schema: { parse(value: unknown): unknown }, options?: { method?: string; body?: unknown; token?: string }) => {
    const userId = options?.token?.split(':')[1]; const current = profileServers.get(userId ?? '');
    if (!current) throw new ApiError('Wrong owner', 403, path);
    expect(path.split('?')[0]).toBe('/api/tenant/business-profile');
    if (options?.method === 'PATCH') {
      const request = ProfileRequestSchema.parse(options.body); profileRequests.push(request);
      if (profileFailures.beforeCommit) { profileFailures.beforeCommit = false; throw new TypeError('Lost before commit'); }
      const existing = profileOperations.get(request.requestId);
      if (existing) {
        const candidate = await profileCompletion(request, { userId: current.userId, tenantId: current.tenantId, revision: existing.revision });
        if (existing.inputHash !== candidate.inputHash) throw new ApiError('Changed request', 409, path);
        return schema.parse(existing);
      }
      if (request.expectedRevision !== current.revision || profileFailures.rejectNextEmail) {
        const rejection: ProfileTerminal = { ...await profileCompletion(request, { userId: current.userId, tenantId: current.tenantId, revision: current.revision }),
          status: 'rejected', errorCode: request.expectedRevision !== current.revision ? 'business_profile_revision_conflict' : 'business_profile_email_conflict' };
        profileFailures.rejectNextEmail = false; profileOperations.set(request.requestId, rejection);
        if (profileFailures.afterCommit) { profileFailures.afterCommit = false; throw new TypeError('Rejection acknowledgement lost'); }
        return schema.parse(rejection);
      }
      const revision = `20000000-0000-4000-8000-${String(profileMutations.length + 2).padStart(12, '0')}`;
      const completed = await profileCompletion(request, { userId: current.userId, tenantId: current.tenantId, revision });
      profileMutations.push(request); profileOperations.set(request.requestId, completed);
      profileServers.set(userId!, { ...current, revision, profile: { ...current.profile, ...request.patch } });
      if (profileFailures.afterCommit) { profileFailures.afterCommit = false; throw new TypeError('Acknowledgement lost after commit'); }
      return schema.parse(completed);
    }
    const requestId = new URL(path, 'https://fixture.invalid').searchParams.get('requestId');
    if (requestId) return schema.parse(profileOperations.get(requestId) ?? { ok: true, userId: current.userId, tenantId: current.tenantId, requestId, status: 'not_found' });
    return schema.parse(current);
  });
}
export async function setupProfile(me: TenantMe = profileMe) {
  const hook = await renderHook<ReturnType<typeof useBusinessProfile>, { value: TenantMe }>(({ value }) => useBusinessProfile(value), { initialProps: { value: me } });
  await waitFor(() => expect(hook.result.current.loaded).toBe(true)); return hook;
}
export async function editProfile(hook: Awaited<ReturnType<typeof setupProfile>>, patch: Partial<BusinessProfile>) {
  await act(() => hook.result.current.edit(patch));
  await waitFor(() => expect(hook.result.current.stored).toBe(true));
}
export const profileInitialRevision = PROFILE_REV_A;
export const profileInitialTenant = PROFILE_TENANT_A;
