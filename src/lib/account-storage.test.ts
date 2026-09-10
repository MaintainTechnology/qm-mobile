import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearStudioExportCache } from '@/features/studio/studio-export-cache';

import { ACCOUNT_SCOPED_ASYNC_KEYS, clearAccountScopedState } from './account-storage';

jest.mock('@/features/auth/acquisition-envelope', () => ({
  clearAcquisitionEnvelope: jest.fn(async () => undefined),
}));
jest.mock('@/features/quotes/quote-draft-storage', () => ({
  clearAllQuoteDrafts: jest.fn(async () => undefined),
}));
jest.mock('@/features/support/contact-draft', () => ({ clearLegacyContactDraft: jest.fn(async () => undefined) }));
jest.mock('@/features/studio/studio-export-cache', () => ({ clearStudioExportCache: jest.fn(async () => undefined) }));
jest.mock('@/lib/working-draft-storage', () => ({
  clearAllWorkingDrafts: jest.fn(async () => undefined),
}));
jest.mock('@/lib/query', () => ({
  asyncStoragePersister: { removeClient: jest.fn(async () => undefined) },
  queryClient: { clear: jest.fn() },
}));
jest.mock('@/lib/session', () => ({
  clearSessionToken: jest.fn(async () => undefined),
}));

const { clearAcquisitionEnvelope: mockClearAcquisitionEnvelope } = jest.requireMock(
  '@/features/auth/acquisition-envelope',
) as { clearAcquisitionEnvelope: jest.Mock };
const { asyncStoragePersister, queryClient } = jest.requireMock('@/lib/query') as {
  asyncStoragePersister: { removeClient: jest.Mock };
  queryClient: { clear: jest.Mock };
};
const { clearSessionToken: mockClearSessionToken } = jest.requireMock('@/lib/session') as {
  clearSessionToken: jest.Mock;
};
const { clearAllQuoteDrafts: mockClearAllQuoteDrafts } = jest.requireMock(
  '@/features/quotes/quote-draft-storage',
) as { clearAllQuoteDrafts: jest.Mock };

describe('clearAccountScopedState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears acquisition capabilities alongside every account-scoped cache', async () => {
    await clearAccountScopedState();

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(asyncStoragePersister.removeClient).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([...ACCOUNT_SCOPED_ASYNC_KEYS]);
    expect(mockClearAcquisitionEnvelope).toHaveBeenCalledTimes(1);
    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
    expect(mockClearAllQuoteDrafts).toHaveBeenCalledTimes(1);
    expect(clearStudioExportCache).toHaveBeenCalledTimes(1);
    expect(jest.requireMock('@/features/support/contact-draft').clearLegacyContactDraft).toHaveBeenCalledTimes(1);
    expect(jest.requireMock('@/lib/working-draft-storage').clearAllWorkingDrafts).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed encrypted draft purge while still clearing other account state', async () => {
    mockClearAllQuoteDrafts.mockRejectedValueOnce(new Error('draft purge failed'));
    await expect(clearAccountScopedState()).rejects.toThrow('draft purge failed');
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
    expect(mockClearAcquisitionEnvelope).toHaveBeenCalledTimes(1);
  });

  it('attempts every cleanup even when secure acquisition storage fails', async () => {
    mockClearAcquisitionEnvelope.mockRejectedValueOnce(new Error('secure store unavailable'));

    await expect(clearAccountScopedState()).rejects.toThrow('secure store unavailable');
    expect(asyncStoragePersister.removeClient).toHaveBeenCalledTimes(1);
    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
  });
  it('keeps account cleanup closed when the unowned legacy support draft cannot be removed', async () => {
    jest.requireMock('@/features/support/contact-draft').clearLegacyContactDraft.mockRejectedValueOnce(new Error('legacy support cleanup failed'));
    await expect(clearAccountScopedState()).rejects.toThrow('legacy support cleanup failed');
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
  });
  it('starts Studio export revocation synchronously and rejects incomplete file cleanup', async () => {
    jest.mocked(clearStudioExportCache).mockRejectedValueOnce(new Error('private export cleanup failed'));
    const clearing = clearAccountScopedState();
    expect(clearStudioExportCache).toHaveBeenCalledTimes(1);
    await expect(clearing).rejects.toThrow('private export cleanup failed');
    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
    expect(mockClearAllQuoteDrafts).toHaveBeenCalledTimes(1);
  });
});
