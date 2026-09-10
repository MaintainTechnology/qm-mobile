import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFollowupDrafts } from './use-followup-drafts';
import type { FollowupDraft, FollowupItem } from './followups';

const mockCopies = new Map<string, FollowupDraft>();
const mockLoad = jest.fn();
const mockSave = jest.fn();
jest.mock('@/lib/working-draft-storage', () => ({
  createWorkingDraftStore: (scope: unknown) => {
    const key = JSON.stringify(scope);
    return { load: () => mockLoad(key), save: (value: FollowupDraft) => mockSave(key, value), remove: async () => { mockCopies.delete(key); } };
  },
}));
const quote: FollowupItem = { kind: 'quote', quote_id: 'record-a' };
const lead: FollowupItem = { kind: 'lead', conversation_id: 'record-a' };
const scope = { userId: 'owner-a', tenantId: 'tenant-a' };
beforeEach(() => {
  mockCopies.clear();
  mockLoad.mockReset().mockImplementation(async key => mockCopies.has(key) ? { value: mockCopies.get(key) } : null);
  mockSave.mockReset().mockImplementation(async (key, value) => { mockCopies.set(key, value); });
});
async function ready(hook: Awaited<ReturnType<typeof renderHook<ReturnType<typeof useFollowupDrafts>, unknown>>>, item = quote) {
  await act(() => hook.result.current.ensure(item));
  await waitFor(() => expect(hook.result.current.state(item).ready).toBe(true));
}

it('restores exact text including an intentional empty composer after remount, without a server write', async () => {
  const first = await renderHook(() => useFollowupDrafts(scope));
  await ready(first);
  await act(() => first.result.current.update(quote, { text: '', logNote: 'Call Friday', outcome: 'wants_callback' }));
  await waitFor(() => expect(first.result.current.unsaved).toBe(false));
  await first.unmount();
  const reopened = await renderHook(() => useFollowupDrafts(scope));
  await ready(reopened);
  expect(reopened.result.current.state(quote).value).toEqual({ text: '', logNote: 'Call Friday', outcome: 'wants_callback' });
  expect(mockSave).toHaveBeenCalledTimes(1);
});

it('separates quote/lead identity and user/tenant scopes even with identical record ids', async () => {
  const first = await renderHook(() => useFollowupDrafts(scope));
  await ready(first);
  await act(() => first.result.current.update(quote, { text: 'Private A' }));
  await waitFor(() => expect(first.result.current.unsaved).toBe(false));
  await ready(first, lead);
  expect(first.result.current.state(lead).value.text).toBeNull();
  await first.unmount();
  for (const identity of [{ ...scope, userId: 'owner-b' }, { ...scope, tenantId: 'tenant-b' }]) {
    const next = await renderHook(() => useFollowupDrafts(identity));
    await ready(next);
    expect(next.result.current.state(quote).value.text).toBeNull();
    await next.unmount();
  }
});

it('retains edits and blocks leaving after a storage failure, then retries the latest version', async () => {
  const hook = await renderHook(() => useFollowupDrafts(scope));
  await ready(hook);
  mockSave.mockRejectedValueOnce(new Error('Device locked'));
  await act(() => hook.result.current.update(quote, { text: 'Retain this' }));
  await waitFor(() => expect(hook.result.current.error).toBe('Device locked'));
  expect(hook.result.current.unsaved).toBe(true);
  expect(hook.result.current.state(quote).value.text).toBe('Retain this');
  await act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.unsaved).toBe(false));
  expect(hook.result.current.error).toBeNull();
});

it('does not overwrite an unread working copy when load fails, and permits explicit retry', async () => {
  mockLoad.mockRejectedValueOnce(new Error('Read unavailable'));
  const hook = await renderHook(() => useFollowupDrafts(scope));
  await act(() => hook.result.current.ensure(quote));
  await waitFor(() => expect(hook.result.current.error).toBe('Read unavailable'));
  await act(() => hook.result.current.update(quote, { text: 'Unsafe overwrite' }));
  expect(mockSave).not.toHaveBeenCalled();
  await act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.state(quote).ready).toBe(true));
});

it('an older save completion cannot mark the newest edit durable or replace its content', async () => {
  const complete: (() => void)[] = [];
  mockSave.mockImplementation(() => new Promise<void>(resolve => complete.push(resolve)));
  const hook = await renderHook(() => useFollowupDrafts(scope));
  await ready(hook);
  await act(() => {
    hook.result.current.update(quote, { text: 'First' });
    hook.result.current.update(quote, { text: 'Second' });
  });
  expect(complete).toHaveLength(2);
  await act(async () => complete[0]!());
  expect(hook.result.current.unsaved).toBe(true);
  expect(hook.result.current.state(quote).value.text).toBe('Second');
  await act(async () => complete[1]!());
  expect(hook.result.current.unsaved).toBe(false);
  expect(mockSave.mock.calls.map(([, value]) => value.text)).toEqual(['First', 'Second']);
});

it('ignores detached callbacks and stale update handles after the account subtree unmounts', async () => {
  const hook = await renderHook(() => useFollowupDrafts(scope));
  await ready(hook);
  const old = hook.result.current;
  await hook.unmount();
  await act(() => { old.update(quote, { text: 'Late result' }); old.retry(); old.ensure(lead); });
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockLoad).toHaveBeenCalledTimes(1);
});

it('reclaims storage after an explicit discard instead of keeping an empty slot for seven days', async () => {
  const hook = await renderHook(() => useFollowupDrafts(scope));
  await ready(hook);
  await act(() => hook.result.current.update(quote, { text: 'Draft to discard' }));
  await waitFor(() => expect(hook.result.current.unsaved).toBe(false));
  expect(mockCopies.size).toBe(1);
  await act(() => hook.result.current.update(quote, { text: null, logNote: '', outcome: 'spoke' }));
  await waitFor(() => expect(hook.result.current.unsaved).toBe(false));
  expect(mockCopies.size).toBe(0);
});
