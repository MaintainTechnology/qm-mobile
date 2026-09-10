import { z } from 'zod';

import { QuoteRowSchema } from '@/lib/tenant';
import { useApiQuery } from '@/lib/useApi';
import { ReportDocSchema } from './report-editor';

export const QuoteRevisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
const PermissionSchema = z.object({ allowed: z.boolean(), reason: z.string().nullable() });
const EligibilitySchema = PermissionSchema.extend({ existing_quote_id: z.string().nullable() });
const LinkSchema = z.looseObject({
  id: z.string(),
  quote_kind: z.string().nullable(),
  status: z.string().nullable(),
  total_inc_gst: z.number().nullable(),
});
const CentsSchema = z.number().int().nonnegative().safe().nullable();
const OwnedTierSchema = z
  .looseObject({
    label: z.string().nullish(),
    timeframe: z.string().nullish(),
    total_inc_gst: z.number().nullish(),
    subtotal_ex_gst: z.number().nullish(),
    line_items: z
      .array(
        z.looseObject({
          description: z.string().nullish(),
          quantity: z.number().nullish(),
          unit_price_ex_gst: z.number().nullish(),
          unit: z.string().nullish(),
          source: z.string().nullish(),
          supplied_by: z.enum(['tradie', 'customer']).nullish(),
          safety_note: z.string().nullish(),
        }),
      )
      .nullish(),
  })
  .nullish();
export const OwnedQuoteSchema = z
  .object({
    ok: z.literal(true),
    quote: QuoteRowSchema.extend({
      tenant_id: z.string(),
      assumptions: z.array(z.string()).nullish(),
      risk_flags: z.array(z.string()).nullish(),
      gst_note: z.string().nullish(),
      customer_email: z.string().nullish(),
      report_doc: z.unknown().optional(),
      report_style: z.unknown().optional(),
      good: OwnedTierSchema,
      better: OwnedTierSchema,
      best: OwnedTierSchema,
    }),
    edit_revision: QuoteRevisionSchema,
    customer_release_revision: QuoteRevisionSchema,
    report_editor_doc: ReportDocSchema.nullable(),
    gst_registered: z.boolean().nullable(),
    processing: z.object({ ready: z.boolean(), reason: z.string().nullable() }),
    credit_settlement: z
      .object({
        status: z.enum(['settled', 'not_required', 'pending', 'review_required']),
        reason: z.string(),
        outbox_id: z.string().optional(),
        quote_id: z.string().optional(),
      })
      .nullable()
      .optional(),
    intake: z.looseObject({ id: z.string(), remembered_address: z.string().nullable() }).nullable(),
    chain: z.object({
      parent: LinkSchema.nullable(),
      root: LinkSchema.nullable(),
      children: z.array(LinkSchema),
      next_cursor: z.string().nullable(),
    }),
    money: z.object({
      currency: z.literal('AUD'),
      unit: z.literal('cents'),
      source: z.literal('stored_quote_chain'),
      job_total_inc_gst_cents: CentsSchema,
      inspection_credit_cents: CentsSchema,
      deposit_base_cents: CentsSchema,
      balance_base_cents: CentsSchema,
      current_payment_base_cents: CentsSchema,
      platform_fee_cents: CentsSchema,
      customer_charge_cents: CentsSchema,
    }),
    capabilities: z.object({
      price_edit: PermissionSchema,
      document_edit: PermissionSchema,
      force_grounding: PermissionSchema,
      delete: PermissionSchema,
    }),
    eligibility: z.object({ issue_final: EligibilitySchema, request_balance: EligibilitySchema }),
  })
  .superRefine((record, ctx) => {
    const credit = record.credit_settlement;
    if (
      credit &&
      (record.quote.quote_kind !== 'final' ||
        (credit.quote_id !== undefined && credit.quote_id !== record.quote.id) ||
        (credit.status === 'settled' && credit.quote_id !== record.quote.id))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['credit_settlement'],
        message: 'Credit status does not belong to this final quote.',
      });
    }
  });
export type OwnedQuote = z.infer<typeof OwnedQuoteSchema>;
export const ownedQuoteKey = (id: string) => ['tenant', 'owned-quote', id] as const;
export function useOwnedQuote(id: string) {
  return useApiQuery(ownedQuoteKey(id), `/api/quote/${encodeURIComponent(id)}`, OwnedQuoteSchema, {
    enabled: !!id,
  });
}

export const QuoteEditResultSchema = z.looseObject({
  ok: z.literal(true),
  persisted: z.literal(true),
  edit_revision: QuoteRevisionSchema,
  gst_registered: z.boolean(),
  notification_requested: z.boolean(),
  checkout_sync: z.enum(['complete', 'pending']),
});
const ProposalLineSchema = z.looseObject({
  description: z.string(),
  quantity: z.number().nonnegative(),
  unit_price_ex_gst: z.number().nonnegative(),
  original_line_index: z.number().int().nonnegative().optional(),
});
const ProposalTierSchema = z
  .looseObject({
    label: z.string(),
    line_items: z.array(ProposalLineSchema).min(1),
    timeframe: z.string().optional(),
  })
  .nullable()
  .optional();
export const QuoteProposalSchema = z.looseObject({
  ok: z.literal(true),
  assistantMessage: z.string(),
  proposedTiers: z.object({
    good: ProposalTierSchema,
    better: ProposalTierSchema,
    best: ProposalTierSchema,
  }),
  diff: z.array(
    z.looseObject({
      tier: z.string(),
      op: z.string(),
      description: z.string(),
      grounded: z.boolean().optional(),
      reason: z.string().optional(),
    }),
  ),
  anyUngrounded: z.boolean(),
});

const REASONS: Record<string, string> = {
  quote_already_paid: 'This quote has been paid. Its prices are locked.',
  cannot_edit_inspection_quote: 'This is an inspection quote. Tier pricing is unavailable.',
  quote_pricing_review_required:
    'The saved pricing or tax basis needs review before this quote can be edited.',
  pricing_book_misconfigured: 'The owned pricing book needs valid rates before editing.',
  trade_editor_unavailable: 'This trade uses its specialized quote editor.',
  unknown_quote_kind: 'This quote type is unavailable for editing.',
  quote_processing: 'This quote is still being prepared. Refresh its status before editing.',
  quote_processing_unknown:
    'Preparation has not been confirmed complete. Refresh the draft status before editing.',
  quote_document_review_required: 'The saved document needs review before it can be edited safely.',
  document_editor_disabled: 'Document editing has not been enabled for this release.',
};
export function quotePermissionReason(reason: string | null) {
  return (reason && REASONS[reason]) || 'Editing is unavailable for this quote.';
}
