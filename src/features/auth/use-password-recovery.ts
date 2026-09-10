import { isClerkAPIResponseError, useAuth } from '@clerk/expo';
import { useSignIn } from '@clerk/expo/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';

type SignIn = NonNullable<ReturnType<typeof useSignIn>['signIn']>;
type SecondFactor = NonNullable<SignIn['supportedSecondFactors']>[number];
export type RecoveryFactor = Exclude<SecondFactor, { strategy: 'email_link' }>;
type Phase = 'request' | 'code' | 'password' | 'factor' | 'complete' | 'unknown' | 'blocked';

const RESET_STRATEGY = 'reset_password_email_code' as const;
const normalizeEmail = (value: string) => value.trim().toLowerCase();

function recoveryError(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    switch (first?.code) {
      case 'form_identifier_not_found':
        return 'Check your email address and try again. Use the email you sign in with.';
      case 'form_code_incorrect':
        return 'That code does not match. Check the newest code and try again.';
      case 'verification_expired':
      case 'form_code_expired':
        return 'That code has expired. Request a new code and try again.';
      case 'verification_already_verified':
        return 'That code has already been used. Check recovery status or start again.';
      case 'too_many_requests':
      case 'too_many_attempts':
        return 'Too many attempts. Wait before trying again.';
      case 'session_exists':
        return 'A sign-in session already exists. Return to sign in to continue.';
      default:
        return first?.longMessage ?? first?.message ?? 'Recovery could not continue. Try again.';
    }
  }
  return 'Could not confirm recovery. Check your signal and try again.';
}

export function recoveryFactorLabel(factor: RecoveryFactor): string {
  switch (factor.strategy) {
    case 'email_code':
      return `Email a code to ${factor.safeIdentifier}`;
    case 'phone_code':
      return `Send a code to ${factor.safeIdentifier}`;
    case 'totp':
      return 'Use an authenticator code';
    case 'backup_code':
      return 'Use a backup code';
  }
}

/** Clerk owns expiry, password policy and verification. No credentials are persisted here. */
export function usePasswordRecovery() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const auth = useAuth();
  const liveAuth = useRef(auth);
  liveAuth.current = auth;
  const [phase, setPhase] = useState<Phase>('request');
  const [email, updateEmail] = useState('');
  const [code, updateCode] = useState('');
  const [password, updatePassword] = useState('');
  const [confirmation, updateConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<RecoveryFactor[]>([]);
  const [factor, setFactor] = useState<RecoveryFactor | null>(null);
  const pending = useRef(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const initialized = useRef(false);
  const attempt = useRef<SignIn | null>(null);
  const identity = useRef<{ id: string; email: string } | null>(null);
  const resetAttempted = useRef(false);
  const activatingSession = useRef<string | null>(null);

  const canAct = () => mounted.current && liveAuth.current.isLoaded && !liveAuth.current.isSignedIn;
  const current = (generation: number) => epoch.current === generation && canAct();

  function owns(value: SignIn): boolean {
    return (
      !!identity.current &&
      value.id === identity.current.id &&
      normalizeEmail(value.identifier ?? '') === identity.current.email
    );
  }

  function clearSecrets() {
    updateCode('');
    updatePassword('');
    updateConfirmation('');
  }

  const showAttempt = useCallback((value: SignIn, passwordWasAttempted: boolean) => {
    const available = (value.supportedSecondFactors ?? []).filter(
      (item): item is RecoveryFactor => item.strategy !== 'email_link',
    );
    setFactors(available);
    setFactor(null);
    if (value.status === 'needs_new_password') setPhase('password');
    else if (value.status === 'needs_first_factor') setPhase('code');
    else if (value.status === 'needs_second_factor' || value.status === 'needs_client_trust') {
      setPhase(available.length ? 'factor' : 'blocked');
      if (!available.length) {
        setError(
          'This account requires a verification method that is not available here. Recovery is not complete.',
        );
      }
    } else if (value.status === 'complete' && value.createdSessionId && passwordWasAttempted) {
      setPhase('complete');
      updatePassword('');
      updateConfirmation('');
    } else {
      setPhase('blocked');
      setError(
        'This account requires another recovery step that is not available here. Recovery is not complete.',
      );
    }
    updateCode('');
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!auth.isLoaded || !auth.isSignedIn || auth.sessionId === activatingSession.current) return;
    // The auth layout normally leaves this route immediately. Also clear its
    // own sensitive state, so a late redirect cannot show A's fields under B.
    epoch.current += 1;
    pending.current = false;
    setBusy(false);
    attempt.current = null;
    identity.current = null;
    resetAttempted.current = false;
    updateEmail('');
    updateCode('');
    updatePassword('');
    updateConfirmation('');
    setFactor(null);
    setFactors([]);
    setError(null);
    setNotice(null);
    setPhase('request');
  }, [auth.isLoaded, auth.isSignedIn, auth.sessionId, auth.userId]);

  // Resume only a Clerk-owned reset attempt, never an unrelated sign-in. A new
  // app launch may also start again; we never persist the password or OTP.
  useEffect(() => {
    if (!isLoaded || !signIn || initialized.current || !auth.isLoaded) return;
    initialized.current = true;
    if (
      auth.isSignedIn ||
      !signIn.id ||
      !signIn.identifier ||
      signIn.firstFactorVerification.strategy !== RESET_STRATEGY ||
      signIn.status === 'complete'
    )
      return;
    identity.current = { id: signIn.id, email: normalizeEmail(signIn.identifier) };
    attempt.current = signIn;
    updateEmail(signIn.identifier);
    showAttempt(signIn, false);
  }, [auth.isLoaded, auth.isSignedIn, isLoaded, showAttempt, signIn]);

  async function run(action: (generation: number) => Promise<void>) {
    if (!isLoaded || !signIn || pending.current || !canAct()) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const generation = epoch.current;
    try {
      await action(generation);
    } catch (failure) {
      if (current(generation)) setError(recoveryError(failure));
    } finally {
      if (mounted.current && epoch.current === generation) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  function ownedAttempt(): SignIn {
    const value = attempt.current;
    if (!value || !owns(value)) {
      setPhase('blocked');
      throw new Error('Recovery attempt changed');
    }
    return value;
  }

  async function reconcile(value: SignIn, generation: number) {
    try {
      const refreshed = await value.reload();
      if (!current(generation)) return;
      if (!owns(refreshed)) {
        setPhase('blocked');
        setError('Your sign-in attempt changed. Start recovery again for the intended account.');
        return;
      }
      attempt.current = refreshed;
      showAttempt(refreshed, resetAttempted.current);
      setNotice('Recovery status checked. Continue with the step shown.');
    } catch {
      if (!current(generation)) return;
      setPhase('unknown');
      setError('The outcome could not be confirmed. Check recovery status before trying again.');
    }
  }

  async function mutate(action: (value: SignIn) => Promise<SignIn>) {
    await run(async generation => {
      const value = ownedAttempt();
      try {
        const result = await action(value);
        if (!current(generation)) return;
        if (!owns(result)) {
          setPhase('blocked');
          setError('Your sign-in attempt changed. Start recovery again for the intended account.');
          return;
        }
        attempt.current = result;
        showAttempt(result, resetAttempted.current);
      } catch (failure) {
        if (!current(generation)) return;
        // A lost response can follow a successful code/password mutation. Ask
        // Clerk for the outcome instead of blindly replaying a consumed code.
        if (
          !isClerkAPIResponseError(failure) ||
          failure.errors[0]?.code === 'verification_already_verified'
        ) {
          await reconcile(value, generation);
        } else {
          setError(recoveryError(failure));
        }
      }
    });
  }

  async function requestCode() {
    const requestedEmail = email.trim();
    if (!requestedEmail) {
      setError('Enter the email you use to sign in.');
      return;
    }
    await run(async generation => {
      const result = await signIn!.create({ strategy: RESET_STRATEGY, identifier: requestedEmail });
      if (!current(generation)) return;
      if (
        !result.id ||
        normalizeEmail(result.identifier ?? '') !== normalizeEmail(requestedEmail)
      ) {
        setPhase('blocked');
        setError('Could not confirm the recovery account. Start again.');
        return;
      }
      identity.current = { id: result.id, email: normalizeEmail(requestedEmail) };
      attempt.current = result;
      resetAttempted.current = false;
      updateEmail(requestedEmail);
      clearSecrets();
      showAttempt(result, false);
      setNotice('A reset code has been sent. Check your email, including spam.');
    });
  }

  async function resendCode() {
    await run(async generation => {
      const value = ownedAttempt();
      const emailFactor = value.supportedFirstFactors?.find(
        item => item.strategy === RESET_STRATEGY,
      );
      if (!emailFactor || emailFactor.strategy !== RESET_STRATEGY) {
        setError('A new reset code is not available for this attempt. Start again.');
        return;
      }
      const result = await value.prepareFirstFactor({
        strategy: RESET_STRATEGY,
        emailAddressId: emailFactor.emailAddressId,
      });
      if (!current(generation) || !owns(result)) return;
      attempt.current = result;
      showAttempt(result, false);
      setNotice('A new reset code has been sent. Use the newest code.');
    });
  }

  async function verifyCode() {
    if (!code.trim()) {
      setError('Enter the reset code from your email.');
      return;
    }
    const submittedCode = code.trim();
    await mutate(value =>
      value.attemptFirstFactor({ strategy: RESET_STRATEGY, code: submittedCode }),
    );
  }

  async function savePassword() {
    if (!password) {
      setError('Enter your new password.');
      return;
    }
    if (password !== confirmation) {
      setError('Your passwords do not match.');
      return;
    }
    const submittedPassword = password;
    await mutate(value => {
      resetAttempted.current = true;
      return value.resetPassword({ password: submittedPassword });
    });
  }

  async function chooseFactor(selected: RecoveryFactor) {
    await run(async generation => {
      const value = ownedAttempt();
      if (
        !(value.supportedSecondFactors ?? []).some(
          item => JSON.stringify(item) === JSON.stringify(selected),
        )
      )
        return;
      let result = value;
      if (selected.strategy === 'email_code') {
        result = await value.prepareSecondFactor({
          strategy: 'email_code',
          emailAddressId: selected.emailAddressId,
        });
      } else if (selected.strategy === 'phone_code') {
        result = await value.prepareSecondFactor({
          strategy: 'phone_code',
          phoneNumberId: selected.phoneNumberId,
        });
      }
      if (!current(generation) || !owns(result)) return;
      attempt.current = result;
      updateCode('');
      setFactor(selected);
      setNotice(
        selected.strategy === 'email_code' || selected.strategy === 'phone_code'
          ? 'Verification code sent. Use the newest code.'
          : null,
      );
    });
  }

  async function verifyFactor() {
    if (!factor || !code.trim()) {
      setError('Enter your verification code.');
      return;
    }
    const submittedCode = code.trim();
    const strategy = factor.strategy;
    await mutate(value => value.attemptSecondFactor({ strategy, code: submittedCode }));
  }

  async function continueToApp(onComplete: () => void) {
    await run(async generation => {
      const value = ownedAttempt();
      if (value.status !== 'complete' || !value.createdSessionId || !resetAttempted.current) return;
      const sessionId = value.createdSessionId;
      activatingSession.current = sessionId;
      try {
        await setActive!({
          session: sessionId,
          navigate: async ({ session }) => {
            if (!mounted.current || epoch.current !== generation || session?.id !== sessionId)
              return;
            if (liveAuth.current.isSignedIn && liveAuth.current.sessionId !== sessionId) return;
            if (session.currentTask) {
              setPhase('blocked');
              setError(
                'Your password was updated, but another account verification step is required before continuing.',
              );
              return;
            }
            onComplete();
          },
        });
      } finally {
        activatingSession.current = null;
      }
    });
  }

  function restart() {
    epoch.current += 1;
    pending.current = false;
    setBusy(false);
    attempt.current = null;
    identity.current = null;
    resetAttempted.current = false;
    clearSecrets();
    setFactors([]);
    setFactor(null);
    setError(null);
    setNotice(null);
    setPhase('request');
  }

  return {
    phase,
    email,
    code,
    password,
    confirmation,
    error,
    notice,
    busy,
    factor,
    factors,
    ready: isLoaded && auth.isLoaded && !auth.isSignedIn,
    setEmail: (value: string) => {
      if (!pending.current) updateEmail(value);
    },
    setCode: (value: string) => {
      if (!pending.current) updateCode(value);
    },
    setPassword: (value: string) => {
      if (!pending.current) updatePassword(value);
    },
    setConfirmation: (value: string) => {
      if (!pending.current) updateConfirmation(value);
    },
    requestCode,
    resendCode,
    verifyCode,
    savePassword,
    chooseFactor,
    verifyFactor,
    continueToApp,
    restart,
    checkStatus: () => run(generation => reconcile(ownedAttempt(), generation)),
  };
}
