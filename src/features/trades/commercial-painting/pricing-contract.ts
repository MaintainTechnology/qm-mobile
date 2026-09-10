import { z } from 'zod';

export const PaintScopeSchema = z.object({
  userId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/), tenantId: z.string().uuid(),
}).strict();
export type PaintScope = z.infer<typeof PaintScopeSchema>;
export const PaintReviewSchema = z.object({
  pricingProof: z.string().regex(/^[a-f0-9]{64}$/),
  // The server's microseconds identify the reviewed pass. Date loses precision.
  pricedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/),
}).strict();
export const PaintPassSchema = PaintReviewSchema.extend({
  paintRunId: z.string().uuid(), extractionId: z.string().uuid(),
});
export type PaintPass = z.infer<typeof PaintPassSchema>;
export const PaintLabourBasisSchema = z.object({
  mode: z.enum(['tenant', 'override']), ratePerHr: z.number().positive().nullable(),
});
export const PaintSavedSchema = PaintPassSchema.extend({
  ok: z.literal(true), quoteId: z.string().uuid(),
  shareToken: z.string().regex(/^[A-Za-z0-9_-]{8,200}$/), quoteViewUrl: z.string(),
  pdfUrl: z.string().nullable(), alreadySaved: z.boolean().optional(),
  delivery: z.object({ attempted: z.literal(false) }),
}).strip();
export type PaintSaved = z.infer<typeof PaintSavedSchema>;
export const PaintRecoverySchema = z.union([
  PaintSavedSchema.extend({ status: z.literal('saved') }),
  PaintPassSchema.extend({ ok: z.literal(true), status: z.literal('not_found') }),
]);
export function samePaintPass(a: PaintPass, b: PaintPass) {
  return a.paintRunId === b.paintRunId && a.extractionId === b.extractionId &&
    a.pricingProof === b.pricingProof && a.pricedAt === b.pricedAt;
}
export function readPaintSaved(body: unknown, pass: PaintPass): PaintSaved {
  const result = PaintSavedSchema.parse(body);
  if (!samePaintPass(result, pass) || result.quoteViewUrl !== `/q/${result.shareToken}` ||
      (result.pdfUrl !== null && result.pdfUrl !== `/api/q/${result.shareToken}/pdf`))
    throw new Error('The saved quote does not match the pricing you reviewed. Check its status again.');
  return result;
}
/** Canonical equality only. Pricing and tax calculations remain on the server. */
export function paintInputKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(paintInputKey).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${paintInputKey(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
