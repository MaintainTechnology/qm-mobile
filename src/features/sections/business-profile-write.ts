import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { PROFILE_FIELDS } from './business-profile';
import { BusinessProfileError, ProfileTerminalSchema, ProfileRejectionCodeSchema, ProfileOperationSchema, ProfileRequestSchema, ProfileUuid, profileInputText, type ProfileTerminal, type ProfileRequest } from './business-profile-contract';

export type ProfileScope = { userId: string; tenantId: string };
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const LegacyReceiptSchema = z.object({ version: z.literal(1), hash: hashSchema, fields: z.array(z.enum(PROFILE_FIELDS)).min(1).max(PROFILE_FIELDS.length) }).strict();
const CurrentReceiptSchema = z.object({ version: z.literal(2), requestId: ProfileUuid, expectedRevision: ProfileUuid,
  inputHash: hashSchema, fields: z.array(z.enum(PROFILE_FIELDS)).min(1).max(PROFILE_FIELDS.length), status: z.enum(['unknown', 'complete', 'rejected']),
  revision: ProfileUuid.nullable(), errorCode: ProfileRejectionCodeSchema.nullable().default(null) }).strict()
  .refine(value => (value.status === 'unknown' ? value.revision === null : value.revision !== null) && (value.status === 'rejected' ? value.errorCode !== null : value.errorCode === null));
export type CurrentProfileReceipt = z.infer<typeof CurrentReceiptSchema>;
export type ProfileReceipt = CurrentProfileReceipt | z.infer<typeof LegacyReceiptSchema>;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const running = new Set<string>();
const hash = (text: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
async function storageKeys(scope: ProfileScope) {
  if (![scope.userId, scope.tenantId].every(value => /^[A-Za-z0-9_-]{1,160}$/.test(value))) throw new BusinessProfileError('Reopen your business account.');
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) throw new BusinessProfileError('Encrypted business-update recovery is unavailable.');
  const id = await hash(JSON.stringify([scope.userId, scope.tenantId]));
  return { key: 'quotemax.business-write.v2.' + id, legacy: 'quotemax.business-write.v1.' + id };
}
async function read(keys: Awaited<ReturnType<typeof storageKeys>>): Promise<ProfileReceipt | null> {
  // Legacy writes had no server operation identity. Field equality cannot
  // establish that a delayed old PATCH finished; never silently retire one.
  const legacy = await SecureStore.getItemAsync(keys.legacy, options);
  if (legacy !== null) return LegacyReceiptSchema.parse(JSON.parse(legacy));
  const raw = await SecureStore.getItemAsync(keys.key, options);
  return raw === null ? null : CurrentReceiptSchema.parse(JSON.parse(raw));
}
async function retain(key: string, receipt: CurrentProfileReceipt) {
  const raw = JSON.stringify(CurrentReceiptSchema.parse(receipt));
  await SecureStore.setItemAsync(key, raw, options);
  if (await SecureStore.getItemAsync(key, options) !== raw) throw new BusinessProfileError('The business update could not be protected for recovery.');
}
export async function loadProfileReceipt(scope: ProfileScope) { return read(await storageKeys(scope)); }
export async function profileWriteHash(expectedRevision: string, patch: ProfileRequest['patch']) { return hash(profileInputText(expectedRevision, patch)); }
function validateCompletion(scope: ProfileScope, pending: CurrentProfileReceipt, raw: unknown) {
  const complete = ProfileTerminalSchema.parse(raw);
  if (complete.tenantId !== scope.tenantId || complete.userId !== scope.userId || complete.requestId !== pending.requestId ||
      complete.expectedRevision !== pending.expectedRevision || complete.inputHash !== pending.inputHash)
    throw new BusinessProfileError('The business-update receipt did not match this account and request.');
  if (pending.status !== 'unknown' && (complete.status !== pending.status || complete.revision !== pending.revision
      || (complete.status === 'rejected' && complete.errorCode !== pending.errorCode)))
    throw new BusinessProfileError('The server returned a conflicting business-update outcome. The original receipt has been preserved.');
  return complete;
}
export async function recoverProfileWrite(scope: ProfileScope, lookup: (requestId: string) => Promise<unknown>): Promise<ProfileTerminal | null> {
  const keys = await storageKeys(scope);
  if (running.has(keys.key)) throw new BusinessProfileError('The business update is still in progress.');
  running.add(keys.key);
  try {
    const pending = await read(keys);
    if (!pending) return null;
    if (pending.version === 1) throw new BusinessProfileError('This older update has no server reference. Keep this account unchanged until its outcome can be checked.');
    const result = ProfileOperationSchema.parse(await lookup(pending.requestId));
    if (result.tenantId !== scope.tenantId || result.userId !== scope.userId || result.requestId !== pending.requestId)
      throw new BusinessProfileError('The business-update status belongs to a different account or request.');
    if (result.status === 'not_found') {
      if (pending.status !== 'unknown')
        throw new BusinessProfileError('The server returned a conflicting business-update outcome. The original receipt has been preserved.');
      return null; // In-flight absence is not proof of rejection.
    }
    const complete = validateCompletion(scope, pending, result);
    await retain(keys.key, { ...pending, status: complete.status, revision: complete.revision, errorCode: complete.status === 'rejected' ? complete.errorCode : null });
    return complete;
  } finally { running.delete(keys.key); }
}
export async function writeBusinessProfile(scope: ProfileScope, input: Omit<ProfileRequest, 'requestId'>,
  dispatch: (request: ProfileRequest) => Promise<unknown>): Promise<ProfileTerminal> {
  const keys = await storageKeys(scope);
  if (running.has(keys.key)) throw new BusinessProfileError('The business update is still in progress.');
  running.add(keys.key);
  try {
    const previous = await read(keys);
    if (previous?.version === 1) throw new BusinessProfileError('The older business update must be resolved before another write.');
    const request = ProfileRequestSchema.parse({ ...input, requestId: previous?.requestId ?? Crypto.randomUUID() });
    const inputHash = await profileWriteHash(request.expectedRevision, request.patch);
    if (previous && (previous.inputHash !== inputHash || previous.expectedRevision !== request.expectedRevision))
      throw new BusinessProfileError('Restore the exact original business fields before retrying this update.');
    const receipt: CurrentProfileReceipt = previous ?? { version: 2, requestId: request.requestId, expectedRevision: request.expectedRevision,
      inputHash, fields: PROFILE_FIELDS.filter(field => field in request.patch), status: 'unknown', revision: null, errorCode: null };
    if (receipt.status !== 'unknown') return validateCompletion(scope, receipt, { ok: true, ...scope, requestId: receipt.requestId,
      expectedRevision: receipt.expectedRevision, inputHash: receipt.inputHash, revision: receipt.revision, status: receipt.status,
      ...(receipt.status === 'rejected' ? { errorCode: receipt.errorCode } : {}) });
    await retain(keys.key, receipt);
    let response: unknown;
    try { response = await dispatch(request); }
    catch (error) {
      // Only this endpoint's pre-write input rejection can retire a first
      // dispatch. Generic HTTP errors (especially a reused operation ID) are
      // not bound terminal receipts and cannot erase recovery evidence.
      const code = error instanceof ApiError && error.body && typeof error.body === 'object'
        && 'error' in error.body ? error.body.error : null;
      if (!previous && error instanceof ApiError && error.status === 400
        && error.path === '/api/tenant/business-profile'
        && ['invalid_json', 'invalid_body', 'invalid_query'].includes(String(code))) {
        await SecureStore.deleteItemAsync(keys.key, options);
        if (await read(keys)) throw new BusinessProfileError('The rejected update could not be cleared from recovery storage.');
      }
      throw error;
    }
    const complete = validateCompletion(scope, receipt, response);
    await retain(keys.key, { ...receipt, status: complete.status, revision: complete.revision, errorCode: complete.status === 'rejected' ? complete.errorCode : null });
    return complete;
  } finally { running.delete(keys.key); }
}
export async function acknowledgeProfileWrite(scope: ProfileScope, requestId: string) {
  const keys = await storageKeys(scope);
  if (running.has(keys.key)) throw new BusinessProfileError('The business update is still in progress.');
  running.add(keys.key);
  try {
    const receipt = await read(keys);
    if (receipt?.version !== 2 || receipt.status === 'unknown' || receipt.requestId !== requestId)
      throw new BusinessProfileError('The business update is not confirmed.');
    await SecureStore.deleteItemAsync(keys.key, options);
    if (await read(keys)) throw new BusinessProfileError('The confirmed update could not be cleared from recovery storage.');
  } finally { running.delete(keys.key); }
}
