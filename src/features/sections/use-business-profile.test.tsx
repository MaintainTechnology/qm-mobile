import { act, renderHook, waitFor } from '@testing-library/react-native';
import { editProfile, mockProfileApi, mockProfileToken, profileBMe, profileFailures, profileNativeStorage as SecureStore, profileRequests, profileSecure, profileStore, resetProfileHarness, setProfileIdentity, setProfileServer, setupProfile } from './business-profile-test-harness';
import { useBusinessProfile } from './use-business-profile';
import { profileBase, profileDeferred, profileMe, profileScope, PROFILE_REV_A } from './business-profile-test-fixture';
import { loadProfileReceipt } from './business-profile-write';

beforeEach(resetProfileHarness);
it('hydrates the observed revision from the owned snapshot without posting', async () => {
  const hook = await setupProfile(); expect(hook.result.current.baselineRevision).toBe(PROFILE_REV_A);
  expect(mockProfileApi).toHaveBeenCalledWith('/api/tenant/business-profile', expect.anything(), { token: 'token:user_A:session_A' });
  expect(profileRequests).toHaveLength(0);
});
it('restores dirty fields and their baseline without account refetch overwriting them', async () => {
  await profileStore().save({ baseline: profileBase, value: { ...profileBase, business_name: 'Unsaved Co' }, baselineRevision: PROFILE_REV_A });
  const hook = await setupProfile(); expect(hook.result.current.value.business_name).toBe('Unsaved Co'); expect(mockProfileApi).not.toHaveBeenCalled();
  setProfileServer({ business_address: 'Updated elsewhere' }); await act(() => hook.result.current.refresh());
  expect(hook.result.current.value.business_name).toBe('Unsaved Co'); expect(hook.result.current.latest?.value.business_address).toBe('Updated elsewhere'); expect(profileRequests).toHaveLength(0);
});
it('does not overwrite an unread copy and restores it after explicit hydration retry', async () => {
  await profileStore().save({ baseline: profileBase, value: { ...profileBase, abn: '123' }, baselineRevision: PROFILE_REV_A });
  const read = jest.mocked(SecureStore.getItemAsync);
  read.mockImplementation(async key => { if (key.endsWith('.manifest')) throw new Error('Locked'); return profileSecure.get(key) ?? null; });
  const hook = await renderHook(() => useBusinessProfile(profileMe));
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  const before = [...profileSecure.entries()]; await act(() => hook.result.current.edit({ business_name: 'Overwrite' }));
  expect([...profileSecure.entries()]).toEqual(before); expect(hook.result.current.loaded).toBe(false);
  read.mockImplementation(async key => profileSecure.get(key) ?? null);
  await act(() => hook.result.current.retryStorage()); await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  expect(hook.result.current.value.abn).toBe('123');
});
it('retains fields after storage failure and blocks remote save until the latest encrypted copy succeeds', async () => {
  const hook = await setupProfile(); jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('Storage full'));
  await act(() => hook.result.current.edit({ business_name: 'Keep me' })); await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(hook.result.current.stored).toBe(false); const reads = mockProfileApi.mock.calls.length;
  await act(() => hook.result.current.save()); expect(mockProfileApi).toHaveBeenCalledTimes(reads); expect(profileRequests).toHaveLength(0);
  await act(() => hook.result.current.retryStorage()); await waitFor(() => expect(hook.result.current.stored).toBe(true));
  expect(hook.result.current.value.business_name).toBe('Keep me'); expect(hook.result.current.error).toBeNull();
});
it('checks the observed revision before PATCH and refuses a conflicting same-field update', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'My edit' });
  setProfileServer({ business_name: 'Another device' }); await act(() => hook.result.current.save());
  expect(profileRequests).toHaveLength(0); expect(hook.result.current.value.business_name).toBe('My edit');
  expect(String(hook.result.current.error)).toContain('changed'); expect(hook.result.current.latest?.value.business_name).toBe('Another device');
});
it('saves only the changed business contact field with request ID and observed revision, without touching Clerk credentials', async () => {
  const hook = await setupProfile(); await editProfile(hook, { owner_email: 'new@example.test' }); await act(() => hook.result.current.save());
  expect(profileRequests).toEqual([expect.objectContaining({ requestId: expect.any(String), expectedRevision: PROFILE_REV_A, patch: { owner_email: 'new@example.test' } })]);
  expect(hook.result.current.dirty).toBe(false); expect(hook.result.current.value.owner_email).toBe('new@example.test');
  expect(await profileStore().load()).toBeNull(); expect(await loadProfileReceipt(profileScope)).toBeNull();
});
it('uses GET-only exact receipt checking, retaining not_found until a deliberate same-ID retry', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'Keep exact input' }); profileFailures.beforeCommit = true;
  await act(() => hook.result.current.save()); const request = profileRequests[0]!; expect(await loadProfileReceipt(profileScope)).toMatchObject({ status: 'unknown' });
  const count = mockProfileApi.mock.calls.length; await act(() => hook.result.current.refresh(true));
  expect(profileRequests).toHaveLength(1); expect(mockProfileApi.mock.calls.slice(count).map(call => call[0])).toEqual([`/api/tenant/business-profile?requestId=${request.requestId}`]);
  expect(await loadProfileReceipt(profileScope)).toMatchObject({ status: 'unknown' });
  await act(() => hook.result.current.save()); expect(profileRequests).toHaveLength(2); expect(profileRequests[1]).toEqual(request);
});
it('does not dispatch an old save after an account switch during token acquisition', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'Private A' }); const pending = profileDeferred<string>();
  mockProfileToken.mockReturnValueOnce(pending.promise); let saving!: Promise<void>;
  await act(() => { saving = hook.result.current.save(); }); setProfileIdentity('user_B', 'session_B'); await hook.rerender({ value: profileBMe });
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  await act(async () => { pending.resolve('token:user_A:session_A'); await saving; });
  expect(profileRequests).toHaveLength(0); expect(hook.result.current.value.business_name).toBe('Business B');
});
