import { MissingClerkTokenError, requireClerkToken } from './auth-token';

describe('required Clerk token boundary', () => {
  it('returns a real token unchanged', () => {
    expect(requireClerkToken('clerk.jwt')).toBe('clerk.jwt');
  });

  it('fails closed instead of allowing legacy or anonymous fallback', () => {
    expect(() => requireClerkToken(null)).toThrow(MissingClerkTokenError);
    expect(() => requireClerkToken(undefined)).toThrow(MissingClerkTokenError);
    expect(() => requireClerkToken('')).toThrow(MissingClerkTokenError);
  });
});
