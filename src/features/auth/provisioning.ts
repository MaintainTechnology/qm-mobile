import { z } from 'zod';
import { apiRequest } from '@/lib/api';

export const PhoneReadinessSchema = z
  .object({
    version: z.literal(1),
    tenantId: z.string().uuid(),
    operationId: z.string().uuid().nullable(),
    state: z.enum(['ready', 'stub', 'incomplete', 'processing', 'unknown', 'not_started']),
    setupComplete: z.boolean(),
    retryable: z.boolean(),
    phoneNumber: z.string().nullable(),
    smsReady: z.boolean(),
    voiceReady: z.boolean(),
    provisioningMode: z.object({
      twilio: z.enum(['real', 'stub']),
      vapi: z.enum(['real', 'stub']),
    }),
    message: z.string(),
  })
  .superRefine((value, ctx) => {
    if (
      value.setupComplete !== (value.state === 'ready') ||
      (value.state === 'ready' &&
        (!value.operationId ||
          !value.smsReady ||
          !value.voiceReady ||
          value.provisioningMode.twilio !== 'real' ||
          value.provisioningMode.vapi !== 'real' ||
          !/^\+[1-9]\d{7,14}$/.test(value.phoneNumber ?? ''))) ||
      (value.retryable && (value.state !== 'not_started' || value.operationId !== null))
    ) {
      ctx.addIssue({ code: 'custom', message: 'Inconsistent phone readiness result' });
    }
  });
export type PhoneReadiness = z.infer<typeof PhoneReadinessSchema>;
export const ActivationResponseSchema = z.looseObject({
  ok: z.boolean(),
  tenantId: z.string().optional(),
  phoneNumber: z.string().nullish(),
  warning: z.string().nullish(),
  error: z.string().nullish(),
  setupComplete: z.boolean().optional(),
  phoneReadiness: PhoneReadinessSchema.optional(),
});
const StatusResponseSchema = z.object({
  ok: z.literal(true),
  tenantId: z.string().uuid(),
  phoneReadiness: PhoneReadinessSchema,
});
export async function readPhoneReadiness(
  token: string,
  tenantId?: string,
): Promise<PhoneReadiness> {
  const response = await apiRequest('/api/onboard/provisioning-status', StatusResponseSchema, {
    token,
  });
  if (
    response.tenantId !== response.phoneReadiness.tenantId ||
    (tenantId && response.tenantId !== tenantId)
  ) {
    throw new Error('Phone setup belongs to a different account. Refresh your account.');
  }
  return response.phoneReadiness;
}
export function activatedPhoneReadiness(response: z.infer<typeof ActivationResponseSchema>) {
  if (!response.ok)
    throw new Error(response.error ?? response.warning ?? 'Account activation was not confirmed.');
  if (response.phoneReadiness && response.phoneReadiness.tenantId !== response.tenantId) {
    throw new Error('Activation returned a different phone setup account.');
  }
  return response.phoneReadiness;
}
