import {
  activatedPhoneReadiness,
  ActivationResponseSchema,
  PhoneReadinessSchema,
} from './provisioning';
const tenantId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const operationId = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const ready = {
  version: 1,
  tenantId,
  operationId,
  state: 'ready',
  setupComplete: true,
  retryable: false,
  phoneNumber: '+61212345678',
  smsReady: true,
  voiceReady: true,
  provisioningMode: { twilio: 'real', vapi: 'real' },
  message: 'Ready',
};
it('does not complete activation for HTTP200 ok:false', () => {
  const response = ActivationResponseSchema.parse({
    ok: false,
    setupComplete: true,
    phoneNumber: '+61482012345',
  });
  expect(() => activatedPhoneReadiness(response)).toThrow('not confirmed');
});
it('requires explicit proof rather than a legacy success boolean', () => {
  expect(
    activatedPhoneReadiness(ActivationResponseSchema.parse({ ok: true, setupComplete: true })),
  ).toBeUndefined();
});
it('accepts a proven SMS-capable local number', () => {
  expect(PhoneReadinessSchema.parse(ready).setupComplete).toBe(true);
});
it.each([
  { operationId: null },
  { smsReady: false },
  { voiceReady: false },
  { phoneNumber: '0412345678' },
  { provisioningMode: { twilio: 'stub', vapi: 'real' } },
  { state: 'stub' },
  { retryable: true },
])('rejects inconsistent ready proof %j', change => {
  expect(PhoneReadinessSchema.safeParse({ ...ready, ...change }).success).toBe(false);
});
it('rejects phone setup associated with a different activated tenant', () => {
  expect(() =>
    activatedPhoneReadiness(
      ActivationResponseSchema.parse({ ok: true, tenantId: operationId, phoneReadiness: ready }),
    ),
  ).toThrow('different');
});
