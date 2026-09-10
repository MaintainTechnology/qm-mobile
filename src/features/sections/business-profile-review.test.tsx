/** Lost-update regressions remain strict: a completed old operation cannot
 * overwrite a newer account value, and same-batch edits must both survive. */
import { createHash } from 'node:crypto';
import { act, waitFor } from '@testing-library/react-native';
import { editProfile, mockProfileApi, mockProfileToken, profileBMe, profileFailures, profileMutations, profileNativeStorage as SecureStore, profileRequests, profileSecure, profileServers,
  profileStore, resetProfileHarness, setProfileIdentity, setProfileServer, setupProfile } from './business-profile-test-harness';
import { loadProfileReceipt } from './business-profile-write';
import { profileBase, profileDeferred, profileMe, profileScope, PROFILE_REV_A, PROFILE_REV_C } from './business-profile-test-fixture';

beforeEach(resetProfileHarness);
it('preserves both fields edited in the same React batch in memory and encrypted storage', async () => {
  const hook = await setupProfile();
  await act(() => { const edit = hook.result.current.edit; edit({ business_name: 'My business edit' }); edit({ state: 'VIC' }); });
  await waitFor(() => expect(hook.result.current.stored).toBe(true));
  expect(hook.result.current.value).toMatchObject({ business_name: 'My business edit', state: 'VIC' });
  expect(await profileStore().load()).toMatchObject({ value: { value: { business_name: 'My business edit', state: 'VIC' } } });
});
it('does not retry an unknown update over a newer business value; exact operation recovery retires it safely', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'My earlier edit' }); profileFailures.afterCommit = true;
  await act(() => hook.result.current.save()); expect(profileRequests.map(request => request.patch)).toEqual([{ business_name: 'My earlier edit' }]);
  expect(await loadProfileReceipt(profileScope)).toMatchObject({ status: 'unknown' });
  setProfileServer({ business_name: 'Newer edit from another device' }, PROFILE_REV_C);
  const before = mockProfileApi.mock.calls.length; await act(() => hook.result.current.save());
  expect(profileRequests).toHaveLength(1); expect(profileMutations).toHaveLength(1);
  expect(profileServers.get('user_A')?.profile.business_name).toBe('Newer edit from another device');
  expect(hook.result.current.value.business_name).toBe('Newer edit from another device');
  expect(mockProfileApi.mock.calls[before]?.[0]).toBe(`/api/tenant/business-profile?requestId=${profileRequests[0]!.requestId}`);
  expect(await loadProfileReceipt(profileScope)).toBeNull();
});
it('rejects changed retries after not_found without creating another operation or HTTP write', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'Original request' }); profileFailures.beforeCommit = true;
  await act(() => hook.result.current.save()); const receipt = await loadProfileReceipt(profileScope);
  await editProfile(hook, { business_name: 'Different request' }); await act(() => hook.result.current.save());
  expect(profileRequests).toHaveLength(1); expect(profileMutations).toHaveLength(0);
  expect(await loadProfileReceipt(profileScope)).toEqual(receipt); expect(String(hook.result.current.error)).toMatch(/exact original/);
  expect(hook.result.current.value.business_name).toBe('Different request');
});
it('retains newer local fields after exact recovery rather than replacing them with current server values', async () => {
  const hook = await setupProfile(); await editProfile(hook, { owner_email: 'accepted@example.test' }); profileFailures.afterCommit = true;
  await act(() => hook.result.current.save()); await editProfile(hook, { business_name: 'Newer unsaved name' });
  await act(() => hook.result.current.refresh());
  expect(profileRequests).toHaveLength(1); expect(hook.result.current.value.business_name).toBe('Newer unsaved name');
  expect(hook.result.current.dirty).toBe(true); expect(await loadProfileReceipt(profileScope)).toBeNull();
  expect(hook.result.current.latest).not.toBeNull();
});
it('requires explicit rebase and preserves the latest untouched business fields', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'My business edit' });
  setProfileServer({ state: 'VIC', business_address: 'New current address' }); await act(() => hook.result.current.refresh());
  expect(hook.result.current.value.state).toBe('NSW'); expect(profileRequests).toHaveLength(0);
  await act(() => hook.result.current.rebase()); await waitFor(() => expect(hook.result.current.stored).toBe(true));
  expect(hook.result.current.value).toMatchObject({ business_name: 'My business edit', state: 'VIC', business_address: 'New current address' });
  await act(() => hook.result.current.save()); expect(profileRequests[0]?.patch).toEqual({ business_name: 'My business edit' });
});
it('cannot reactivate an old token callback after account A to B to A', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'Private A' }); const pending = profileDeferred<string>();
  mockProfileToken.mockReturnValueOnce(pending.promise); let saving!: Promise<void>;
  await act(() => { saving = hook.result.current.save(); }); setProfileIdentity('user_B', 'session_B'); await hook.rerender({ value: profileBMe });
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  setProfileIdentity('user_A', 'session_A'); await hook.rerender({ value: profileMe }); await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  await act(async () => { pending.resolve('token:user_A:session_A'); await saving; });
  expect(profileRequests).toHaveLength(0); expect(hook.result.current.value.business_name).toBe('Private A');
});
it('keeps an original-value revert guarded until the earlier pending edit and final removal both finish', async () => {
  const hook = await setupProfile(); const pending = profileDeferred<void>();
  jest.mocked(SecureStore.setItemAsync).mockImplementationOnce(async (key, raw) => { await pending.promise; profileSecure.set(key, raw); });
  await act(() => hook.result.current.edit({ business_name: 'Temporary B' }));
  await waitFor(() => expect(hook.result.current.pending).toBeGreaterThan(0));
  await act(() => hook.result.current.edit({ business_name: profileBase.business_name }));
  expect(hook.result.current.stored).toBe(false);
  await act(async () => { pending.resolve(); }); await waitFor(() => expect(hook.result.current.stored).toBe(true));
  expect(await profileStore().load()).toBeNull(); expect(hook.result.current.value.business_name).toBe(profileBase.business_name);
});
it('reconstructs an exact original retry after seven-day copy expiry without expiring its unknown operation', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: `  ${profileBase.business_name}  `, owner_email: 'retry@example.test' });
  profileFailures.beforeCommit = true; await act(() => hook.result.current.save()); const first = profileRequests[0]!;
  expect(await loadProfileReceipt(profileScope)).toMatchObject({ status: 'unknown' }); await hook.unmount();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * 86_400_000);
  try {
    expect(await profileStore().load()).toBeNull(); expect(await loadProfileReceipt(profileScope)).toMatchObject({ status: 'unknown' });
    const reopened = await setupProfile(); await editProfile(reopened, { owner_email: 'retry@example.test' });
    await act(() => reopened.result.current.save());
    expect(profileRequests).toHaveLength(2); expect(profileRequests[1]).toEqual(first); expect(profileMutations).toHaveLength(1);
    expect(await loadProfileReceipt(profileScope)).toBeNull(); await reopened.unmount();
  } finally { clock.mockRestore(); }
});
it('never reconciles legacy v1 unknown writes merely because current fields match', async () => {
  const id = createHash('sha256').update(JSON.stringify([profileScope.userId, profileScope.tenantId])).digest('hex');
  const legacy = { version: 1, hash: 'a'.repeat(64), fields: ['business_name'] };
  profileSecure.set(`quotemax.business-write.v1.${id}`, JSON.stringify(legacy));
  await profileStore().save({ baseline: profileBase, value: { ...profileBase, business_name: 'My older update' }, baselineRevision: PROFILE_REV_A });
  const hook = await setupProfile(); const reads = mockProfileApi.mock.calls.length;
  await act(() => hook.result.current.refresh(true)); await act(() => hook.result.current.save());
  expect(mockProfileApi).toHaveBeenCalledTimes(reads); expect(profileRequests).toHaveLength(0);
  expect(await loadProfileReceipt(profileScope)).toEqual(legacy); expect(hook.result.current.value.business_name).toBe('My older update');
});
it('recovers an exact email rejection by GET only, keeps the edit and requires review before a different update', async () => {
  const hook = await setupProfile(); await editProfile(hook, { owner_email: 'taken@example.test' });
  profileFailures.rejectNextEmail = true; profileFailures.afterCommit = true; await act(() => hook.result.current.save());
  expect(await loadProfileReceipt(profileScope)).toMatchObject({ status: 'unknown' }); const first = profileRequests[0]!;
  await act(() => hook.result.current.refresh());
  expect(profileRequests).toHaveLength(1); expect(profileMutations).toHaveLength(0); expect(await loadProfileReceipt(profileScope)).toBeNull();
  expect(hook.result.current.value.owner_email).toBe('taken@example.test'); expect(hook.result.current.error).toMatchObject({ field: 'owner_email' });
  expect(hook.result.current.latest).not.toBeNull();
  await editProfile(hook, { owner_email: 'available@example.test' }); await act(() => hook.result.current.rebase());
  await waitFor(() => expect(hook.result.current.stored).toBe(true)); await act(() => hook.result.current.save());
  expect(profileRequests).toHaveLength(2); expect(profileMutations).toHaveLength(1); expect(profileRequests[1]!.requestId).not.toBe(first.requestId);
  expect(profileRequests[1]!.patch).toEqual({ owner_email: 'available@example.test' });
});
it('preserves a newer value when another writer wins after the preflight revision read but before PATCH', async () => {
  const hook = await setupProfile(); await editProfile(hook, { business_name: 'My losing edit' });
  const transport = mockProfileApi.getMockImplementation()!;
  mockProfileApi.mockImplementation(async (...args: unknown[]) => {
    const options = args[2] as { method?: string } | undefined;
    if (options?.method === 'PATCH') setProfileServer({ business_name: 'Concurrent winner', business_address: 'Concurrent address' }, PROFILE_REV_C);
    return transport(...args);
  });
  await act(() => hook.result.current.save());
  expect(profileRequests).toHaveLength(1); expect(profileRequests[0]!.expectedRevision).toBe(PROFILE_REV_A); expect(profileMutations).toHaveLength(0);
  expect(hook.result.current.value.business_name).toBe('My losing edit');
  expect(hook.result.current.latest?.value).toMatchObject({ business_name: 'Concurrent winner', business_address: 'Concurrent address' });
  expect(String(hook.result.current.error)).toContain('changed before your update');
  expect(await loadProfileReceipt(profileScope)).toBeNull();
  expect(profileServers.get('user_A')?.profile.business_name).toBe('Concurrent winner');
});
