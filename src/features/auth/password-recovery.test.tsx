import { act, fireEvent, render, renderHook } from '@testing-library/react-native';

import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { SignInScreen } from './SignInScreen';
import { usePasswordRecovery } from './use-password-recovery';

const mockCreate = jest.fn();
const mockPrepareFirstFactor = jest.fn();
const mockAttemptFirstFactor = jest.fn();
const mockResetPassword = jest.fn();
const mockPrepareSecondFactor = jest.fn();
const mockAttemptSecondFactor = jest.fn();
const mockReload = jest.fn();
const mockSetActive = jest.fn();
const mockSignOut = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: { intent?: string | string[] } = {};
let mockLoaded = true;
let mockAuth = {
  isLoaded: true,
  isSignedIn: false,
  userId: null as string | null,
  sessionId: null as string | null,
};
let mockSignIn: {
  id: string | undefined;
  identifier: string | null;
  status: string | null;
  createdSessionId: string | null;
  firstFactorVerification: { strategy: string | null };
  supportedFirstFactors: { strategy: string; emailAddressId: string }[];
  supportedSecondFactors: {
    strategy: string;
    emailAddressId?: string;
    phoneNumberId?: string;
    safeIdentifier?: string;
  }[];
  create: jest.Mock;
  prepareFirstFactor: jest.Mock;
  attemptFirstFactor: jest.Mock;
  resetPassword: jest.Mock;
  prepareSecondFactor: jest.Mock;
  attemptSecondFactor: jest.Mock;
  reload: jest.Mock;
};

jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ ...mockAuth, signOut: mockSignOut }),
  isClerkAPIResponseError: (value: unknown) =>
    !!value && typeof value === 'object' && 'errors' in value,
}));
jest.mock('@clerk/expo/legacy', () => ({
  useSignIn: () => ({ isLoaded: mockLoaded, signIn: mockSignIn, setActive: mockSetActive }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace, canGoBack: () => false }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }));

function providerError(code: string, longMessage?: string) {
  return { errors: [{ code, longMessage }] };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function setAttempt(status: string) {
  mockSignIn.status = status;
  if (status === 'complete') mockSignIn.createdSessionId = 'session-recovered';
  return mockSignIn;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = {};
  mockLoaded = true;
  mockAuth = { isLoaded: true, isSignedIn: false, userId: null, sessionId: null };
  mockSignIn = {
    id: undefined,
    identifier: null,
    status: null,
    createdSessionId: null,
    firstFactorVerification: { strategy: null },
    supportedFirstFactors: [
      { strategy: 'reset_password_email_code', emailAddressId: 'email-owner' },
    ],
    supportedSecondFactors: [],
    create: mockCreate,
    prepareFirstFactor: mockPrepareFirstFactor,
    attemptFirstFactor: mockAttemptFirstFactor,
    resetPassword: mockResetPassword,
    prepareSecondFactor: mockPrepareSecondFactor,
    attemptSecondFactor: mockAttemptSecondFactor,
    reload: mockReload,
  };
  mockCreate.mockImplementation(async ({ identifier }: { identifier: string }) => {
    mockSignIn.id = 'signin-recovery';
    mockSignIn.identifier = identifier;
    mockSignIn.firstFactorVerification.strategy = 'reset_password_email_code';
    return setAttempt('needs_first_factor');
  });
  mockPrepareFirstFactor.mockImplementation(async () => setAttempt('needs_first_factor'));
  mockAttemptFirstFactor.mockImplementation(async () => setAttempt('needs_new_password'));
  mockResetPassword.mockImplementation(async () => setAttempt('complete'));
  mockPrepareSecondFactor.mockImplementation(async () => mockSignIn);
  mockAttemptSecondFactor.mockImplementation(async () => setAttempt('needs_new_password'));
  mockReload.mockImplementation(async () => mockSignIn);
  mockSetActive.mockImplementation(
    async ({
      session,
      navigate,
    }: {
      session: string;
      navigate: (args: { session: { id: string; currentTask: null } }) => Promise<void>;
    }) => navigate({ session: { id: session, currentTask: null } }),
  );
});

async function begin() {
  const hook = await renderHook(() => usePasswordRecovery());
  await act(() => hook.result.current.setEmail(' owner@example.com '));
  await act(() => hook.result.current.requestCode());
  return hook;
}

async function verify() {
  const hook = await begin();
  await act(() => hook.result.current.setCode('123456'));
  await act(() => hook.result.current.verifyCode());
  return hook;
}

async function enterPassword(hook: Awaited<ReturnType<typeof begin>>) {
  await act(() => {
    hook.result.current.setPassword('A new password from the user');
    hook.result.current.setConfirmation('A new password from the user');
  });
}

describe('native Clerk password recovery action boundary', () => {
  it('requests, verifies, changes only the Clerk password, then activates the returned session', async () => {
    const hook = await verify();
    expect(mockCreate).toHaveBeenCalledWith({
      strategy: 'reset_password_email_code',
      identifier: 'owner@example.com',
    });
    expect(mockAttemptFirstFactor).toHaveBeenCalledWith({
      strategy: 'reset_password_email_code',
      code: '123456',
    });
    expect(hook.result.current.phase).toBe('password');
    expect(hook.result.current.code).toBe('');
    await enterPassword(hook);
    await act(() => hook.result.current.savePassword());
    expect(mockResetPassword).toHaveBeenCalledWith({ password: 'A new password from the user' });
    expect(hook.result.current.phase).toBe('complete');
    expect(hook.result.current.password).toBe('');
    expect(hook.result.current.confirmation).toBe('');
    expect(mockSetActive).not.toHaveBeenCalled();
    const navigate = jest.fn();
    await act(() => hook.result.current.continueToApp(navigate));
    expect(mockSetActive).toHaveBeenCalledWith(
      expect.objectContaining({ session: 'session-recovered' }),
    );
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('validates required fields and matching passwords without inventing Clerk password policy', async () => {
    const hook = await renderHook(() => usePasswordRecovery());
    await act(() => hook.result.current.requestCode());
    expect(mockCreate).not.toHaveBeenCalled();
    await act(() => hook.result.current.setEmail('owner@example.com'));
    await act(() => hook.result.current.requestCode());
    await act(() => hook.result.current.verifyCode());
    expect(mockAttemptFirstFactor).not.toHaveBeenCalled();
    await act(() => hook.result.current.setCode('123456'));
    await act(() => hook.result.current.verifyCode());
    await act(() => hook.result.current.savePassword());
    await act(() => hook.result.current.setPassword('short'));
    await act(() => hook.result.current.savePassword());
    expect(mockResetPassword).not.toHaveBeenCalled();
    await act(() => hook.result.current.setConfirmation('short'));
    mockResetPassword.mockRejectedValueOnce(
      providerError(
        'form_password_length_too_short',
        'Use at least the configured minimum length.',
      ),
    );
    await act(() => hook.result.current.savePassword());
    expect(hook.result.current.error).toBe('Use at least the configured minimum length.');
    expect(hook.result.current.phase).toBe('password');
    expect(hook.result.current.password).toBe('short');
  });

  it.each([
    ['form_code_incorrect', /does not match/],
    ['verification_expired', /expired/],
    ['too_many_requests', /Wait before/],
  ])('keeps failed code attempts recoverable for %s', async (code, message) => {
    const hook = await begin();
    mockAttemptFirstFactor.mockRejectedValueOnce(providerError(String(code)));
    await act(() => hook.result.current.setCode('wrong'));
    await act(() => hook.result.current.verifyCode());
    expect(hook.result.current.phase).toBe('code');
    expect(hook.result.current.error).toMatch(message);
    expect(mockResetPassword).not.toHaveBeenCalled();
    expect(mockSetActive).not.toHaveBeenCalled();
    await act(() => hook.result.current.resendCode());
    expect(mockPrepareFirstFactor).toHaveBeenCalledWith({
      strategy: 'reset_password_email_code',
      emailAddressId: 'email-owner',
    });
    expect(hook.result.current.code).toBe('');
  });

  it('serializes duplicate requests and resends at the provider boundary', async () => {
    const hook = await renderHook(() => usePasswordRecovery());
    await act(() => hook.result.current.setEmail('owner@example.com'));
    const wait = deferred<typeof mockSignIn>();
    mockCreate.mockImplementationOnce(() => wait.promise);
    let first!: Promise<void>;
    await act(() => {
      first = hook.result.current.requestCode();
      void hook.result.current.requestCode();
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(hook.result.current.busy).toBe(true);
    mockSignIn.id = 'signin-recovery';
    mockSignIn.identifier = 'owner@example.com';
    await act(async () => {
      wait.resolve(setAttempt('needs_first_factor'));
      await first;
    });
    const resend = deferred<typeof mockSignIn>();
    mockPrepareFirstFactor.mockImplementationOnce(() => resend.promise);
    let sending!: Promise<void>;
    await act(() => {
      sending = hook.result.current.resendCode();
      void hook.result.current.resendCode();
    });
    expect(mockPrepareFirstFactor).toHaveBeenCalledTimes(1);
    await act(async () => {
      resend.resolve(mockSignIn);
      await sending;
    });
  });

  it('ignores a request completing after cancellation', async () => {
    const hook = await renderHook(() => usePasswordRecovery());
    await act(() => hook.result.current.setEmail('owner@example.com'));
    const wait = deferred<typeof mockSignIn>();
    mockCreate.mockImplementationOnce(() => wait.promise);
    let pending!: Promise<void>;
    await act(() => {
      pending = hook.result.current.requestCode();
    });
    await act(() => hook.result.current.restart());
    mockSignIn.id = 'signin-recovery';
    mockSignIn.identifier = 'owner@example.com';
    await act(async () => {
      wait.resolve(setAttempt('needs_first_factor'));
      await pending;
    });
    expect(hook.result.current.phase).toBe('request');
    expect(hook.result.current.busy).toBe(false);
    expect(mockSetActive).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('does not use a late password result after another account signs in', async () => {
    const hook = await verify();
    await enterPassword(hook);
    const wait = deferred<typeof mockSignIn>();
    mockResetPassword.mockImplementationOnce(() => wait.promise);
    let pending!: Promise<void>;
    await act(() => {
      pending = hook.result.current.savePassword();
    });
    mockAuth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'different-user',
      sessionId: 'different-session',
    };
    await hook.rerender({});
    await act(async () => {
      wait.resolve(setAttempt('complete'));
      await pending;
    });
    await act(() => hook.result.current.continueToApp(jest.fn()));
    expect(hook.result.current.phase).toBe('request');
    expect(hook.result.current.email).toBe('');
    expect(hook.result.current.password).toBe('');
    expect(mockSetActive).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('rejects account or attempt substitution before mutating a password', async () => {
    const hook = await verify();
    await enterPassword(hook);
    mockSignIn.id = 'another-attempt';
    mockSignIn.identifier = 'other@example.com';
    await act(() => hook.result.current.savePassword());
    expect(mockResetPassword).not.toHaveBeenCalled();
    expect(hook.result.current.phase).toBe('blocked');
  });

  it('resumes a provider-owned reset step without sending a new email', async () => {
    mockSignIn.id = 'signin-recovery';
    mockSignIn.identifier = 'owner@example.com';
    mockSignIn.firstFactorVerification.strategy = 'reset_password_email_code';
    mockSignIn.status = 'needs_new_password';
    const hook = await renderHook(() => usePasswordRecovery());
    expect(hook.result.current.phase).toBe('password');
    expect(hook.result.current.email).toBe('owner@example.com');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockResetPassword).not.toHaveBeenCalled();
    await act(() => hook.result.current.restart());
    expect(hook.result.current.phase).toBe('request');
  });

  it('does not resume an unrelated sign-in or replace a stale active session', async () => {
    mockSignIn.id = 'password-login';
    mockSignIn.identifier = 'owner@example.com';
    mockSignIn.status = 'needs_first_factor';
    mockSignIn.firstFactorVerification.strategy = 'password';
    const hook = await renderHook(() => usePasswordRecovery());
    expect(hook.result.current.phase).toBe('request');
    await act(() => hook.result.current.setEmail('owner@example.com'));
    mockCreate.mockRejectedValueOnce(providerError('session_exists'));
    await act(() => hook.result.current.requestCode());
    expect(hook.result.current.error).toMatch(/session already exists/);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('reconciles an already-used verification code with Clerk', async () => {
    const hook = await begin();
    await act(() => hook.result.current.setCode('123456'));
    mockAttemptFirstFactor.mockImplementationOnce(async () => {
      setAttempt('needs_new_password');
      throw providerError('verification_already_verified');
    });
    await act(() => hook.result.current.verifyCode());
    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(hook.result.current.phase).toBe('password');
  });

  it('reconciles a password reset that succeeded before its response was lost', async () => {
    const hook = await verify();
    await enterPassword(hook);
    mockResetPassword.mockImplementationOnce(async () => {
      setAttempt('complete');
      throw new Error('network lost');
    });
    await act(() => hook.result.current.savePassword());
    expect(hook.result.current.phase).toBe('complete');
    expect(mockResetPassword).toHaveBeenCalledTimes(1);
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('holds an unknown outcome until status can be read, without replaying reset', async () => {
    const hook = await verify();
    await enterPassword(hook);
    mockResetPassword.mockRejectedValueOnce(new Error('network lost'));
    mockReload.mockRejectedValueOnce(new Error('still offline'));
    await act(() => hook.result.current.savePassword());
    expect(hook.result.current.phase).toBe('unknown');
    setAttempt('complete');
    await act(() => hook.result.current.checkStatus());
    expect(hook.result.current.phase).toBe('complete');
    expect(mockResetPassword).toHaveBeenCalledTimes(1);
  });

  it.each(['email_code', 'phone_code', 'totp', 'backup_code'] as const)(
    'completes provider-required %s verification without bypassing it',
    async strategy => {
      const hook = await begin();
      mockSignIn.supportedSecondFactors = [
        {
          strategy,
          emailAddressId: 'email-factor',
          phoneNumberId: 'phone-factor',
          safeIdentifier: 'masked',
        },
      ];
      mockAttemptFirstFactor.mockImplementationOnce(async () => setAttempt('needs_second_factor'));
      await act(() => hook.result.current.setCode('123456'));
      await act(() => hook.result.current.verifyCode());
      expect(hook.result.current.phase).toBe('factor');
      expect(mockPrepareSecondFactor).not.toHaveBeenCalled();
      await act(() => hook.result.current.chooseFactor(hook.result.current.factors[0]!));
      if (strategy === 'email_code' || strategy === 'phone_code') {
        expect(mockPrepareSecondFactor).toHaveBeenCalledTimes(1);
      } else expect(mockPrepareSecondFactor).not.toHaveBeenCalled();
      await act(() => hook.result.current.setCode('second-code'));
      await act(() => hook.result.current.verifyFactor());
      expect(mockAttemptSecondFactor).toHaveBeenCalledWith({ strategy, code: 'second-code' });
      expect(hook.result.current.phase).toBe('password');
      expect(mockSetActive).not.toHaveBeenCalled();
    },
  );

  it('keeps unsupported challenges incomplete and never activates their session', async () => {
    const hook = await begin();
    mockAttemptFirstFactor.mockImplementationOnce(async () => setAttempt('needs_protect_check'));
    await act(() => hook.result.current.setCode('123456'));
    await act(() => hook.result.current.verifyCode());
    expect(hook.result.current.phase).toBe('blocked');
    expect(hook.result.current.error).toMatch(/Recovery is not complete/);
    await act(() => hook.result.current.continueToApp(jest.fn()));
    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('retains completed reset after session activation fails, allowing activation retry only', async () => {
    const hook = await verify();
    await enterPassword(hook);
    await act(() => hook.result.current.savePassword());
    mockSetActive.mockRejectedValueOnce(new Error('offline'));
    await act(() => hook.result.current.continueToApp(jest.fn()));
    expect(hook.result.current.phase).toBe('complete');
    const navigate = jest.fn();
    await act(() => hook.result.current.continueToApp(navigate));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(mockResetPassword).toHaveBeenCalledTimes(1);
  });

  it('does not mistake its own session activation for an account switch', async () => {
    const hook = await verify();
    await enterPassword(hook);
    await act(() => hook.result.current.savePassword());
    const gate = deferred<void>();
    let navigate!: (args: { session: { id: string; currentTask: null } }) => Promise<void>;
    mockSetActive.mockImplementationOnce(async (options: { navigate: typeof navigate }) => {
      navigate = options.navigate;
      await gate.promise;
    });
    const destination = jest.fn();
    let activation!: Promise<void>;
    await act(() => {
      activation = hook.result.current.continueToApp(destination);
    });
    mockAuth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'recovered-user',
      sessionId: 'session-recovered',
    };
    await hook.rerender({});
    await act(async () => {
      await navigate({ session: { id: 'session-recovered', currentTask: null } });
      gate.resolve();
      await activation;
    });
    expect(destination).toHaveBeenCalledTimes(1);
  });

  it('does not navigate past a provider-required pending session task', async () => {
    const hook = await verify();
    await enterPassword(hook);
    await act(() => hook.result.current.savePassword());
    mockSetActive.mockImplementationOnce(
      async ({
        session,
        navigate,
      }: {
        session: string;
        navigate: (args: {
          session: { id: string; currentTask: { key: string } };
        }) => Promise<void>;
      }) => navigate({ session: { id: session, currentTask: { key: 'reset_password' } } }),
    );
    const destination = jest.fn();
    await act(() => hook.result.current.continueToApp(destination));
    expect(destination).not.toHaveBeenCalled();
    expect(hook.result.current.phase).toBe('blocked');
    expect(hook.result.current.error).toMatch(/another account verification step/);
  });

  it('does not call Clerk before auth restoration or for an active account', async () => {
    mockLoaded = false;
    const hook = await renderHook(() => usePasswordRecovery());
    await act(() => hook.result.current.setEmail('owner@example.com'));
    await act(() => hook.result.current.requestCode());
    expect(mockCreate).not.toHaveBeenCalled();
    mockLoaded = true;
    mockAuth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'current',
      sessionId: 'current-session',
    };
    await hook.rerender({});
    await act(() => hook.result.current.requestCode());
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('recovery native navigation', () => {
  it('completes the rendered flow and returns to the exact allowed record', async () => {
    mockSearchParams = { intent: '/quotes?quoteId=quote-1' };
    const screen = await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'owner@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
    await fireEvent.changeText(screen.getByLabelText('Reset code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Verify reset code' }));
    await fireEvent.changeText(screen.getByLabelText('New password'), 'New password for the owner');
    await fireEvent.changeText(
      screen.getByLabelText('Confirm new password'),
      'New password for the owner',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Update password' }));
    expect(screen.getByText('PASSWORD UPDATED')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue to QuoteMax' }));
    expect(mockReplace).toHaveBeenCalledWith('/quotes?quoteId=quote-1');
  });

  it('opens native recovery from sign-in and retains only an allowed return intent', async () => {
    mockSearchParams = { intent: '/quotes?quoteId=quote-1' };
    const screen = await render(<SignInScreen />);
    await fireEvent.press(screen.getByText('Forgot your password?'));
    expect(mockPush).toHaveBeenCalledWith('/forgot-password?intent=%2Fquotes%3FquoteId%3Dquote-1');
  });

  it.each([
    ['/quotes?quoteId=quote-1', { intent: '/quotes?quoteId=quote-1' }],
    ['https://evil.example/steal', {}],
    ['/sign-up', {}],
  ])('returns safely to sign-in after cancelling intent %s', async (intent, expectedParams) => {
    mockSearchParams = { intent: String(intent) };
    const screen = await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Return to sign in' }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/sign-in', params: expectedParams });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
