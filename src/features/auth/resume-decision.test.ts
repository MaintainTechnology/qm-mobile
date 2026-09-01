import { decideDuplicateEmail, resumeOnboardingHref, successHref } from './resume-decision';

describe('decideDuplicateEmail (spec A3)', () => {
  it('a failed password proof always needs sign-in, regardless of tenant status', () => {
    expect(decideDuplicateEmail({ signInFailed: true, tenantStatus: null })).toBe('needs_signin');
    expect(decideDuplicateEmail({ signInFailed: true, tenantStatus: 404 })).toBe('needs_signin');
  });

  it('a clean 404 after proving ownership resumes the wizard', () => {
    expect(decideDuplicateEmail({ signInFailed: false, tenantStatus: 404 })).toBe('resume');
  });

  it('a real tenant sends the tradie straight to the dashboard', () => {
    expect(decideDuplicateEmail({ signInFailed: false, tenantStatus: 200 })).toBe(
      'existing_account',
    );
  });

  it('fails CLOSED — an outage or non-404 error never resumes', () => {
    expect(decideDuplicateEmail({ signInFailed: false, tenantStatus: null })).toBe(
      'existing_account',
    );
    expect(decideDuplicateEmail({ signInFailed: false, tenantStatus: 500 })).toBe(
      'existing_account',
    );
    expect(decideDuplicateEmail({ signInFailed: false, tenantStatus: 401 })).toBe(
      'existing_account',
    );
  });
});

describe('resumeOnboardingHref (spec A2)', () => {
  it('carries the clerk user id and the resume flag', () => {
    expect(resumeOnboardingHref('user_abc123')).toBe('/sign-up?resume=1&uid=user_abc123');
  });
});

describe('successHref (spec B6)', () => {
  it('drops empty params rather than sending blank query keys', () => {
    expect(
      successHref({
        firstName: 'Jean',
        phoneNumber: null,
        warning: null,
        sessionId: null,
        clerkUserId: '',
        setupComplete: false,
      }),
    ).toBe('/success?name=Jean&ready=0');
  });

  it('carries every provided param, url-encoded', () => {
    const href = successHref({
      firstName: 'Jean',
      phoneNumber: '+61412345678',
      warning: 'Twilio not funded yet',
      sessionId: 'sess_1',
      clerkUserId: 'user_1',
      setupComplete: true,
    });
    expect(href).toBe(
      '/success?name=Jean&phone=%2B61412345678&warning=Twilio%20not%20funded%20yet&session=sess_1&uid=user_1&ready=1',
    );
  });
});
