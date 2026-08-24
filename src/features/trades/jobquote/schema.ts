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
};

/** The route answers non-2xx for every logical failure, so the only 200 shape is success. */
export const JobQuoteResponseSchema = z.looseObject({
  ok: z.literal(true),
  intakeId: z.string(),
  quoteId: z.string(),
  shareToken: z.string().nullable(),
  needsInspection: z.boolean(),
  pinned: z.boolean().optional(),
  pinRequested: z.boolean().optional(),
});
export type JobQuoteResponse = z.infer<typeof JobQuoteResponseSchema>;

/** The shape of a non-2xx job-quote failure body (ApiError.body) — mirrors the web's
 *  explainFailure() input so this app can give the same tradie-actionable copy. */
export type JobQuoteFailureBody = {
  error?: string;
  reason?: string;
  issues?: string[];
  intakeId?: string;
};

export const CatalogueRowSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  trade: z.string().nullable(),
  brand: z.string().nullable(),
  range_series: z.string().nullable(),
  unit_price_ex_gst: z.union([z.number(), z.string()]).nullable(),
  image_path: z.string().nullable(),
  tier_hint: z.string().nullable(),
  active: z.boolean().nullable(),
});
export type CatalogueRow = z.infer<typeof CatalogueRowSchema>;

export const CatalogueResponseSchema = z.looseObject({
  catalogue: z.array(CatalogueRowSchema).default([]),
});

/** Ex-GST price label for the catalogue picker. */
export function priceLabel(v: number | string | null): string | null {
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  return n != null && Number.isFinite(n) ? `${formatAud(centsFromApiDollars(n))} ex GST` : null;
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
      ? `${err.message} — the quote may still have been drafted. Check the Quotes tab before trying again.`
      : 'Something went wrong. Check your connection and try again.';
  }
  const body = (err.body ?? {}) as JobQuoteFailureBody;
  if (body.issues?.length) return body.issues.join(', ');

  const checkFirst =
    ' The quote may still have been drafted — check the Quotes tab before retrying.';

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
      return 'The job was priced but could not be saved. Try again — nothing was charged.';
    case 'draft_failed':
    case 'draft_incomplete':
      return `The job was saved but the quote did not finish drafting.${body.intakeId ? checkFirst : ' Try again in a moment.'}`;
    case 'pipeline_failed':
      return `Drafting failed part-way — usually a temporary upstream problem. Wait a moment and try again.${body.intakeId ? checkFirst : ''}`;
  }

  if (err.status === 504 || err.status === 502) return `The request timed out.${checkFirst}`;
  return `Could not draft the quote (${err.status}).${checkFirst}`;
}
