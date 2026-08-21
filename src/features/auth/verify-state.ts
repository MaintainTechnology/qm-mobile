/**
 * Clerk's attemptEmailAddressVerification is one-shot: once a code verifies,
 * re-attempting throws `verification_already_verified`. Every press of the
 * verify CTA must therefore converge on activation from whatever state the
 * sign-up is in, rather than blindly re-attempting.
 */

export const ALREADY_VERIFIED = 'verification_already_verified';

type SignUpLike = {
  status: string | null;
  verifications: { emailAddress: { status: string | null } };
};

/** True when the code attempt must be skipped — it already succeeded. */
export function emailAlreadyVerified(signUp: SignUpLike): boolean {
  return signUp.status === 'complete' || signUp.verifications.emailAddress.status === 'verified';
}

/**
 * The Clerk instance requires a username but the wizard deliberately has no
 * username field — QuoteMax identity is the email. Derive one Clerk accepts
 * (letters/digits/_/- only) with a random suffix to dodge collisions.
 * Keep the dashboard attribute enabled-but-optional, not disabled, or Clerk
 * will reject the parameter outright.
 */
export function usernameFromEmail(email: string): string {
  // Web convention (sign-up page deriveUsername): qm_<local>_<random>, [a-z0-9_], ≤ 64.
  const base = (email.split('@')[0] ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'tradie';
  const suffix = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `qm_${base}_${suffix}`.slice(0, 64);
}
