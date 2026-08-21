import { emailAlreadyVerified, usernameFromEmail } from './verify-state';

const signUp = (status: string, email: string) => ({
  status,
  verifications: { emailAddress: { status: email } },
});

describe('emailAlreadyVerified', () => {
  it('skips the attempt once the sign-up is complete (activation retry path)', () => {
    expect(emailAlreadyVerified(signUp('complete', 'verified'))).toBe(true);
  });

  it('skips the attempt when the email verified but Clerk still wants more fields', () => {
    expect(emailAlreadyVerified(signUp('missing_requirements', 'verified'))).toBe(true);
  });

  it('attempts while the email is still unverified', () => {
    expect(emailAlreadyVerified(signUp('missing_requirements', 'unverified'))).toBe(false);
  });
});

describe('usernameFromEmail (web deriveUsername parity)', () => {
  it('derives qm_<local>_<random> from the email local part', () => {
    expect(usernameFromEmail('jeph.o+test@example.com')).toMatch(/^qm_jephotest_[a-z0-9]{6}$/);
  });

  it('falls back when the local part has no legal characters', () => {
    expect(usernameFromEmail('好@example.com')).toMatch(/^qm_tradie_[a-z0-9]{6}$/);
  });

  it('caps the result at Clerk’s 64-char username limit', () => {
    expect(usernameFromEmail('a'.repeat(80) + '@example.com').length).toBeLessThanOrEqual(64);
  });
});
