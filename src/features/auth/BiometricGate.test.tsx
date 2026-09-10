import { act, fireEvent, render } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { BiometricGate } from './BiometricGate';

const mockLockEnabled = jest.fn();
const mockLockAvailable = jest.fn();
const mockAuthenticate = jest.fn();
const mockSignOut = jest.fn();
const mockClear = jest.fn();
const mockUnregister = jest.fn();
const mockReplace = jest.fn();
let mockAuth = { isLoaded: true, isSignedIn: true, userId: 'a', sessionId: 'a-session' };

jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ ...mockAuth, signOut: mockSignOut, getToken: jest.fn() }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }));
jest.mock('@/lib/account-storage', () => ({ clearAccountScopedState: () => mockClear() }));
jest.mock('@/lib/notifications', () => ({ unregisterPushToken: () => mockUnregister() }));
jest.mock('@/lib/lock', () => ({
  ...jest.requireActual('@/lib/lock'),
  isLockEnabled: () => mockLockEnabled(),
  isLockAvailable: () => mockLockAvailable(),
  authenticate: () => mockAuthenticate(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

let onState: (state: AppStateStatus) => void;
const mounts = jest.fn();
const unmounts = jest.fn();
function PrivateContent() {
  useEffect(() => {
    mounts();
    return () => {
      unmounts();
    };
  }, []);
  return <Text>Customer address for {mockAuth.userId}</Text>;
}
const screen = () => (
  <BiometricGate>
    <PrivateContent />
  </BiometricGate>
);
async function changeState(next: AppStateStatus) {
  AppState.currentState = next;
  await act(() => onState(next));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = { isLoaded: true, isSignedIn: true, userId: 'a', sessionId: 'a-session' };
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    onState = listener;
    return { remove: jest.fn() };
  });
  mockLockEnabled.mockResolvedValue(true);
  mockLockAvailable.mockResolvedValue(true);
  mockAuthenticate.mockResolvedValue(false);
  mockSignOut.mockResolvedValue(undefined);
  mockClear.mockResolvedValue(undefined);
  mockUnregister.mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('biometric privacy gate at the actual child mount boundary', () => {
  it('mounts no customer screen before delayed preference, hardware and successful unlock', async () => {
    const preference = deferred<boolean>();
    const hardware = deferred<boolean>();
    const auth = deferred<boolean>();
    mockLockEnabled.mockReturnValue(preference.promise);
    mockLockAvailable.mockReturnValue(hardware.promise);
    mockAuthenticate.mockReturnValue(auth.promise);
    const ui = await render(screen());
    expect(ui.getByText('CHECKING APP LOCK')).toBeTruthy();
    expect(mounts).not.toHaveBeenCalled();
    await act(() => preference.resolve(true));
    expect(mounts).not.toHaveBeenCalled();
    await act(() => hardware.resolve(true));
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(mounts).not.toHaveBeenCalled();
    await act(() => auth.resolve(true));
    expect(ui.getByText('Customer address for a')).toBeTruthy();
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it.each(['disabled', 'unavailable'])(
    'preserves explicit %s opt-out behavior after the check',
    async condition => {
      if (condition === 'disabled') mockLockEnabled.mockResolvedValue(false);
      else mockLockAvailable.mockResolvedValue(false);
      const ui = await render(screen());
      expect(ui.getByText('Customer address for a')).toBeTruthy();
      expect(mockAuthenticate).not.toHaveBeenCalled();
    },
  );

  it('does not probe a signed-out screen', async () => {
    mockAuth.isSignedIn = false;
    const ui = await render(screen());
    expect(ui.getByText('Customer address for a')).toBeTruthy();
    expect(mockLockEnabled).not.toHaveBeenCalled();
  });

  it('covers unreadable lock preference, then allows retry without treating the error as disabled', async () => {
    mockLockEnabled.mockRejectedValueOnce(new Error('Keychain unavailable'));
    const ui = await render(screen());
    expect(ui.getByText('APP LOCK UNAVAILABLE')).toBeTruthy();
    expect(mounts).not.toHaveBeenCalled();
    await fireEvent.press(ui.getByRole('button', { name: 'Try again' }));
    expect(ui.getByText('UNLOCK QUOTEMAX')).toBeTruthy();
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(mounts).not.toHaveBeenCalled();
  });

  it('times out a stuck preference and ignores its eventual result', async () => {
    jest.useFakeTimers();
    const delayed = deferred<boolean>();
    mockLockEnabled.mockReturnValue(delayed.promise);
    const ui = await render(screen());
    await act(() => jest.advanceTimersByTime(10_000));
    expect(ui.getByText('APP LOCK UNAVAILABLE')).toBeTruthy();
    await act(() => delayed.resolve(false));
    expect(mounts).not.toHaveBeenCalled();
  });

  it('does not repeat a canceled automatic prompt; the Unlock button can retry', async () => {
    const ui = await render(screen());
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(mounts).not.toHaveBeenCalled();
    mockAuthenticate.mockResolvedValueOnce(true);
    await fireEvent.press(ui.getByRole('button', { name: 'Unlock' }));
    expect(mockAuthenticate).toHaveBeenCalledTimes(2);
    expect(ui.getByText('Customer address for a')).toBeTruthy();
  });

  it('handles a rejected device prompt without an unhandled rejection or content exposure', async () => {
    mockAuthenticate.mockRejectedValue(new Error('Native authentication unavailable'));
    const ui = await render(screen());
    expect(ui.getByRole('button', { name: 'Unlock' })).toBeEnabled();
    expect(mounts).not.toHaveBeenCalled();
  });

  it('ignores an old account unlock result and probes the new session separately', async () => {
    const oldAuth = deferred<boolean>();
    mockAuthenticate.mockReturnValueOnce(oldAuth.promise);
    const ui = await render(screen());
    mockAuth = { ...mockAuth, userId: 'b', sessionId: 'b-session' };
    await ui.rerender(screen());
    await act(() => oldAuth.resolve(true));
    expect(mounts).not.toHaveBeenCalled();
    expect(mockAuthenticate).toHaveBeenCalledTimes(2);
    expect(ui.getByText('UNLOCK QUOTEMAX')).toBeTruthy();
  });

  it('ignores an old account preference result instead of exposing the new account', async () => {
    const oldCheck = deferred<boolean>();
    mockLockEnabled.mockReturnValueOnce(oldCheck.promise);
    const ui = await render(screen());
    mockAuth = { ...mockAuth, userId: 'b', sessionId: 'b-session' };
    await ui.rerender(screen());
    await act(() => oldCheck.resolve(false));
    expect(mounts).not.toHaveBeenCalled();
    expect(ui.getByText('UNLOCK QUOTEMAX')).toBeTruthy();
  });

  it('covers inactive returns, retains mounted work and respects the existing 30-second grace', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(100_000);
    mockAuthenticate.mockResolvedValueOnce(true);
    const ui = await render(screen());
    await changeState('inactive');
    expect(ui.queryByText('Customer address for a')).toBeNull();
    await act(() => jest.advanceTimersByTime(20_000));
    await changeState('background');
    await act(() => jest.advanceTimersByTime(10_001));
    await changeState('active');
    expect(ui.getByText('UNLOCK QUOTEMAX')).toBeTruthy();
    expect(mockAuthenticate).toHaveBeenCalledTimes(2);
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(unmounts).not.toHaveBeenCalled();
  });

  it('does not accept success from a prompt abandoned when the app enters the background', async () => {
    const auth = deferred<boolean>();
    mockAuthenticate.mockReturnValueOnce(auth.promise);
    const ui = await render(screen());
    await changeState('background');
    await act(() => auth.resolve(true));
    await changeState('active');
    expect(mounts).not.toHaveBeenCalled();
    expect(ui.getByRole('button', { name: 'Unlock' })).toBeEnabled();
  });

  it('does not restart a prompt for the inactive/active transition caused by Face ID', async () => {
    const auth = deferred<boolean>();
    mockAuthenticate.mockReturnValueOnce(auth.promise);
    const ui = await render(screen());
    await changeState('inactive');
    await changeState('active');
    await act(() => auth.resolve(true));
    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(ui.getByText('Customer address for a')).toBeTruthy();
  });

  it('keeps quotes covered and sign-out retry available when Clerk sign-out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('offline'));
    const ui = await render(screen());
    await fireEvent.press(ui.getByRole('button', { name: 'Sign out' }));
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(ui.getByRole('alert')).toBeTruthy();
    expect(ui.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    expect(mounts).not.toHaveBeenCalled();
  });

  it('does not clear a new account when an old sign-out finishes retiring push late', async () => {
    const unregister = deferred<void>();
    mockUnregister.mockReturnValueOnce(unregister.promise);
    const ui = await render(screen());
    await fireEvent.press(ui.getByRole('button', { name: 'Sign out' }));
    mockAuth = { ...mockAuth, userId: 'b', sessionId: 'b-session' };
    await ui.rerender(screen());
    await act(() => unregister.resolve());
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('finishes cleanup when its own Clerk sign-out has already unmounted the private session', async () => {
    const signOut = deferred<void>();
    mockSignOut.mockReturnValueOnce(signOut.promise);
    const ui = await render(screen());
    await fireEvent.press(ui.getByRole('button', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    mockAuth = { ...mockAuth, isSignedIn: false };
    await ui.rerender(screen());
    await act(() => signOut.resolve());
    expect(mockClear).toHaveBeenCalledTimes(1);
  });
});
