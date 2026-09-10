/**
 * Minimal encrypted delivery receipts intentionally survive signout and have no
 * automatic expiry. Deleting an unknown write would make a restart a blind retry.
 * Recipient text, quote narrative, API tokens and provider errors are never stored.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { MissingClerkTokenError } from '@/lib/auth-token';

import type { QuoteActionResult, QuoteDeliveryReadback } from './delivery-schema';

export type DeliveryScope = {
  userId: string;
  tenantId: string;
  quoteId: string;
  purpose?: 'balance';
};
export type DeliveryInput = {
  action: 'approve' | 'send' | 'request-final-payment';
  channel: 'sms' | 'email';
  initial: boolean;
  expected_revision: string;
  /** Displayed recipient; retained only inside the identity hash. */
  reviewedDestination: string;
  to?: string;
};
export const DeliveryReceiptSchema = z
  .object({
    version: z.literal(1),
    requestId: z.string().uuid(),
    inputHash: z.string().regex(/^[a-f0-9]{64}$/),
    action: z.enum(['approve', 'send', 'request-final-payment']),
    channel: z.enum(['sms', 'email']),
    initial: z.boolean(),
    outboxId: z.string().uuid().optional(),
    state: z.enum([
      'pending',
      'unknown',
      'queued',
      'sending',
      'provider_accepted',
      'delivered',
      'failed',
      'noop',
      'no_commit',
      'balance_paid',
    ]),
    approved: z.boolean(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();
export type DeliveryReceipt = z.infer<typeof DeliveryReceiptSchema>;
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const inFlight = new Set<string>();
const hash = (value: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);

export class DeliveryReceiptError extends Error {
  constructor(
    readonly code: 'blocked' | 'storage' | 'identity' | 'unavailable' | 'missing_readback',
    readonly receipt?: DeliveryReceipt,
  ) {
    super(
      code === 'blocked'
        ? 'A previous delivery must be reviewed before another send.'
        : code === 'missing_readback'
          ? 'QuoteMax cannot yet identify this delivery outcome. Another send remains blocked.'
          : code === 'identity'
            ? 'Reopen and review this quote from the current account before sending.'
            : 'Encrypted delivery recovery could not finish. The delivery outcome may still be unconfirmed.',
    );
    this.name = 'DeliveryReceiptError';
  }
}
export async function deliveryReceiptKey(scope: DeliveryScope): Promise<string> {
  if (
    ![scope.userId, scope.tenantId, scope.quoteId].every(
      id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(id),
    )
  )
    throw new DeliveryReceiptError('identity');
  return `quotemax.quote-delivery.v1.${await hash(JSON.stringify([scope.userId, scope.tenantId.toLowerCase(), scope.quoteId.toLowerCase(), ...(scope.purpose ? [scope.purpose] : [])]))}`;
}
async function available() {
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync()))
    throw new DeliveryReceiptError('unavailable');
}
async function load(key: string): Promise<DeliveryReceipt | null> {
  await available();
  try {
    const raw = await SecureStore.getItemAsync(key, OPTIONS);
    return raw === null ? null : DeliveryReceiptSchema.parse(JSON.parse(raw));
  } catch {
    throw new DeliveryReceiptError('storage');
  }
}
async function persist(key: string, receipt: DeliveryReceipt) {
  try {
    await SecureStore.setItemAsync(
      key,
      JSON.stringify(DeliveryReceiptSchema.parse(receipt)),
      OPTIONS,
    );
  } catch {
    throw new DeliveryReceiptError('storage', receipt);
  }
}
export async function loadDeliveryReceipt(scope: DeliveryScope) {
  return load(await deliveryReceiptKey(scope));
}
async function inputHash(scope: DeliveryScope, input: DeliveryInput) {
  if (
    !/^[a-f0-9]{64}$/.test(input.expected_revision) ||
    typeof input.reviewedDestination !== 'string' ||
    !input.reviewedDestination.trim() ||
    (scope.purpose === 'balance'
      ? input.action !== 'request-final-payment' || input.channel !== 'sms'
      : input.action === 'request-final-payment') ||
    (input.action === 'approve' && (input.channel !== 'sms' || !input.initial))
  )
    throw new DeliveryReceiptError('identity');
  return hash(
    JSON.stringify([
      scope.quoteId,
      input.action,
      input.channel,
      input.initial,
      input.expected_revision,
      input.to?.trim() ?? null,
      input.reviewedDestination?.trim() ?? null,
    ]),
  );
}
function outcome(receipt: DeliveryReceipt, result: QuoteActionResult): DeliveryReceipt {
  const outboxId = result.outboxId ?? receipt.outboxId;
  const state: DeliveryReceipt['state'] = result.already_actioned
    ? result.status === 'balance_already_paid' && receipt.action === 'request-final-payment'
      ? 'balance_paid'
      : 'noop'
    : result.accepted === true ||
        (result.status === 'sent' && !!(result.sid?.trim() || result.messageId?.trim()))
      ? 'provider_accepted'
      : 'unknown';
  return {
    ...receipt,
    ...(outboxId ? { outboxId } : {}),
    state,
    approved: result.approved === true || receipt.approved,
    updatedAt: Date.now(),
  };
}
/** Only explicit pre-release errors establish that no customer dispatch occurred. */
function noCommit(error: unknown, action: DeliveryInput['action']): boolean {
  if (error instanceof MissingClerkTokenError) return true;
  if (!(error instanceof ApiError)) return false;
  const code = (error.body as { error?: unknown } | null)?.error;
  if (
    (action === 'approve' || action === 'send') &&
    typeof code === 'string' &&
    ['quote_contact_unavailable', 'quote_pricing_review_required', 'pricing_unavailable'].includes(
      code,
    )
  )
    return true;
  return (
    typeof code === 'string' &&
    [
      'missing_quote_id',
      'invalid_request',
      'invalid_request_id',
      'invalid_channel',
      'invalid_recipient',
      'invalid_expected_recipient',
      'quote_recipient_changed',
      'unauthorized',
      'not_found',
      'unscoped_quote',
      'forbidden',
      'not_sendable',
      'no_customer_phone',
      'no_customer_email',
      'no_caller_number',
      'quote_draft_processing',
      'quote_draft_unconfirmed',
      'quote_review_required',
      'email_not_supported_for_child',
      'balance_not_sendable',
      'not_priced',
      'tenant_messaging_unavailable',
      'quote_origin_unavailable',
    ].includes(code)
  );
}
export async function runQuoteDelivery(
  scope: DeliveryScope,
  input: DeliveryInput,
  dispatch: (body: {
    requestId?: string;
    expected_revision: string;
    expected_recipient: string;
    channel: 'sms' | 'email';
    to?: string;
  }) => Promise<QuoteActionResult>,
): Promise<QuoteActionResult> {
  const key = await deliveryReceiptKey(scope);
  if (inFlight.has(key)) throw new DeliveryReceiptError('blocked');
  inFlight.add(key);
  try {
    const identity = await inputHash(scope, input);
    const previous = await load(key);
    if (previous) throw new DeliveryReceiptError('blocked', previous);
    const receipt: DeliveryReceipt = {
      version: 1,
      requestId: Crypto.randomUUID(),
      inputHash: identity,
      action: input.action,
      channel: input.channel,
      initial: input.initial,
      state: 'pending',
      approved: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persist(key, receipt); // Must be durable before any request capable of dispatch.
    let result: QuoteActionResult;
    try {
      result = await dispatch({
        ...(input.initial ? {} : { requestId: receipt.requestId }),
        expected_revision: input.expected_revision,
        expected_recipient: input.reviewedDestination.trim(),
        channel: input.channel,
        ...(input.to?.trim() ? { to: input.to.trim() } : {}),
      });
      if (
        scope.purpose === 'balance'
          ? result.finalQuoteId?.toLowerCase() !== scope.quoteId.toLowerCase() ||
            !z.string().uuid().safeParse(result.quote_id).success ||
            result.quote_id?.toLowerCase() === scope.quoteId.toLowerCase()
          : result.quote_id && result.quote_id.toLowerCase() !== scope.quoteId.toLowerCase()
      )
        throw new DeliveryReceiptError('identity', receipt);
    } catch (error) {
      await persist(key, {
        ...receipt,
        state: noCommit(error, input.action) ? 'no_commit' : 'unknown',
        updatedAt: Date.now(),
      });
      throw error;
    }
    await persist(key, outcome(receipt, result));
    return result;
  } finally {
    inFlight.delete(key);
  }
}
export function observeDelivery(
  scope: DeliveryScope,
  receipt: DeliveryReceipt,
  readback: QuoteDeliveryReadback & { balancePaid?: boolean },
): DeliveryReceipt {
  if (
    readback.quoteId.toLowerCase() !== scope.quoteId.toLowerCase() ||
    (readback.requestId?.toLowerCase() ?? null) !==
      (receipt.initial ? null : receipt.requestId.toLowerCase()) ||
    receipt.channel !== 'sms'
  )
    throw new DeliveryReceiptError('identity', receipt);
  if (scope.purpose === 'balance' && readback.balancePaid === true)
    return { ...receipt, state: 'balance_paid', updatedAt: Date.now() };
  const row = readback.message;
  // Absence does not prove no commit: the POST may still be running or the
  // email route may have sent without an SMS outbox. Never unlock from absence.
  if (!row) throw new DeliveryReceiptError('missing_readback', receipt);
  if (receipt.outboxId && receipt.outboxId !== row.id)
    throw new DeliveryReceiptError('identity', receipt);
  const state: DeliveryReceipt['state'] =
    row.status === 'delivered'
      ? 'delivered'
      : row.status === 'accepted'
        ? 'provider_accepted'
        : row.status === 'pending' || row.status === 'retry'
          ? 'queued'
          : row.status === 'sending'
            ? 'sending'
            : row.status === 'failed' || row.status === 'undelivered'
              ? 'failed'
              : 'unknown';
  return {
    ...receipt,
    outboxId: row.id,
    approved: readback.approved || receipt.approved,
    state,
    updatedAt: Date.now(),
  };
}
/** A read refresh never repeats the original approve/send POST. */
export async function reconcileQuoteDelivery(
  scope: DeliveryScope,
  read: (receipt: DeliveryReceipt) => Promise<QuoteDeliveryReadback>,
) {
  const key = await deliveryReceiptKey(scope);
  if (inFlight.has(key)) throw new DeliveryReceiptError('blocked');
  inFlight.add(key);
  try {
    const previous = await load(key);
    if (!previous || previous.state === 'no_commit' || previous.state === 'noop') return previous;
    if (previous.channel === 'email') {
      if (previous.state === 'provider_accepted') return previous;
      throw new DeliveryReceiptError('missing_readback', previous);
    }
    const next = observeDelivery(scope, previous, await read(previous));
    await persist(key, next);
    return next;
  } finally {
    inFlight.delete(key);
  }
}
/** Explicit user-requested retry of the original immutable outbox payload. */
export async function retryQuoteDelivery(
  scope: DeliveryScope,
  read: (receipt: DeliveryReceipt) => Promise<QuoteDeliveryReadback>,
  retry: (outboxId: string) => Promise<unknown>,
) {
  const key = await deliveryReceiptKey(scope);
  if (inFlight.has(key)) throw new DeliveryReceiptError('blocked');
  inFlight.add(key);
  try {
    const previous = await load(key);
    if (!previous || previous.channel !== 'sms')
      throw new DeliveryReceiptError('blocked', previous ?? undefined);
    const checked = observeDelivery(scope, previous, await read(previous));
    await persist(key, checked);
    if (checked.state !== 'failed') throw new DeliveryReceiptError('blocked', checked);
    const pending = { ...checked, state: 'pending' as const, updatedAt: Date.now() };
    await persist(key, pending);
    try {
      await retry(checked.outboxId!);
    } catch (error) {
      await persist(key, { ...pending, state: 'unknown', updatedAt: Date.now() });
      throw error;
    }
    const queued = { ...pending, state: 'queued' as const, updatedAt: Date.now() };
    await persist(key, queued);
    return queued;
  } finally {
    inFlight.delete(key);
  }
}
/** A new logical resend requires this separate explicit acknowledgement. */
export async function beginAnotherQuoteDelivery(scope: DeliveryScope) {
  const key = await deliveryReceiptKey(scope);
  if (inFlight.has(key)) throw new DeliveryReceiptError('blocked');
  inFlight.add(key);
  try {
    const previous = await load(key);
    if (
      !previous ||
      !['provider_accepted', 'delivered', 'failed', 'noop', 'no_commit'].includes(previous.state)
    )
      throw new DeliveryReceiptError('blocked', previous ?? undefined);
    try {
      await SecureStore.deleteItemAsync(key, OPTIONS);
    } catch {
      throw new DeliveryReceiptError('storage', previous);
    }
  } finally {
    inFlight.delete(key);
  }
}
export function deliveryReceiptNotice(receipt: DeliveryReceipt): string {
  switch (receipt.state) {
    case 'pending':
      return 'This delivery request is awaiting confirmation. Another send is blocked.';
    case 'unknown':
      return 'Delivery is unconfirmed. Refresh delivery status before taking another action.';
    case 'queued':
      return 'The message is queued. Delivery to the customer is not yet confirmed.';
    case 'sending':
      return 'The provider request is in progress. Delivery is not yet confirmed.';
    case 'provider_accepted':
      return 'The provider accepted the message. Delivery to the customer is not yet confirmed.';
    case 'delivered':
      return 'The carrier confirmed delivery to the customer.';
    case 'failed':
      return 'The provider reported that this message was not delivered.';
    case 'noop':
      return 'No message was sent by this action. The quote’s current status has been refreshed.';
    case 'no_commit':
      return 'The send was stopped before customer delivery. Review the current quote before trying again.';
    case 'balance_paid':
      return 'The saved balance payment is confirmed. Another payment request is unavailable.';
  }
}
