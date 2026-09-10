import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { MediaIdentitySchema, MediaUuid, mediaInputText, readMediaResponse, type BusinessMediaKind,
  type MediaIdentity, type MediaResponse, type MediaScope } from './business-media-contract';
import type { BusinessMediaSelection } from './business-media-file';

const LocalReceiptSchema = z.object({ version: z.literal(1), identity: MediaIdentitySchema,
  status: z.enum(['unknown', 'pending', 'complete', 'cancelled', 'rejected']) }).strict();
export type LocalMediaReceipt = z.infer<typeof LocalReceiptSchema>;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const running = new Set<string>();
export class MediaRecoveryError extends Error {}
const digest = (input: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
export const mediaWriteHash = (input: Parameters<typeof mediaInputText>[0]) => digest(mediaInputText(input));
async function keyFor(scope: MediaScope) {
  const tenantId = MediaUuid.parse(scope.tenantId);
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(scope.userId) || Platform.OS === 'web' || !await SecureStore.isAvailableAsync())
    throw new MediaRecoveryError('Secure image-change recovery is unavailable. Reopen your account before changing an image.');
  return `quotemax.business-media-write.v1.${await digest(JSON.stringify([scope.userId, tenantId]))}`;
}
async function read(key: string): Promise<LocalMediaReceipt | null> {
  const value = await SecureStore.getItemAsync(key, options);
  if (value === null) return null;
  try { return LocalReceiptSchema.parse(JSON.parse(value)); }
  catch { throw new MediaRecoveryError('The previous image-change record could not be read. It has been preserved.'); }
}
async function retain(key: string, value: LocalMediaReceipt) {
  const serialized = JSON.stringify(LocalReceiptSchema.parse(value));
  await SecureStore.setItemAsync(key, serialized, options);
  if (await SecureStore.getItemAsync(key, options) !== serialized)
    throw new MediaRecoveryError('The image-change reference could not be protected. Try recovery storage again.');
}
async function exclusive<T>(scope: MediaScope, action: (key: string) => Promise<T>): Promise<T> {
  const key = await keyFor(scope);
  if (running.has(key)) throw new MediaRecoveryError('An image change is still being checked.');
  running.add(key);
  try { return await action(key); }
  finally { running.delete(key); }
}
export async function loadMediaReceipt(scope: MediaScope) { return read(await keyFor(scope)); }
async function receive(key: string, scope: MediaScope, pending: LocalMediaReceipt, raw: unknown): Promise<MediaResponse> {
  const response = readMediaResponse(raw, scope, pending.identity);
  const operation = response.operation!;
  if (['complete', 'cancelled', 'rejected'].includes(pending.status) && operation.status !== pending.status)
    throw new MediaRecoveryError('The server returned a conflicting image-change status. The confirmed reference has been preserved.');
  if (operation.status !== 'not_found') await retain(key, { ...pending, status: operation.status });
  return response; // not_found preserves a potentially dispatched operation.
}
export async function recoverMediaWrite(scope: MediaScope, lookup: (requestId: string) => Promise<unknown>) {
  return exclusive(scope, async key => {
    const pending = await read(key);
    return pending ? receive(key, scope, pending, await lookup(pending.identity.requestId)) : null;
  });
}
export async function writeBusinessMedia(scope: MediaScope,
  input: { kind: BusinessMediaKind; expectedRevision: string; selection: BusinessMediaSelection },
  dispatch: (identity: MediaIdentity, dataBase64: string) => Promise<unknown>) {
  return exclusive(scope, async key => {
    const previous = await read(key);
    const authority = { kind: input.kind, expectedRevision: MediaUuid.parse(input.expectedRevision),
      sourceMime: input.selection.sourceMime, sourceSha256: input.selection.sourceSha256 };
    const identity = MediaIdentitySchema.parse({ ...authority, inputHash: await mediaWriteHash(authority),
      requestId: previous?.identity.requestId ?? Crypto.randomUUID() });
    if (previous && (previous.status === 'complete' || previous.status === 'cancelled' || previous.status === 'rejected'))
      throw new MediaRecoveryError('Check the completed image change before starting another.');
    if (previous && Object.keys(MediaIdentitySchema.shape).some(field =>
      identity[field as keyof MediaIdentity] !== previous.identity[field as keyof MediaIdentity]))
      throw new MediaRecoveryError('Retry requires the exact original image. Check or cancel the previous image change first.');
    const pending: LocalMediaReceipt = previous ?? { version: 1, identity, status: 'unknown' };
    // No image, filename, URI, bearer or expiry is stored with this reference.
    await retain(key, pending);
    return receive(key, scope, pending, await dispatch(identity, input.selection.dataBase64));
  });
}
/** Cancellation creates a server tombstone even when the first POST is not yet
 * visible. A late upload cannot commit after that cancellation. */
export async function cancelMediaWrite(scope: MediaScope, dispatch: (identity: MediaIdentity) => Promise<unknown>, expectedRequestId: string) {
  return exclusive(scope, async key => {
    const pending = await read(key);
    if (!pending || pending.identity.requestId !== MediaUuid.parse(expectedRequestId))
      throw new MediaRecoveryError('The image-change reference changed. Review its current status before cancelling.');
    return receive(key, scope, pending, await dispatch(pending.identity));
  });
}
export async function acknowledgeMediaWrite(scope: MediaScope, requestId: string) {
  return exclusive(scope, async key => {
    const pending = await read(key);
    if (!pending || pending.identity.requestId !== MediaUuid.parse(requestId) || !['complete', 'cancelled', 'rejected'].includes(pending.status))
      throw new MediaRecoveryError('The image change is not confirmed. Check its saved status first.');
    await SecureStore.deleteItemAsync(key, options);
    if (await read(key)) throw new MediaRecoveryError('The confirmed image-change reference could not be cleared. Retry recovery storage.');
  });
}
