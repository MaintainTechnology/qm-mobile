import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MEDIA_TENANT, mediaHttp, mediaSecure, mediaWire, mockMediaApi, mockMediaPicker, mockMediaReader, mockMediaToken, resetMediaHarness, SecureStore, setMediaAuth, setMediaRevision } from './business-media-test-harness';
import { MEDIA_REV_C, MEDIA_TENANT_B, mediaBytes, mediaDeferred, mediaScope, mediaSelection } from './business-media-test-fixture';
import { loadMediaReceipt } from './business-media-write';
import { useBusinessMedia } from './use-business-media';

beforeEach(resetMediaHarness);
async function setup() {
  const hook = await renderHook(() => useBusinessMedia(MEDIA_TENANT));
  await waitFor(() => expect(hook.result.current.loaded && !hook.result.current.busy).toBe(true)); return hook;
}
it('loads current owned media with GET only and confirms explicit immutable image upload', async () => {
  const hook = await setup(); expect(mediaWire.posts).toHaveLength(0);
  await act(() => hook.result.current.pick('logo')); expect(hook.result.current.selection?.image).toEqual(mediaSelection);
  await act(() => hook.result.current.save()); expect(mediaWire.commits).toBe(1);
  expect(mediaWire.posts[0]?.dataBase64).toBe(mediaSelection.dataBase64); expect(hook.result.current.selection).toBeNull();
  expect(hook.result.current.receipt).toBeNull(); expect(hook.result.current.snapshot?.media.logoUrl).toContain('/business-media/logo/');
});
it('preserves selected and current image on cancelled/failed picker and byte-reader failure', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo')); const selected = hook.result.current.selection;
  mockMediaPicker.mockResolvedValueOnce({ kind: 'cancelled' }); await act(() => hook.result.current.pick('photo'));
  expect(hook.result.current.selection).toEqual(selected);
  mockMediaPicker.mockResolvedValueOnce({ kind: 'failed',message: 'Picker unavailable' }); await act(() => hook.result.current.pick('photo'));
  expect(hook.result.current.selection).toEqual(selected);
  mockMediaReader.mockRejectedValueOnce(new Error('Read failed')); await act(() => hook.result.current.pick('photo'));
  expect(hook.result.current.selection).toEqual(selected); expect(hook.result.current.snapshot?.media.logoUrl).toBeNull(); expect(mediaWire.posts).toHaveLength(0);
});
it('retains absent-operation unknown across remount, then cancels without image bytes', async () => {
  const first = await setup(); await act(() => first.result.current.pick('logo'));
  mediaWire.failBeforeClaim = true; await act(() => first.result.current.save()); const identity = mediaWire.posts[0]!.identity;
  expect(first.result.current.receipt?.status).toBe('unknown'); await first.unmount();
  const second = await setup(); expect(second.result.current.selection).toBeNull(); expect(second.result.current.receipt?.identity).toEqual(identity);
  expect(mediaWire.posts).toHaveLength(1); await act(() => second.result.current.cancel());
  expect(mediaWire.cancellations).toEqual([identity]); expect(mediaWire.operations.get(identity.requestId)?.status).toBe('cancelled');
  expect(second.result.current.receipt).toBeNull(); expect(mediaWire.commits).toBe(0);
  const late = await mediaHttp('/api/tenant/business-media',undefined,{ method: 'POST',body: { ...identity,dataBase64: mediaSelection.dataBase64 } });
  expect(late.operation?.status).toBe('cancelled'); expect(mediaWire.commits).toBe(0);
});
it('recovers a lost completion through GET only without overwriting a newer current image', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo'));
  mediaWire.failAfterCommit = true; await act(() => hook.result.current.save()); expect(mediaWire.commits).toBe(1);
  setMediaRevision(); mediaWire.current = { ...mediaWire.current,media: { ...mediaWire.current.media,logoUrl: null,logoPath: null } };
  await act(() => hook.result.current.refresh()); expect(mediaWire.posts).toHaveLength(1);
  expect(hook.result.current.receipt).toBeNull(); expect(hook.result.current.snapshot?.revision).toBe(MEDIA_REV_C);
  expect(hook.result.current.snapshot?.media.logoUrl).toBeNull();
});
it('retains terminal receipt and selection when local acknowledgement silently fails', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo'));
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValueOnce(); await act(() => hook.result.current.save());
  expect(hook.result.current.receipt?.status).toBe('complete'); expect(hook.result.current.selection).not.toBeNull();
  await act(() => hook.result.current.refresh()); expect(hook.result.current.receipt).toBeNull(); expect(mediaWire.posts).toHaveLength(1);
});
it('keeps the original review revision until the user explicitly chooses the current version', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo')); const original = hook.result.current.selection;
  setMediaRevision(); await act(() => hook.result.current.refresh()); expect(hook.result.current.needsReview).toBe(true);
  expect(hook.result.current.selection).toEqual(original); expect(mediaWire.posts).toHaveLength(0);
  await act(() => hook.result.current.rebase()); expect(hook.result.current.needsReview).toBe(false);
  await act(() => hook.result.current.save()); expect(mediaWire.posts[0]?.identity.expectedRevision).toBe(MEDIA_REV_C);
});
it('does not borrow an old account token after A to B to A', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo'));
  const token = mediaDeferred<string | null>(); mockMediaToken.mockReturnValueOnce(token.promise);
  let saving!: Promise<void>; await act(() => { saving = hook.result.current.save(); });
  setMediaAuth('user_media_b','session_b'); mediaWire.current = { ...mediaWire.current,userId: 'user_media_b' }; await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  setMediaAuth(mediaScope.userId,'session_a2'); mediaWire.current = { ...mediaWire.current,userId: mediaScope.userId }; await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  await act(async () => { token.resolve('late-old-token'); await saving; });
  expect(mockMediaApi.mock.calls.some(([, , options]) => options?.token === 'late-old-token')).toBe(false); expect(mediaWire.posts).toHaveLength(0);
});
it('discards a late picker callback after account replacement', async () => {
  const hook = await setup(), picker = mediaDeferred<Awaited<ReturnType<typeof mockMediaPicker>>>(); mockMediaPicker.mockReturnValueOnce(picker.promise);
  let picking!: Promise<void>; await act(() => { picking = hook.result.current.pick('logo'); });
  setMediaAuth('user_media_b','session_b'); mediaWire.current = { ...mediaWire.current,userId: 'user_media_b' }; await hook.rerender(undefined);
  await act(async () => { picker.resolve({ kind: 'selected',libraryAccess: 'all',hasUnknownSize: false,
    files: [{ uri: 'file:///private/old.png',name: 'old.png',type: 'image/png',size: mediaBytes.length,width: 1,height: 1 }] }); await picking; });
  expect(hook.result.current.selection).toBeNull(); expect(mockMediaReader).not.toHaveBeenCalled();
});
it('discards a late byte-read result after account replacement', async () => {
  const hook = await setup(), read = mediaDeferred<typeof mediaSelection>(); mockMediaReader.mockReturnValueOnce(read.promise);
  let picking!: Promise<void>; await act(() => { picking = hook.result.current.pick('logo'); });
  await waitFor(() => expect(mockMediaReader).toHaveBeenCalledTimes(1));
  setMediaAuth('user_media_b','session_b'); mediaWire.current = { ...mediaWire.current,userId: 'user_media_b' }; await hook.rerender(undefined);
  await act(async () => { read.resolve(mediaSelection); await picking; });
  expect(hook.result.current.selection).toBeNull(); expect(mediaWire.posts).toHaveLength(0);
});
it('ignores old-account body completion and retains the old unknown reference for owned recovery', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo'));
  const body = mediaDeferred<Awaited<ReturnType<typeof mediaHttp>>>();
  mockMediaApi.mockImplementation(async (path,schema,options) => options?.method === 'POST' ? body.promise : mediaHttp(path,schema,options));
  let saving!: Promise<void>; await act(() => { saving = hook.result.current.save(); });
  await waitFor(() => expect(mockMediaApi.mock.calls.some(([, , options]) => options?.method === 'POST')).toBe(true));
  const posted = mockMediaApi.mock.calls.find(([, , options]) => options?.method === 'POST')![2]!.body;
  const response = await mediaHttp('/api/tenant/business-media',undefined,{ method: 'POST',body: posted });
  setMediaAuth('user_media_b','session_b'); mediaWire.current = { ...mediaWire.current,userId: 'user_media_b' }; await hook.rerender(undefined);
  await act(async () => { body.resolve(response); await saving; });
  expect(hook.result.current.receipt).toBeNull(); expect(hook.result.current.selection).toBeNull();
  expect(await loadMediaReceipt(mediaScope)).toMatchObject({ status: 'unknown' });
});
it('refuses foreign current responses without exposing their media or starting a write', async () => {
  mediaWire.current = { ...mediaWire.current,tenantId: MEDIA_TENANT_B };
  const hook = await renderHook(() => useBusinessMedia(MEDIA_TENANT)); await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(hook.result.current.loaded).toBe(false); expect(hook.result.current.snapshot).toBeNull(); expect(mediaWire.posts).toHaveLength(0);
});
it('does not let an old cancel callback cancel a replacement operation', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo')); mediaWire.failBeforeClaim = true; await act(() => hook.result.current.save());
  const oldCancel = hook.result.current.cancel; await act(() => hook.result.current.cancel());
  await act(() => hook.result.current.pick('photo')); mediaWire.failBeforeClaim = true; await act(() => hook.result.current.save());
  const replacement = hook.result.current.receipt; await act(() => oldCancel());
  expect(hook.result.current.receipt).toEqual(replacement); expect(mediaWire.cancellations).toHaveLength(1);
});
it('does not let old discard or rebase callbacks change a newer selection/review', async () => {
  const hook = await setup(); await act(() => hook.result.current.pick('logo')); const discard = hook.result.current.discard;
  await act(() => hook.result.current.pick('photo')); const selected = hook.result.current.selection; await act(() => discard());
  expect(hook.result.current.selection).toEqual(selected);
  setMediaRevision(); await act(() => hook.result.current.refresh()); const rebase = hook.result.current.rebase;
  setMediaRevision(MEDIA_TENANT_B); await act(() => hook.result.current.refresh()); await act(() => rebase());
  expect(hook.result.current.needsReview).toBe(true); expect(hook.result.current.selection?.expectedRevision).toBe(selected?.expectedRevision);
  expect(mediaSecure.size).toBe(0);
});
