/**
 * Job quoter — request/response shapes (spec web-parity F2). Ported from
 * quotemate-automation/app/api/tenant/job-quote/route.ts (BodySchema, response
 * envelope) and app/api/tenant/catalogue/route.ts (GET shape). Loose per H2 — the
 * web catalogue row carries far more (properties, cost price...) than this picker needs.
 */
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { centsFromApiDollars, formatAud } from '@/lib/money';

export type JobQuoteRequest = {
  operation_id?: string;
  job_type: string;
  address: string;
  suburb: string;
  answers: Record<string, string>;
  notes: string;
  customer_name: string;
  customer_mobile: string;
  customer_email: string;
  product_name?: string;
  product_id?: string;
  photo_paths?: string[];
  photo_urls?: string[];
};

/** The route answers non-2xx for every logical failure, so the only 200 shape is success. */
export const JobQuoteResponseSchema = z.looseObject({
  ok: z.literal(true),
  intakeId: z.string(),
  quoteId: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9_-]+$/),
  shareToken: z.string().nullable(),
  needsInspection: z.boolean(),
  pinned: z.boolean().optional(),
  pinRequested: z.boolean().optional(),
});
export type JobQuoteResponse = z.infer<typeof JobQuoteResponseSchema>;

const OperationBase = z.object({
  ok: z.literal(true),
  operationId: z.string().uuid(),
  pinned: z.boolean(),
  pinRequested: z.boolean(),
});
const SavedOperation = OperationBase.extend({
  quoteId: z.string().uuid(),
  intakeId: z.string().uuid(),
  shareToken: z.string().nullable(),
  needsInspection: z.boolean(),
});
export const JobQuoteOperationSchema = z.discriminatedUnion('status', [
  OperationBase.extend({ status: z.literal('processing') }),
  OperationBase.extend({ status: z.literal('unknown') }),
  OperationBase.extend({ status: z.literal('failed_no_commit') }),
  SavedOperation.extend({ status: z.literal('quote_available') }),
  SavedOperation.extend({ status: z.literal('completed') }),
]);
export type JobQuoteOperation = z.infer<typeof JobQuoteOperationSchema>;

/** The shape of a non-2xx job-quote failure body (ApiError.body) — mirrors the web's
 *  explainFailure() input so this app can give the same tradie-actionable copy. */
export type JobQuoteFailureBody = {
  error?: string;
  reason?: string;
  issues?: string[];
  intakeId?: string;
};

/** Ex-GST price label for the catalogue picker. */
export function priceLabel(v: number | string | null): string | null {
  const n = typeof v === 'string' ? (v.trim() ? Number(v) : null) : v;
  return n != null && Number.isFinite(n) && n >= 0
    ? `${formatAud(centsFromApiDollars(n))} ex GST`
    : null;
}

/**
 * Turns a thrown job-quote failure into tradie-actionable copy — ported from the
 * web's explainFailure() (JobQuoteForm.tsx) so a tradie standing at the job sees
 * the same guidance either surface. Every branch below is a real shape the route
 * (or its feature/entitlement guard) returns.
 */
export function explainJobQuoteFailure(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error
      ? `${err.message} — the quote may still have been drafted. Refresh draft status or check the Quotes tab.`
      : 'The draft result is unconfirmed. Refresh draft status when connected.';
  }
  const body = (err.body ?? {}) as JobQuoteFailureBody;
  if (body.issues?.length) return body.issues.join(', ');

  const checkFirst =
    ' The quote may still have been drafted — refresh draft status or check the Quotes tab.';

  switch (body.error) {
    case 'unauthorized':
      return 'Your session expired. Sign in again.';
    case 'no_tenant':
      return 'No tradie account is linked to this login. Contact QuoteMax support.';
    case 'feature_not_enabled':
      return "This trade isn't enabled on your account. Contact QuoteMax support.";
    case 'not_entitled':
    case 'voice_not_entitled':
      return `Quoting is not enabled on your plan${body.reason ? ` (${body.reason})` : ''}.`;
    case 'invalid_body':
      return 'Some answers were rejected. Check the fields and try again.';
    case 'intake_insert_failed':
      return `The job save was not confirmed.${checkFirst}`;
    case 'draft_failed':
    case 'draft_incomplete':
      return `The quote did not return a completed result.${checkFirst}`;
    case 'pipeline_failed':
      return `Drafting stopped part-way.${checkFirst}`;
    case 'operation_input_conflict':
      return 'This attempt is already bound to different inputs. Refresh its status before starting another job.';
    case 'operation_unconfirmed':
      return 'The operation result could not be confirmed. Refresh draft status; the request will not be submitted again.';
  }

  if (err.status === 504 || err.status === 502) return `The request timed out.${checkFirst}`;
  return `Could not draft the quote (${err.status}).${checkFirst}`;
}
