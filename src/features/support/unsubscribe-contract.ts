import { z } from 'zod';

// Transport shape only. The server verifies the signature and its suppression
// purpose; the app never decodes the embedded email or tenant as identity.
export const UNSUBSCRIBE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,980}\.[A-Za-z0-9_-]{43}$/;
export function unsubscribeToken(value: unknown): string | null {
  return typeof value === 'string' && UNSUBSCRIBE_TOKEN_PATTERN.test(value) ? value : null;
}
export const UnsubscribeResponseSchema = z.object({ ok: z.literal(true), status: z.literal('unsubscribed') }).strict();
export const UnsubscribeErrorSchema = z.object({ ok: z.literal(false), error: z.enum(['invalid_link', 'unsubscribe_unavailable']) }).strict();
export const UNSUBSCRIBE_DIAGNOSTIC_PATH = '/api/email/unsubscribe/:token';
