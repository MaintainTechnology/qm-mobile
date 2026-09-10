/**
 * Durable native receipt for the server's tenant-bound job operation.
 * Store only an outcome and opaque record ID, never answers, contact details, photos
 * or share tokens. Identity-scoped receipts intentionally survive sign-out: deleting
 * an unknown attempt would turn signing back in into a blind retry.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { MissingClerkTokenError } from '@/lib/auth-token';

import type { JobQuoteRequest, JobQuoteOperation } from './schema';

const ReceiptBase = z.object({
  operationId: z.string().uuid().optional(),
  pinned: z.boolean().optional(),
  pinRequested: z.boolean().optional(),
});
const AttemptSchema = z.discriminatedUnion('status', [
  ReceiptBase.extend({ status: z.literal('pending') }),
  ReceiptBase.extend({ status: z.literal('unknown') }),
  ReceiptBase.extend({ status: z.literal('failed_no_commit'), operationId: z.string().uuid() }),
  ReceiptBase.extend({
    status: z.literal('quote_available'),
    operationId: z.string().uuid(),
    quoteId: z.string().uuid(),
  }),
  ReceiptBase.extend({
    status: z.literal('succeeded'),
    quoteId: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9_-]+$/),
  }),
]);
export type DraftAttempt = z.infer<typeof AttemptSchema>;
export type DraftScope = { userId: string; tenantId: string };

export function attemptStorageKey(scope: DraftScope): string {
  if (![scope.userId, scope.tenantId].every(id => /^[A-Za-z0-9_-]+$/.test(id))) {
    throw new Error('A verified account is required before drafting.');
  }
  return `quotemax.jobquote.attempt.v1.${scope.userId}.${scope.tenantId}`;
}

const storage = {
  get: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  remove: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

export async function loadDraftAttempt(scope: DraftScope): Promise<DraftAttempt | null> {
  const raw = await storage.get(attemptStorageKey(scope));
  if (raw === null) return null;
  // Corrupt/inaccessible storage must not be interpreted as proof no write happened.
  return AttemptSchema.parse(JSON.parse(raw));
}

export class DraftAttemptBlockedError extends Error {
  constructor(readonly attempt: DraftAttempt) {
    super('A previous draft must be reviewed or reconciled before another request.');
    this.name = 'DraftAttemptBlockedError';
  }
}

export function isConfirmedDraftRejection(error: unknown): boolean {
  if (error instanceof MissingClerkTokenError) return true;
  if (!(error instanceof ApiError)) return false;
  const body = error.body as { intakeId?: unknown } | null;
  return !body?.intakeId && [400, 401, 402, 403, 404, 413, 422, 429].includes(error.status);
}

const inFlight = new Set<string>();

export async function runGuardedJobDraft(
  scope: DraftScope,
  request: JobQuoteRequest,
  dispatch: (request: JobQuoteRequest) => Promise<JobQuoteOperation>,
): Promise<JobQuoteOperation> {
  const key = attemptStorageKey(scope);
  if (inFlight.has(key)) throw new DraftAttemptBlockedError({ status: 'pending' });
  inFlight.add(key);
  try {
    const existing = await loadDraftAttempt(scope);
    if (existing) throw new DraftAttemptBlockedError(existing);
    // This durable write must finish before ANY request capable of creating an intake.
    const operationId = randomUUID();
    await storage.set(key, JSON.stringify({ status: 'pending', operationId }));
    let result: JobQuoteOperation;
    try {
      result = await dispatch({ ...request, operation_id: operationId });
      if (result.operationId !== operationId) throw new Error('Draft operation identity mismatch.');
    } catch (error) {
      if (isConfirmedDraftRejection(error)) await storage.remove(key);
      else await storage.set(key, JSON.stringify({ status: 'unknown', operationId }));
      throw error;
    }
    // If this write fails, the durable pending fence remains. The UI may show the
    // returned ID but must not offer Start another until a successful readback.
    await storage.set(key, JSON.stringify(attemptFromOperation(result)));
    return result;
  } finally {
    inFlight.delete(key);
  }
}

function attemptFromOperation(result: JobQuoteOperation): DraftAttempt {
  const base = {
    operationId: result.operationId,
    pinned: result.pinned,
    pinRequested: result.pinRequested,
  };
  if (result.status === 'completed')
    return { ...base, status: 'succeeded', quoteId: result.quoteId };
  if (result.status === 'quote_available')
    return { ...base, status: 'quote_available', quoteId: result.quoteId };
  return { ...base, status: result.status === 'processing' ? 'pending' : result.status };
}

/** Read only: missing/failed readback never releases the previous attempt.
 * Pre-contract receipts remain fenced because they have no server identity. */
export async function reconcileJobDraft(
  scope: DraftScope,
  read: (id: string) => Promise<JobQuoteOperation>,
): Promise<DraftAttempt | null> {
  const key = attemptStorageKey(scope);
  if (inFlight.has(key)) throw new DraftAttemptBlockedError({ status: 'pending' });
  inFlight.add(key);
  try {
    const previous = await loadDraftAttempt(scope);
    if (
      !previous?.operationId ||
      previous.status === 'succeeded' ||
      previous.status === 'failed_no_commit'
    )
      return previous;
    const result = await read(previous.operationId);
    if (result.operationId !== previous.operationId)
      throw new Error('Draft operation identity mismatch.');
    const next = attemptFromOperation(result);
    await storage.set(key, JSON.stringify(next));
    return next;
  } finally {
    inFlight.delete(key);
  }
}

/** A saved completion or authoritative no-intake/quote failure permits a NEW identity. */
export async function beginAnotherJobDraft(scope: DraftScope): Promise<void> {
  const key = attemptStorageKey(scope);
  if (inFlight.has(key)) throw new DraftAttemptBlockedError({ status: 'pending' });
  inFlight.add(key);
  try {
    const existing = await loadDraftAttempt(scope);
    if (existing?.status !== 'succeeded' && existing?.status !== 'failed_no_commit') {
      throw new DraftAttemptBlockedError(existing ?? { status: 'unknown' });
    }
    await storage.remove(key);
  } finally {
    inFlight.delete(key);
  }
}
