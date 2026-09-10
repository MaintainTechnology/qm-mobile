import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { MissingClerkTokenError } from '@/lib/auth-token';
import { QuoteRevisionSchema, type OwnedQuote } from './owned-quote';

export type FinalQuoteScope = { userId: string; tenantId: string; parentId: string };
export type FinalQuoteRecord = {
  quote: Pick<OwnedQuote['quote'], 'id' | 'tenant_id' | 'quote_kind'>;
  chain: Pick<OwnedQuote['chain'], 'parent'>;
  eligibility: Pick<OwnedQuote['eligibility'], 'issue_final'>;
};
const AttemptSchema = z.discriminatedUnion('state', [
  z.object({ version: z.literal(1), state: z.literal('unknown') }).strict(),
  z
    .object({ version: z.literal(1), state: z.literal('available'), quoteId: z.string().uuid() })
    .strict(),
]);
export type FinalQuoteAttempt = z.infer<typeof AttemptSchema>;
export const FinalQuoteResultSchema = z.object({
  ok: z.literal(true),
  already: z.boolean(),
  quote_id: z.string().uuid(),
  parent_quote_id: z.string().uuid(),
});
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const running = new Set<string>();
async function keyFor(scope: FinalQuoteScope) {
  if (
    ![scope.userId, scope.tenantId, scope.parentId].every(value =>
      /^[A-Za-z0-9_-]{1,160}$/.test(value),
    )
  )
    throw new Error('Reopen this quote with its owning account.');
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync()))
    throw new Error('Encrypted draft recovery is unavailable.');
  return (
    'quotemax.final-quote.v1.' +
    (await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify([scope.userId, scope.tenantId.toLowerCase(), scope.parentId.toLowerCase()]),
    ))
  );
}
async function load(key: string) {
  const raw = await SecureStore.getItemAsync(key, OPTIONS);
  return raw === null ? null : AttemptSchema.parse(JSON.parse(raw));
}
async function save(key: string, value: FinalQuoteAttempt) {
  await SecureStore.setItemAsync(key, JSON.stringify(AttemptSchema.parse(value)), OPTIONS);
}
export async function loadFinalQuoteAttempt(scope: FinalQuoteScope) {
  return load(await keyFor(scope));
}
function verifyParent(scope: FinalQuoteScope, parent: FinalQuoteRecord) {
  if (
    parent.quote.id.toLowerCase() !== scope.parentId.toLowerCase() ||
    parent.quote.tenant_id.toLowerCase() !== scope.tenantId.toLowerCase()
  )
    throw new Error('The returned quote does not belong to this request.');
}
function verifyChild(scope: FinalQuoteScope, child: FinalQuoteRecord, id: string) {
  if (
    child.quote.id.toLowerCase() !== id.toLowerCase() ||
    child.quote.tenant_id.toLowerCase() !== scope.tenantId.toLowerCase() ||
    child.quote.quote_kind !== 'final' ||
    child.chain.parent?.id.toLowerCase() !== scope.parentId.toLowerCase() ||
    id.toLowerCase() === scope.parentId.toLowerCase()
  )
    throw new Error('The final quote’s ownership and parent could not be confirmed.');
}
/** No customer information or share tokens are retained. Unknown creation survives
 * sign-out; recovery is strictly read-only and never recreates a missing child. */
export async function recoverFinalQuote(
  scope: FinalQuoteScope,
  read: (id: string) => Promise<FinalQuoteRecord>,
) {
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('A final quote request is still in progress.');
  running.add(key);
  try {
    const attempt = await load(key);
    if (!attempt) return null;
    const parent = await read(scope.parentId);
    verifyParent(scope, parent);
    const id = parent.eligibility.issue_final.existing_quote_id;
    if (
      !id ||
      !z.string().uuid().safeParse(id).success ||
      (attempt.state === 'available' && attempt.quoteId !== id)
    )
      throw new Error('The final quote outcome is not confirmed yet. Check its status again.');
    const child = await read(id);
    verifyChild(scope, child, id);
    const next = { version: 1 as const, state: 'available' as const, quoteId: id };
    await save(key, next);
    return next;
  } finally {
    running.delete(key);
  }
}
export async function createFinalQuote(
  scope: FinalQuoteScope,
  revision: string,
  dispatch: (body: {
    expected_revision: string;
  }) => Promise<z.infer<typeof FinalQuoteResultSchema>>,
  read: (id: string) => Promise<FinalQuoteRecord>,
) {
  QuoteRevisionSchema.parse(revision);
  const key = await keyFor(scope);
  if (running.has(key)) throw new Error('A final quote request is still in progress.');
  running.add(key);
  try {
    if (await load(key))
      throw new Error('Check the previous final quote request before creating another.');
    await save(key, { version: 1, state: 'unknown' });
    let result: z.infer<typeof FinalQuoteResultSchema>;
    try {
      result = FinalQuoteResultSchema.parse(await dispatch({ expected_revision: revision }));
    } catch (error) {
      const code =
        error instanceof ApiError ? (error.body as { error?: unknown } | null)?.error : null;
      if (
        error instanceof MissingClerkTokenError ||
        (typeof code === 'string' &&
          [
            'invalid_request',
            'quote_review_required',
            'unauthorized',
            'no_quote',
            'not_owner',
            'parent_unscoped',
            'not_initial',
            'site_visit_not_paid',
            'connect_required',
            'not_site_visit_first',
          ].includes(code))
      )
        await SecureStore.deleteItemAsync(key, OPTIONS);
      throw error;
    }
    if (result.parent_quote_id.toLowerCase() !== scope.parentId.toLowerCase())
      throw new Error('The created final quote has a different parent.');
    const child = await read(result.quote_id);
    verifyChild(scope, child, result.quote_id);
    const next = { version: 1 as const, state: 'available' as const, quoteId: result.quote_id };
    await save(key, next);
    return next;
  } finally {
    running.delete(key);
  }
}
