/** No contact data, share token or expiry: an unknown save must survive logout. */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { PaintPassSchema, PaintRecoverySchema, PaintScopeSchema, paintInputKey, readPaintSaved,
  samePaintPass, type PaintPass, type PaintScope, type PaintSaved } from './pricing-contract';

const ReceiptSchema = z.object({
  version: z.literal(1), pass: PaintPassSchema,
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  quoteId: z.string().uuid().nullable(),
}).strict();
export type PaintReceipt = z.infer<typeof ReceiptSchema>;
export type PaintSaveInput = PaintPass & { customerName?: string; customerPhone?: string };
const InputSchema = PaintPassSchema.extend({
  customerName: z.string().trim().max(120).optional(), customerPhone: z.string().trim().max(40).optional(),
}).strict();
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const running = new Set<string>();
const hash = (value: unknown) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, paintInputKey(value));
async function keyFor(scope: PaintScope) {
  const owner = PaintScopeSchema.parse(scope);
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync()))
    throw new Error('Encrypted quote recovery is unavailable. No quote save was started.');
  return `quotemax.paint-save.v1.${await hash([owner.userId, owner.tenantId.toLowerCase()])}`;
}
async function read(key: string) {
  const raw = await SecureStore.getItemAsync(key, options);
  return raw === null ? null : ReceiptSchema.parse(JSON.parse(raw));
}
async function retain(key: string, value: PaintReceipt) {
  const raw = JSON.stringify(ReceiptSchema.parse(value));
  await SecureStore.setItemAsync(key, raw, options);
  if (await SecureStore.getItemAsync(key, options) !== raw)
    throw new Error('Quote recovery could not be stored. Check its status before trying again.');
}
export async function loadPaintReceipt(scope: PaintScope) { return read(await keyFor(scope)); }

export class PaintRetryInputError extends Error {
  constructor() {
    super('Restore the original customer name and phone before retrying this Save. Leave a field blank if it was blank originally.');
    this.name = 'PaintRetryInputError';
  }
}

/** An expired working copy can be re-entered without keeping contact data in a
 * permanent receipt. Blank and omitted optional fields have both existed in
 * callers; only the variant with the exact retained full-input hash may retry. */
export async function preparePaintSaveRetryInput(receipt: PaintReceipt,
  contacts: { customerName: string; customerPhone: string }): Promise<PaintSaveInput> {
  const parsed = InputSchema.safeParse({ ...receipt.pass, customerName: contacts.customerName, customerPhone: contacts.customerPhone });
  if (!parsed.success) throw new PaintRetryInputError();
  const name = parsed.data.customerName, phone = parsed.data.customerPhone;
  for (const customerName of name ? [name] : ['', undefined]) {
    for (const customerPhone of phone ? [phone] : ['', undefined]) {
      const input = InputSchema.parse({ ...receipt.pass, customerName, customerPhone });
      if (await hash(input) === receipt.inputHash) return input;
    }
  }
  throw new PaintRetryInputError();
}

/** Only a first, conclusively rejected request can release its receipt. A later
 * retry rejection cannot disprove an earlier request which is still committing. */
function rejectedBeforeCommit(error: unknown) {
  if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object') return false;
  const code = (error.body as { error?: unknown }).error;
  return (error.status === 400 && ['invalid_json', 'invalid_request', 'invalid_customer_phone'].includes(String(code))) ||
    (error.status === 404 && ['run_not_found', 'extraction_not_found'].includes(String(code))) ||
    (error.status === 409 && ['pricing_changed', 'pricing_review_required', 'pricing_proof_required', 'released_quote_immutable'].includes(String(code))) ||
    (error.status === 422 && ['tenant_pricing_required', 'inspection_required', 'not_priced', 'no_items', 'invalid_takeoff', 'invalid_pricing'].includes(String(code)));
}
export async function savePaintDraft(scope: PaintScope, raw: PaintSaveInput,
  mode: 'start' | 'retry', dispatch: (body: PaintSaveInput) => Promise<unknown>): Promise<PaintSaved> {
  const input = InputSchema.parse(raw);
  const pass = PaintPassSchema.parse({ paintRunId: input.paintRunId, extractionId: input.extractionId,
    pricingProof: input.pricingProof, pricedAt: input.pricedAt });
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('A quote save is still in progress.');
  running.add(key);
  try {
    const existing = await read(key);
    const inputHash = await hash(input);
    if (mode === 'start' && existing) throw new Error('Check the previous quote save before starting another.');
    if (mode === 'retry' && (!existing || !samePaintPass(existing.pass, pass) || existing.inputHash !== inputHash))
      throw new Error('Restore the original customer details before retrying the same saved pricing.');
    const receipt: PaintReceipt = existing ?? { version: 1, pass, inputHash, quoteId: null };
    await retain(key, receipt);
    let response: unknown;
    try { response = await dispatch(input); }
    catch (error) {
      if (!existing && rejectedBeforeCommit(error)) await SecureStore.deleteItemAsync(key, options);
      throw error;
    }
    const saved = readPaintSaved(response, pass);
    if (receipt.quoteId && saved.quoteId !== receipt.quoteId) throw new Error('The saved quote identity changed.');
    await retain(key, { ...receipt, quoteId: saved.quoteId });
    return saved;
  } finally { running.delete(key); }
}
export async function recoverPaintDraft(scope: PaintScope, request: (pass: PaintPass) => Promise<unknown>): Promise<PaintSaved | null> {
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('A quote save is still in progress.');
  running.add(key);
  try {
    const receipt = await read(key);
    if (!receipt) return null;
    const response = PaintRecoverySchema.parse(await request(receipt.pass));
    if (!samePaintPass(response, receipt.pass)) throw new Error('The returned status belongs to another pricing pass.');
    // Absence cannot disprove a still-running earlier transaction.
    if (response.status === 'not_found') return null;
    const saved = readPaintSaved(response, receipt.pass);
    if (receipt.quoteId && saved.quoteId !== receipt.quoteId) throw new Error('The saved quote identity changed.');
    await retain(key, { ...receipt, quoteId: saved.quoteId });
    return saved;
  } finally { running.delete(key); }
}
/** User acknowledgement of a verified saved result; unknown receipts cannot be discarded. */
export async function acknowledgePaintDraft(scope: PaintScope, quoteId: string) {
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('A quote save is still in progress.');
  running.add(key);
  try {
    const receipt = await read(key);
    if (!receipt?.quoteId || receipt.quoteId !== quoteId) throw new Error('Check the saved quote before continuing.');
    await SecureStore.deleteItemAsync(key, options);
    if (await read(key)) throw new Error('Quote recovery could not be cleared.');
  } finally { running.delete(key); }
}
