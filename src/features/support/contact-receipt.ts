/** This records a local dispatch attempt, not a server ticket. Unknown attempts
 * never expire: the current public API has no status/idempotency contract. */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { ContactResponseSchema, type ContactDraft, validateContactDraft } from './contact-contract';
import { contactOwner, type ContactScope } from './contact-draft';

const ReceiptSchema = z.object({ version: z.literal(1), requestId: z.string().uuid(),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/), status: z.enum(['unknown', 'confirmed', 'rejected']),
}).strict();
export type ContactReceipt = z.infer<typeof ReceiptSchema>;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const running = new Set<string>();
const digest = (value: unknown) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(value));
export async function contactInputHash(input: ContactDraft) {
  const parsed = validateContactDraft(input);
  if (!parsed.ok) return null;
  return digest(parsed.value);
}
async function keyFor(scope: ContactScope) {
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) throw new Error('Encrypted support recovery is unavailable. No message was started.');
  return `quotemax.support-attempt.v1.${await digest(contactOwner(scope))}`;
}
async function read(key: string) {
  const raw = await SecureStore.getItemAsync(key, options);
  return raw === null ? null : ReceiptSchema.parse(JSON.parse(raw));
}
async function retain(key: string, value: ContactReceipt) {
  const raw = JSON.stringify(ReceiptSchema.parse(value));
  await SecureStore.setItemAsync(key, raw, options);
  if (await SecureStore.getItemAsync(key, options) !== raw) throw new Error('The support attempt could not be stored. Its outcome has not been confirmed.');
}
export async function loadContactReceipt(scope: ContactScope) { return read(await keyFor(scope)); }
/** Only thrown by the caller before it invokes the HTTP client. */
export class ContactNotStartedError extends Error {}
function rejectedBeforeSend(error: unknown) {
  if (error instanceof ContactNotStartedError) return true;
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') return false;
  const code = (error.body as { error?: unknown }).error;
  return (error.status === 400 && ['invalid_json', 'invalid_body', 'invalid_name', 'invalid_email', 'invalid_phone', 'message_too_short', 'message_too_long'].includes(String(code))) ||
    (error.status === 429 && code === 'rate_limited') || (error.status === 500 && code === 'not_configured');
}
export async function submitContact(scope: ContactScope, input: ContactDraft, dispatch: (input: ContactDraft) => Promise<unknown>) {
  const validation = validateContactDraft(input);
  if (!validation.ok) throw new Error('Check the highlighted fields before sending.');
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('A support message is still in progress.');
  running.add(key);
  try {
    const previous = await read(key);
    if (previous && previous.status !== 'rejected') throw new Error('The previous support message must be resolved before another is sent.');
    const receipt: ContactReceipt = { version: 1, requestId: Crypto.randomUUID(),
      inputHash: (await contactInputHash(validation.value))!, status: 'unknown' };
    await retain(key, receipt);
    let response: unknown;
    try { response = await dispatch(validation.value); }
    catch (error) {
      if (rejectedBeforeSend(error)) await retain(key, { ...receipt, status: 'rejected' });
      throw error;
    }
    ContactResponseSchema.strict().parse(response);
    const confirmed = { ...receipt, status: 'confirmed' as const };
    await retain(key, confirmed);
    return confirmed;
  } finally { running.delete(key); }
}
/** Explicitly start another enquiry only after a validated acknowledgement. */
export async function acknowledgeContact(scope: ContactScope, requestId: string) {
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('A support message is still in progress.');
  running.add(key);
  try {
    const receipt = await read(key);
    if (receipt?.status !== 'confirmed' || receipt.requestId !== requestId) throw new Error('This support message is not confirmed.');
    await SecureStore.deleteItemAsync(key, options);
    if (await read(key)) throw new Error('The previous support receipt could not be cleared.');
  } finally { running.delete(key); }
}
