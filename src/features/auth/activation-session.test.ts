import { activationBearerToken } from './activation-session';

describe('activationBearerToken', () => {
  it('mints from the exact pending session before it becomes active', async () => {
    const getActiveToken = jest.fn(async () => 'wrong-active-token');
    const token = await activationBearerToken({
      sessionId: 'pending-session',
      activeSessionId: 'old-active-session',
      sessions: [
        { id: 'pending-session', getToken: jest.fn(async () => 'pending-token') },
      ],
      getActiveToken,
    });

    expect(token).toBe('pending-token');
    expect(getActiveToken).not.toHaveBeenCalled();
  });

  it('uses the active token for a resumed activation of that same session', async () => {
    await expect(
      activationBearerToken({
        sessionId: 'active-session',
        activeSessionId: 'active-session',
        sessions: [],
        getActiveToken: jest.fn(async () => 'active-token'),
      }),
    ).resolves.toBe('active-token');
  });

  it('never falls back to an unrelated active session', async () => {
    const getActiveToken = jest.fn(async () => 'wrong-active-token');
    await expect(
      activationBearerToken({
        sessionId: 'pending-session',
        activeSessionId: 'other-session',
        sessions: [],
        getActiveToken,
      }),
    ).resolves.toBeUndefined();
    expect(getActiveToken).not.toHaveBeenCalled();
  });

  it('treats a blank token as unavailable', async () => {
    await expect(
      activationBearerToken({
        sessionId: null,
        activeSessionId: 'active-session',
        sessions: [],
        getActiveToken: jest.fn(async () => '   '),
      }),
    ).resolves.toBeUndefined();
  });
});
