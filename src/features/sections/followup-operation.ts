/** Opaque operation receipts outlive working copies. Losing an acknowledgement
 * never authorizes a second message/call/event under a new request identity. */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { FollowupDraftSchema } from './followups';

const ActionSchema = z.enum(['text', 'call', 'note']);
const StatusSchema = z.enum(['not_found', 'pending', 'unknown', 'accepted', 'failed', 'complete']);
const HistorySchema = z.enum(['pending', 'complete', 'not_applicable']);
const UuidSchema = z.string().uuid().transform(value => value.toLowerCase());
const TargetSchema = z.object({ kind: z.enum(['quote', 'conversation']), id: UuidSchema }).strict();
export const FollowupOperationResultSchema = z.object({
  ok: z.literal(true), requestId: UuidSchema, action: ActionSchema, target: TargetSchema,
  status: StatusSchema, accepted: z.boolean(), history: HistorySchema,
  eventId: UuidSchema.nullable(), outboxId: UuidSchema.nullable(),
  providerSid: z.string().min(1).max(200).nullable(), message: z.string(),
}).strict().superRefine((value, ctx) => {
  // Keep these evidence invariants aligned with the server's migration-220 DTO.
  // Contradictory readback must never release an unresolved request identity.
  const invalid = () => ctx.addIssue({ code: 'custom', message: 'Inconsistent follow-up operation evidence' });
  const sidValid = value.action === 'call' ? /^CA[0-9a-fA-F]{32}$/.test(value.providerSid ?? '')
    : /^(SM|MM)[0-9a-fA-F]{32}$/.test(value.providerSid ?? '');
  if (value.accepted && (value.action === 'note' || !sidValid || (value.action === 'text' && !value.outboxId))) invalid();
  if (value.status === 'complete' && (value.history !== 'complete' || (value.target.kind === 'quote' && !value.eventId) ||
      (value.action !== 'note' && !value.accepted))) invalid();
  if (value.accepted !== Boolean(value.providerSid) || (value.outboxId && value.action !== 'text')) invalid();
  if (value.action === 'note' && (value.target.kind !== 'quote' || value.accepted || value.outboxId)) invalid();
  if (value.target.kind === 'conversation' && value.eventId) invalid();
  if (value.eventId && value.history !== 'complete') invalid();
  if (value.history === 'complete' && value.status !== 'complete' && value.status !== 'accepted') invalid();
  if (value.history === 'complete' && value.target.kind === 'quote' && !value.eventId) invalid();
  if (value.status === 'not_found' && (value.accepted || value.history !== 'not_applicable' || value.eventId || value.outboxId || value.providerSid)) invalid();
  if (['pending', 'unknown', 'failed'].includes(value.status) && (value.accepted || value.history !== 'pending' || value.eventId || value.providerSid)) invalid();
  if (value.status === 'accepted' && (!value.accepted || value.history === 'not_applicable')) invalid();
  if (value.accepted && value.status !== 'accepted' && value.status !== 'complete') invalid();
});
export type FollowupOperationResult = z.infer<typeof FollowupOperationResultSchema>;
export type FollowupOperationScope = {
  userId: string; tenantId: string; action: z.infer<typeof ActionSchema>;
  target: z.infer<typeof TargetSchema>;
};
const InputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('text'), text: z.string().trim().min(1).max(640), expectedRecipient: z.string().trim().min(1).max(30) }).strict(),
  z.object({ action: z.literal('call'), expectedRecipient: z.string().trim().min(1).max(30) }).strict(),
  z.object({ action: z.literal('note'), kind: z.literal('note'), outcome: FollowupDraftSchema.shape.outcome,
    note: z.string().trim().max(500).optional(), preserveChase: z.boolean() }).strict(),
]);
export type FollowupOperationInput = z.infer<typeof InputSchema>;
const ReceiptSchema = z.object({
  version: z.literal(1), requestId: UuidSchema, inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: StatusSchema, history: HistorySchema, accepted: z.boolean(),
  eventId: UuidSchema.nullable(), outboxId: UuidSchema.nullable(),
}).strict();
export type FollowupOperationReceipt = z.infer<typeof ReceiptSchema>;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const running = new Set<string>();
const digest = (value: unknown) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(value));

async function keyFor(scope: FollowupOperationScope) {
  if (![scope.userId, scope.tenantId].every(id => /^[A-Za-z0-9_-]{1,160}$/.test(id))) throw new Error('Reopen follow-ups from the current account.');
  TargetSchema.parse(scope.target); ActionSchema.parse(scope.action);
  if (scope.action === 'note' && scope.target.kind !== 'quote') throw new Error('This enquiry has no quote contact log.');
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) throw new Error('Encrypted action recovery is unavailable on this device.');
  return `quotemax.followup-operation.v1.${await digest([scope.userId, scope.tenantId.toLowerCase(), scope.target.kind, scope.target.id.toLowerCase(), scope.action])}`;
}
async function load(key: string): Promise<FollowupOperationReceipt | null> {
  const value = await SecureStore.getItemAsync(key, options);
  return value === null ? null : ReceiptSchema.parse(JSON.parse(value));
}
async function save(key: string, receipt: FollowupOperationReceipt) {
  await SecureStore.setItemAsync(key, JSON.stringify(ReceiptSchema.parse(receipt)), options);
}
export async function loadFollowupOperation(scope: FollowupOperationScope) {
  return load(await keyFor(scope));
}
export function followupOperationFinished(receipt: FollowupOperationReceipt) {
  return receipt.status === 'complete' || receipt.status === 'failed' ||
    (receipt.status === 'accepted' && receipt.history === 'complete');
}
export async function followupOperationMatches(target: FollowupOperationScope['target'], raw: FollowupOperationInput, receipt: FollowupOperationReceipt) {
  const input = InputSchema.parse(raw);
  const inputs = input.action === 'note' ? [input, { ...input, preserveChase: !input.preserveChase }] : [input];
  for (const candidate of inputs) {
    if (receipt.inputHash === await digest([target.kind, target.id.toLowerCase(), candidate])) return true;
  }
  return false;
}
function applyResult(scope: FollowupOperationScope, receipt: FollowupOperationReceipt, raw: unknown): FollowupOperationReceipt {
  const result = FollowupOperationResultSchema.parse(raw);
  if (result.requestId !== receipt.requestId || result.action !== scope.action ||
      result.target.kind !== scope.target.kind || result.target.id.toLowerCase() !== scope.target.id.toLowerCase() ||
      (receipt.outboxId && result.outboxId !== receipt.outboxId) || (receipt.eventId && result.eventId !== receipt.eventId))
    throw new Error('The returned outcome does not match this follow-up operation.');
  if (result.status === 'accepted' && !result.accepted) throw new Error('Provider acceptance could not be verified.');
  if (result.accepted && (!['accepted', 'complete'].includes(result.status) ||
      scope.action === 'note' || (!result.outboxId && !result.providerSid)))
    throw new Error('Provider acceptance could not be verified.');
  if (result.status === 'complete' && (result.history !== 'complete' ||
      (scope.action === 'note' ? !result.eventId : !result.accepted)))
    throw new Error('The completed follow-up outcome could not be verified.');
  if (receipt.accepted && !result.accepted) throw new Error('The accepted operation needs further reconciliation.');
  return { ...receipt, status: result.status, accepted: result.accepted, history: result.history,
    eventId: result.eventId, outboxId: result.outboxId };
}
export async function recoverFollowupOperation(scope: FollowupOperationScope,
  read: (requestId: string) => Promise<unknown>) {
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('This follow-up operation is still in progress.');
  running.add(key);
  try {
    const receipt = await load(key);
    if (!receipt) return null;
    const next = applyResult(scope, receipt, await read(receipt.requestId));
    await save(key, next);
    return next;
  } finally { running.delete(key); }
}

/** Both start and retry are deliberate UI actions. Automatic reopen uses GET only. */
export async function runFollowupOperation(scope: FollowupOperationScope, raw: FollowupOperationInput,
  mode: 'start' | 'retry', dispatch: (body: Record<string, unknown>) => Promise<unknown>) {
  let input = InputSchema.parse(raw);
  if (input.action !== scope.action) throw new Error('The selected action changed. Review it again.');
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('This follow-up operation is still in progress.');
  running.add(key);
  try {
    let inputHash = await digest([scope.target.kind, scope.target.id.toLowerCase(), input]);
    const previous = await load(key);
    let receipt: FollowupOperationReceipt;
    if (mode === 'retry') {
      // A successful first touch can change the queue's contacted flag before
      // its acknowledgement reaches the client. Restore its exact old policy
      // bit only when the original hash proves unchanged note/outcome/target.
      if (previous && previous.inputHash !== inputHash && input.action === 'note') {
        const original = { ...input, preserveChase: !input.preserveChase };
        const originalHash = await digest([scope.target.kind, scope.target.id.toLowerCase(), original]);
        if (originalHash === previous.inputHash) { input = original; inputHash = originalHash; }
      }
      if (!previous || previous.inputHash !== inputHash)
        throw new Error('Restore the original message or note before retrying this same operation.');
      receipt = previous;
    } else {
      if (previous && !followupOperationFinished(previous))
        throw new Error('Check the previous outcome before starting another follow-up.');
      receipt = { version: 1, requestId: Crypto.randomUUID(), inputHash,
        status: 'unknown', accepted: false, history: 'pending', eventId: null, outboxId: null };
    }
    // Persist before dispatch. Exceptions, malformed responses and failed local
    // receipt writes leave the original request identity available for recovery.
    await save(key, receipt);
    const { action: _action, ...payload } = input;
    const ownedTarget = TargetSchema.parse(scope.target);
    const target = ownedTarget.kind === 'quote' ? { quoteId: ownedTarget.id } : { conversationId: ownedTarget.id };
    const next = applyResult(scope, receipt, await dispatch({ ...target, ...payload, requestId: receipt.requestId }));
    await save(key, next);
    return next;
  } finally { running.delete(key); }
}
