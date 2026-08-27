import * as LocalAuthentication from 'expo-local-authentication';

import {
  LOCK_GRACE_MS,
  authenticate,
  initialLockState,
  lockReducer,
  type LockEvent,
  type LockState,
} from './lock';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const run = (events: LockEvent[], from: LockState = initialLockState) =>
  events.reduce(lockReducer, from);

const unlocked = lockReducer(initialLockState, { type: 'authSucceeded' });

describe('lockReducer', () => {
  it('cold start is locked', () => {
    expect(run([{ type: 'coldStart' }]).status).toBe('locked');
  });

  it('unlocks on auth success and re-prompts only past the 30s grace window', () => {
    // Exactly at the boundary: still inside the grace — "after >30s", not ">=".
    const atBoundary = run(
      [
        { type: 'backgrounded', at: 1_000 },
        { type: 'foregrounded', at: 1_000 + LOCK_GRACE_MS },
      ],
      unlocked,
    );
    expect(atBoundary.status).toBe('unlocked');

    const pastBoundary = run(
      [
        { type: 'backgrounded', at: 1_000 },
        { type: 'foregrounded', at: 1_000 + LOCK_GRACE_MS + 1 },
      ],
      unlocked,
    );
    expect(pastBoundary).toEqual({ status: 'locked', backgroundedAt: null });
  });

  it('a quick app switch does not re-lock', () => {
    const state = run(
      [
        { type: 'backgrounded', at: 5_000 },
        { type: 'foregrounded', at: 9_000 },
      ],
      unlocked,
    );
    expect(state).toEqual({ status: 'unlocked', backgroundedAt: null });
  });

  it('a locked app earns no grace window from backgrounding', () => {
    const state = run([
      { type: 'backgrounded', at: 0 },
      { type: 'foregrounded', at: 1 },
    ]);
    expect(state.status).toBe('locked');
  });

  it('auth failure returns to locked so the tradie can retry', () => {
    const failed = run([{ type: 'authStarted' }, { type: 'authFailed' }]);
    expect(failed.status).toBe('locked');
    const retried = run([{ type: 'authStarted' }, { type: 'authSucceeded' }], failed);
    expect(retried.status).toBe('unlocked');
  });
});

describe('authenticate', () => {
  it('fails OPEN when biometrics are unavailable or unenrolled', async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);
    await expect(authenticate()).resolves.toBe(true);
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  it('reports the device verdict when biometrics are available', async () => {
    jest.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    jest
      .mocked(LocalAuthentication.authenticateAsync)
      .mockResolvedValue({ success: false, error: 'user_cancel' });
    await expect(authenticate()).resolves.toBe(false);
  });
});
