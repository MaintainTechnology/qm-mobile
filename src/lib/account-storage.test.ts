import AsyncStorage from '@react-native-async-storage/async-storage';

import { ACCOUNT_SCOPED_ASYNC_KEYS, clearAccountScopedState } from './account-storage';

jest.mock('@/features/auth/acquisition-envelope', () => ({
  clearAcquisitionEnvelope: jest.fn(async () => undefined),
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
  });

  it('attempts every cleanup even when secure acquisition storage fails', async () => {
    mockClearAcquisitionEnvelope.mockRejectedValueOnce(new Error('secure store unavailable'));

    await expect(clearAccountScopedState()).rejects.toThrow('secure store unavailable');
    expect(asyncStoragePersister.removeClient).toHaveBeenCalledTimes(1);
    expect(mockClearSessionToken).toHaveBeenCalledTimes(1);
  });
});
