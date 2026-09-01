/**
 * Local state that belongs to one authenticated account.
 *
 * Appearance and the biometric preference are device preferences, so they are
 * intentionally not removed here. Server cache, legacy credentials, and
 * resumable run identifiers can expose the previous tenant and must go.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearAcquisitionEnvelope } from '@/features/auth/acquisition-envelope';
import { asyncStoragePersister, queryClient } from '@/lib/query';
import { clearSessionToken } from '@/lib/session';

export const ACCOUNT_SCOPED_ASYNC_KEYS = [
  'quotemax.estimator.extract-id',
  'quotemax.cpaint.run-id',
] as const;

export async function clearAccountScopedState(): Promise<void> {
  // Synchronous first: even if device storage fails, no previous rows remain
  // visible in the running process.
  queryClient.clear();

  const results = await Promise.allSettled([
    asyncStoragePersister.removeClient(),
    AsyncStorage.multiRemove([...ACCOUNT_SCOPED_ASYNC_KEYS]),
    clearAcquisitionEnvelope(),
    clearSessionToken(),
  ]);
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed) throw failed.reason;
}
