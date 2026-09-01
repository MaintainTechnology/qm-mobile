export type ActivationSessionLike = {
  id: string;
  getToken: () => Promise<string | null>;
};

type ActivationBearerArgs = {
  sessionId: string | null;
  activeSessionId: string | null | undefined;
  sessions: readonly ActivationSessionLike[];
  getActiveToken: () => Promise<string | null>;
};

const usable = (token: string | null | undefined): string | undefined =>
  token?.trim() ? token : undefined;

/**
 * Mint the bearer for the session that owns activation. Fresh sign-ups have a
 * completed but not-yet-active session, while resumed onboarding uses the live
 * session. An unrelated active session is never used as a fallback for a
 * different pending session id.
 */
export async function activationBearerToken({
  sessionId,
  activeSessionId,
  sessions,
  getActiveToken,
}: ActivationBearerArgs): Promise<string | undefined> {
  const exactSession = sessionId ? sessions.find(session => session.id === sessionId) : undefined;
  if (exactSession) {
    try {
      const token = usable(await exactSession.getToken());
      if (token) return token;
    } catch {
      // Fall through only when this is also the active session.
    }
  }

  if (activeSessionId && (!sessionId || sessionId === activeSessionId)) {
    try {
      return usable(await getActiveToken());
    } catch {
      return undefined;
    }
  }
  return undefined;
}
