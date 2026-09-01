/** A private Clerk-backed request must never fall through to legacy auth. */
export class MissingClerkTokenError extends Error {
  constructor() {
    super('A current Clerk session token is required for this request.');
    this.name = 'MissingClerkTokenError';
  }
}

export function requireClerkToken(token: string | null | undefined): string {
  if (!token) throw new MissingClerkTokenError();
  return token;
}
