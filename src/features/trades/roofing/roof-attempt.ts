import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { ApiError } from '@/lib/api';

export type RoofScope = { userId: string; tenantId: string; recordId: string };
const ReceiptSchema = z.object({ version: z.literal(1), action: z.enum(['selection', 'corrections', 'promotion', 'save']),
  revision: z.string().regex(/^[a-f0-9]{64}$/), measureToken: z.string().min(8).optional(),
  runId: z.string().regex(/^[a-f0-9]{32}$/).optional(),
}).strict();
export type RoofAttempt = z.infer<typeof ReceiptSchema>;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const running = new Set<string>();
async function key(scope: RoofScope) {
  if (Platform.OS === 'web' || !scope.userId || !scope.tenantId || !scope.recordId) {
    throw new Error('Secure saved-job recovery is unavailable on this device.');
  }
  return `quotemax.roof-attempt.v1.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify([scope.userId, scope.tenantId, scope.recordId]))}`;
}
export async function readRoofAttempt(scope: RoofScope): Promise<RoofAttempt | null> {
  const raw = await SecureStore.getItemAsync(await key(scope), options);
  return raw ? ReceiptSchema.parse(JSON.parse(raw)) : null;
}
export async function writeRoofAttempt(scope: RoofScope, attempt: RoofAttempt) {
  await SecureStore.setItemAsync(await key(scope), JSON.stringify(ReceiptSchema.parse(attempt)), options);
}
export async function clearRoofAttempt(scope: RoofScope) {
  await SecureStore.deleteItemAsync(await key(scope), options);
}
/** Only these explicit pre-write route branches prove this attempt rejected.
 * A generic 409, SQL acknowledgement loss or promotion_pending is unknown. */
export function roofRejectedBeforeWrite(error: unknown, action: RoofAttempt['action']) {
  if (!(error instanceof ApiError)) return false;
  const parsed = z.object({error:z.string()}).safeParse(error.body);
  if (!parsed.success) return false;
  const code=parsed.data.error;
  if (error.status===401 && code==='unauthorized') return true;
  if (error.status===400 && ['invalid_json','invalid_request'].includes(code)) return true;
  if (action==='selection' || action==='corrections') {
    return (error.status===404 && code==='not_found') ||
      (error.status===409 && ['paid_quote_locked','measurement_changed'].includes(code)) ||
      (error.status===422 && code==='tenant_pricing_required') ||
      (error.status===400 && ['no_quote','no_structures'].includes(code));
  }
  if (action==='promotion') return (error.status===409 && code==='pricing_stale') ||
    (error.status===404 && ['no_tenant','measurement_not_found'].includes(code)) ||
    (error.status===422 && ['tenant_pricing_required','measurement_unpriceable','inspection_required','unpriced_measurement'].includes(code));
  return false;
}
/** Persist before the first mutation; an unknown result stays fenced through
 * relaunch. This receipt deliberately survives logout and contains no customer
 * text. It is readable only under the same account/tenant/record identity. */
export async function runRoofAttempt<T>(scope: RoofScope, attempt: RoofAttempt, mutate: () => Promise<T>) {
  const id = await key(scope);
  if (running.has(id)) throw new Error('A saved-job action is already running.');
  running.add(id);
  try {
    if (await readRoofAttempt(scope)) throw new Error('Check the previous saved-job action before another change.');
    await writeRoofAttempt(scope, attempt);
    return await mutate();
  } finally { running.delete(id); }
}
