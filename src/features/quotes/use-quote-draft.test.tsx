import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { useQuoteDraft } from './use-quote-draft';
import type { QuoteDraftInput, QuoteDraftSnapshot } from './quote-draft-storage';

const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockRemove = jest.fn();
jest.mock('./quote-draft-storage', () => ({
  createQuoteDraftStore: () => ({ load: mockLoad, save: mockSave, remove: mockRemove }),
}));
const scope = { userId: 'u', tenantId: 't', quoteId: 'q' };
const original = {
  better: {
    label: 'Option',
    lines: [{ key: 'better:0', originalIndex: 0, description: 'Line', quantity: '1', price: '10' }],
  },
};
const input: QuoteDraftInput = {
  revision: 'a'.repeat(64),
  originalTiers: original,
  workingTiers: original,
};
const snapshot = (value: QuoteDraftInput): QuoteDraftSnapshot => ({
  ...value,
  savedAt: 123,
  expiresAt: 456,
});
beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
  mockSave.mockImplementation(async value => snapshot(value));
  mockRemove.mockResolvedValue(undefined);
});
function useHarness() {
  const [copy, setCopy] = useState(input);
  const draft = useQuoteDraft(
    scope,
    copy,
    JSON.stringify(copy.workingTiers) !== JSON.stringify(copy.originalTiers),
    restored =>
      setCopy({
        revision: restored.revision,
        originalTiers: restored.originalTiers,
        workingTiers: restored.workingTiers,
      }),
  );
  return {
    draft,
    copy,
    edit: (quantity: string) =>
      setCopy(value => ({
        ...value,
        workingTiers: {
          better: { ...original.better, lines: [{ ...original.better.lines[0]!, quantity }] },
        },
      })),
  };
}
it('restores the exact working copy and baseline without overwriting it during initialization', async () => {
  const restored = {
    ...input,
    workingTiers: {
      better: { ...original.better, lines: [{ ...original.better.lines[0]!, price: '' }] },
    },
  };
  mockLoad.mockResolvedValue(snapshot(restored));
  const { result } = await renderHook(useHarness);
  await waitFor(() => expect(result.current.draft.loaded).toBe(true));
  expect(result.current.copy).toEqual(restored);
  expect(mockSave).not.toHaveBeenCalled();
});
it('coalesces rapid edits and waits until the newest draft is durable before closing', async () => {
  let finishFirst: (value: QuoteDraftSnapshot) => void = () => {};
  mockSave.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finishFirst = resolve;
      }),
  );
  const { result } = await renderHook(useHarness);
  await waitFor(() => expect(result.current.draft.loaded).toBe(true));
  await act(() => result.current.edit('2'));
  await act(() => result.current.edit('3'));
  await act(() => result.current.edit('4'));
  let flushed = false;
  let flush: Promise<void>;
  await act(async () => {
    flush = result.current.draft.flush().then(() => {
      flushed = true;
    });
  });
  expect(flushed).toBe(false);
  await act(async () => {
    finishFirst(snapshot(mockSave.mock.calls[0][0]));
    await flush!;
  });
  expect(flushed).toBe(true);
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockSave.mock.calls[1][0].workingTiers.better.lines[0].quantity).toBe('4');
});
it('surfaces storage failures and does not clear the prior durable draft', async () => {
  mockSave.mockRejectedValue(new Error('Device storage unavailable'));
  const { result } = await renderHook(useHarness);
  await waitFor(() => expect(result.current.draft.loaded).toBe(true));
  await act(() => result.current.edit('2'));
  await waitFor(() => expect(result.current.draft.error).toBe('Device storage unavailable'));
  expect(mockRemove).not.toHaveBeenCalled();
  expect(result.current.copy.workingTiers.better?.lines[0]?.quantity).toBe('2');
});
it('does not restore a late account-scoped load after unmount', async () => {
  let finish: (value: QuoteDraftSnapshot) => void = () => {};
  mockLoad.mockReturnValueOnce(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  const restore = jest.fn();
  const { unmount } = await renderHook(() => useQuoteDraft(scope, input, false, restore));
  await unmount();
  await act(async () => {
    finish(snapshot(input));
    await Promise.resolve();
  });
  expect(restore).not.toHaveBeenCalled();
});

it('replaces an in-flight dirty snapshot with the reverted baseline before recovery', async () => {
  let durable: QuoteDraftSnapshot | null = null;
  let finish: () => void = () => {};
  mockLoad.mockImplementation(async () => durable);
  mockSave.mockImplementation(async value => {
    durable = snapshot(value);
    return durable;
  });
  mockSave.mockImplementationOnce(async value => {
    await new Promise<void>(resolve => {
      finish = resolve;
    });
    durable = snapshot(value);
    return durable;
  });
  const first = await renderHook(useHarness);
  await waitFor(() => expect(first.result.current.draft.loaded).toBe(true));
  await act(() => first.result.current.edit('2'));
  await act(() => first.result.current.edit('1'));
  await act(async () => {
    finish();
  });
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
  await first.unmount();
  const reopened = await renderHook(useHarness);
  await waitFor(() => expect(reopened.result.current.draft.loaded).toBe(true));
  expect(reopened.result.current.copy.workingTiers.better?.lines[0]?.quantity).toBe('1');
});

it('waits for older dirty writes before removing a clean closing draft', async () => {
  let finish: () => void = () => {};
  mockSave.mockImplementationOnce(async value => {
    await new Promise<void>(resolve => {
      finish = resolve;
    });
    return snapshot(value);
  });
  const { result } = await renderHook(useHarness);
  await waitFor(() => expect(result.current.draft.loaded).toBe(true));
  await act(() => result.current.edit('2'));
  await act(() => result.current.edit('1'));
  let removal: Promise<void>;
  await act(async () => {
    removal = result.current.draft.remove();
  });
  expect(mockRemove).not.toHaveBeenCalled();
  await act(async () => {
    finish();
    await removal!;
  });
  expect(mockRemove).toHaveBeenCalledTimes(1);
});
