/** AUTH-008 trusted native adapters for the activation success screen. */
import type { AcquisitionEnvelope } from './acquisition-envelope';

export const OWNER_TEST_SMS_BODY = 'test from owner';

export type UntrustedSuccessHints = {
  phone?: string | null;
  warning?: string | null;
  ready?: string | null;
};

export type TrustedSuccessState = {
  hasReceipt: boolean;
  phoneNumber: string | null;
  warning: string | null;
  setupComplete: boolean;
};

/** Query values are routing hints only. Success state comes exclusively from
 * the account-bound receipt written after a validated server response. */
export function trustedSuccessState(
  envelope: AcquisitionEnvelope | null,
  _hints: UntrustedSuccessHints = {},
): TrustedSuccessState {
  const receipt = envelope?.activation === 'complete' ? envelope.provisioning : undefined;
  return {
    hasReceipt: receipt !== undefined,
    phoneNumber: receipt?.phoneNumber ?? null,
    warning: receipt?.warning ?? null,
    setupComplete: receipt?.setupComplete === true,
  };
}

export function trustedDedicatedNumber(
  phoneNumber: string | null | undefined,
  setupComplete: boolean,
): string | null {
  if (!setupComplete || !phoneNumber) return null;
  const compact = phoneNumber.replace(/\s+/g, '');
  return /^\+614\d{8}$/.test(compact) ? compact : null;
}

export function ownerTestSmsHref(
  phoneNumber: string | null | undefined,
  setupComplete: boolean,
): string | null {
  const trusted = trustedDedicatedNumber(phoneNumber, setupComplete);
  return trusted ? `sms:${trusted}?body=${encodeURIComponent(OWNER_TEST_SMS_BODY)}` : null;
}
