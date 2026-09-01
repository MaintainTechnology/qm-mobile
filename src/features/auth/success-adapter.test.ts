import {
  OWNER_TEST_SMS_BODY,
  ownerTestSmsHref,
  trustedSuccessState,
  trustedDedicatedNumber,
} from './success-adapter';
import type { AcquisitionEnvelope } from './acquisition-envelope';

describe('AUTH-008 success adapters', () => {
  it('ignores crafted success query values without an account-bound server receipt', () => {
    expect(
      trustedSuccessState(null, {
        ready: '1',
        phone: '+61411111111',
        warning: 'Everything is live',
      }),
    ).toEqual({
      hasReceipt: false,
      phoneNumber: null,
      warning: null,
      setupComplete: false,
    });
  });

  it('uses the receipt only for a completed account-bound envelope', () => {
    const envelope = {
      version: 1,
      createdAt: 1,
      updatedAt: 2,
      activation: 'complete',
      subject: { email: 'owner@example.com', clerkUserId: 'user_owner' },
      returnTarget: '/',
      provisioning: {
        setupComplete: true,
        phoneNumber: '+61412345678',
        warning: 'Server warning',
        recordedAt: 2,
      },
    } satisfies AcquisitionEnvelope;

    expect(
      trustedSuccessState(envelope, { ready: '0', phone: '+61499999999' }),
    ).toEqual({
      hasReceipt: true,
      phoneNumber: '+61412345678',
      warning: 'Server warning',
      setupComplete: true,
    });
  });

  it('builds the same explicit owner-test purpose as the web success adapter', () => {
    expect(ownerTestSmsHref('+61412345678', true)).toBe(
      `sms:+61412345678?body=${encodeURIComponent(OWNER_TEST_SMS_BODY)}`,
    );
  });

  it.each([
    [null, true],
    ['', true],
    ['0412345678', true],
    ['+61412345678', false],
    ['+61482012345', false],
  ] as const)('fails closed for missing, untrusted or incomplete number %s', (phone, ready) => {
    expect(trustedDedicatedNumber(phone, ready)).toBeNull();
    expect(ownerTestSmsHref(phone, ready)).toBeNull();
  });
});
