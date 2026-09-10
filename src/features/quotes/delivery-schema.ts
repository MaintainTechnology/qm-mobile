import { z } from 'zod';

/** Provider acceptance is separate from confirmed carrier delivery. */
export const QuoteActionResultSchema = z.looseObject({
  ok: z.literal(true),
  already_actioned: z.boolean().nullish(),
  approved: z.boolean().optional(),
  accepted: z.boolean().optional(),
  outboxId: z.string().uuid().nullish(),
  quote_id: z.string().nullish(),
  finalQuoteId: z.string().uuid().optional(),
  channel: z.string().optional(),
  sid: z.string().optional(),
  messageId: z.string().optional(),
  status: z.string().nullish(),
  message: z.string().nullish(),
});
export type QuoteActionResult = z.infer<typeof QuoteActionResultSchema>;
export const SmsDeliverySchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    'pending',
    'retry',
    'sending',
    'accepted',
    'delivered',
    'failed',
    'undelivered',
    'unknown',
  ]),
  provider_status: z.string().nullable(),
  requires_attention: z.boolean(),
  attempts: z.number().int().nonnegative(),
});
export type SmsDelivery = z.infer<typeof SmsDeliverySchema>;
export const SmsDeliveryListSchema = z.object({ messages: z.array(SmsDeliverySchema) });
export const QuoteDeliveryReadbackSchema = z
  .object({
    ok: z.literal(true),
    quoteId: z.string().uuid(),
    requestId: z.string().uuid().nullable(),
    status: z.enum([
      'not_found',
      'pending',
      'retry',
      'sending',
      'accepted',
      'delivered',
      'failed',
      'undelivered',
      'unknown',
    ]),
    outboxId: z.string().uuid().nullable(),
    approved: z.boolean(),
    message: SmsDeliverySchema.nullable(),
  })
  .refine(value =>
    value.message
      ? value.message.id === value.outboxId && value.message.status === value.status
      : value.outboxId === null && value.status === 'not_found',
  );
export type QuoteDeliveryReadback = z.infer<typeof QuoteDeliveryReadbackSchema>;
export const FinalPaymentReadbackSchema = z.union([
  z
    .intersection(
      QuoteDeliveryReadbackSchema,
      z.object({
        finalQuoteId: z.string().uuid(),
        balancePaid: z.boolean(),
      }),
    )
    .refine(value => value.finalQuoteId.toLowerCase() !== value.quoteId.toLowerCase()),
  z.object({
    ok: z.literal(true),
    finalQuoteId: z.string().uuid(),
    quoteId: z.null(),
    requestId: z.string().uuid().nullable(),
    status: z.literal('not_created'),
    message: z.null(),
  }),
]);
export const SmsRetrySchema = z.object({ ok: z.literal(true), status: z.literal('retry') });
