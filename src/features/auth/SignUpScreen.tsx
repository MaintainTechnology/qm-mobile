/**
 * `onboard` — the Sign-Up flow (design kit screen 3): a code gate (spec B1) followed by a 4-step
 * wizard that mirrors the web funnel (account, trade & licence, pricing, review).
 *
 * Activation is the web app's own POST /api/onboard/activate (it inserts the tenants +
 * pricing_book rows and provisions the AI line), called with a token minted from the Clerk session
 * created here so the server derives tenants.clerk_user_id itself. The Clerk session only becomes active on the
 * success screen (spec B6), so a failed activation never strands a signed-in-but-no-tenant
 * session — this screen never calls `setActive` itself.
 *
 * Two entry points skip straight to the code gate + steps 2–4, the Clerk account already made:
 *   - spec A2: a tenant-less signed-in tradie, sent here by the `(tabs)` cold-start guard via
 *     `resumeOnboardingHref` (`?resume=1&uid=<clerk user id>`).
 *   - spec A3: a fresh sign-up whose email turned out to already have a Clerk account. Ownership
 *     is proven with the typed password, then `GET /api/tenant/me` decides: no tenant → resume
 *     here mid-session; a tenant already exists → straight to the dashboard.
 */
import { isClerkAPIResponseError, useAuth, useClerk, useUser } from '@clerk/expo';
// Clerk Core 3 promoted the signal-based useSignIn/useSignUp to the default export.
// Those return { error } from create() and drop setActive/isLoaded entirely, which
// this multi-step wizard is built on, so it stays on the resource-shaped hooks that
// Core 3 keeps at /legacy. Porting to signals is a rewrite of the whole flow, not an
// import swap.
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { BrandMark } from '@/components/BrandMark';
import {
  acquisitionEnvelopeFromParams,
  activationAcquisitionFields,
  applyIntentResolution,
  bindAcquisitionAccount,
  clearAcquisitionEnvelope,
  completeAcquisitionEnvelope,
  createAcquisitionPersistence,
  invitationValidationChannel,
  loadAcquisitionEnvelope,
  mergeAcquisitionEnvelopes,
  type AcquisitionEnvelope,
  withAcquisitionProvisioningReceipt,
  withAcquisitionInvitation,
} from '@/features/auth/acquisition-envelope';
import { activationBearerToken } from '@/features/auth/activation-session';
import { AUTH_GUTTER, AuthHeader, BackButton, Field, PrimaryCta } from '@/features/auth/ui';
import {
  API_TO_LOCAL_KEY,
  buildActivatePayload,
  EMPTY_ONBOARD_FORM,
  fieldLabel,
  formatAuMobileDisplay,
  isCodeError,
  LICENCE_BODIES,
  OnboardNumericValidationError,
  type OnboardForm,
  ROOFING_RATE_FIELDS,
  type RoofingMaterial,
  stepForFields,
  type TradeSlug,
} from '@/features/auth/onboard-fields';
import { decideDuplicateEmail, successHref } from '@/features/auth/resume-decision';
import {
  ALREADY_VERIFIED,
  emailAlreadyVerified,
  usernameFromEmail,
} from '@/features/auth/verify-state';
import { apiErrorMessage, ApiError, apiRequest } from '@/lib/api';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { useTheme } from '@/lib/useTheme';

const TRADES = [
  { slug: 'electrical', label: 'Electrical' },
  { slug: 'plumbing', label: 'Plumbing' },
  { slug: 'painting', label: 'Painting' },
  { slug: 'roofing', label: 'Roofing' },
] as const;

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

const STEPS = [
  {
    num: '01',
    label: 'Account',
    sub: 'Your business and how customers reach you.',
    cta: 'Continue',
  },
  {
    num: '02',
    label: 'Trade & licence',
    sub: 'What you do, where, optional regulatory bits.',
    cta: 'Continue',
  },
  {
    num: '03',
    label: 'Your pricing',
    sub: 'Rates for the trades you picked. Anything optional has a sensible default.',
    cta: 'Continue',
  },
  {
    num: '04',
    label: 'Review & activate',
    sub: 'One last look, then we provision your AI line.',
    cta: 'Activate my AI line',
  },
] as const;

// Matches the web wizard's AU mobile rule (lib/onboard/schema.ts). Optional here (spec B2) — the
// web schema treats a blank mobile as valid too, only validating shape when something is typed.
const AU_MOBILE = /^(\+?61\s?4\d{2}\s?\d{3}\s?\d{3}|0?4\d{2}\s?\d{3}\s?\d{3})$/;
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

const ActivateResponseSchema = z.looseObject({
  ok: z.boolean(),
  tenantId: z.string().optional(),
  phoneNumber: z.string().nullish(),
  warning: z.string().nullish(),
  setupComplete: z.boolean().optional(),
});

const ValidateCodeResponseSchema = z.looseObject({
  ok: z.boolean(),
  last_slot: z.boolean().optional(),
});

const IntentResponseSchema = z.object({
  ok: z.literal(true),
  intent: z.object({
    owner_mobile: z.string().min(1).max(32),
    expires_at: z.string().min(1).max(64),
    provenance: z.literal('sms'),
  }),
});

/** Placeholder shape — only the HTTP status of `GET /api/tenant/me` matters here (spec A3). */
const TenantMeProbeSchema = z.looseObject({});

/** A Clerk failure, worded for a tradie rather than an API consumer. */
function clerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors[0];
    return first?.longMessage ?? first?.message ?? 'Could not create your account. Try again.';
  }
  return 'Could not reach QuoteMax. Check your signal and try again.';
}

export function SignUpScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    resume?: string;
    uid?: string;
    code?: string;
    intent?: string;
    source?: string;
    referral?: string;
    plan?: string;
    interval?: string;
    returnTo?: string;
  }>();
  const incomingAcquisition = useRef(acquisitionEnvelopeFromParams(params)).current;

  const { signUp, setActive: activateSignUpSession, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const clerk = useClerk();
  const {
    userId: authUserId,
    sessionId: authSessionId,
    getToken: getAuthToken,
    signOut,
  } = useAuth();

  const [resumeEntry, setResumeEntry] = useState(params.resume === '1');
  const [identity, setIdentity] = useState<{ clerkUserId: string; sessionId: string | null }>(
    () => ({ clerkUserId: authUserId || params.uid || '', sessionId: authSessionId ?? null }),
  );

  const [codeAccepted, setCodeAccepted] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeNote, setCodeNote] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(
    params.intent && !incomingAcquisition?.intent
      ? 'That SMS signup link is not valid. Enter a current invitation code instead.'
      : null,
  );
  const [intentResolving, setIntentResolving] = useState(false);
  const [intentRetry, setIntentRetry] = useState(0);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(resumeEntry ? 2 : 1);
  const [phase, setPhase] = useState<'form' | 'verify'>('form');
  const [form, setForm] = useState<OnboardForm>(EMPTY_ONBOARD_FORM);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLicence, setShowLicence] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);
  const [continuityWarning, setContinuityWarning] = useState<string | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionEnvelope | null>(
    incomingAcquisition,
  );
  const acquisitionRef = useRef<AcquisitionEnvelope | null>(incomingAcquisition);
  const acquisitionPersistence = useRef(createAcquisitionPersistence()).current;

  // Resume entry (A2/A3) skips step 1, so business_name/owner_first_name/owner_email — all
  // required by OnboardActivateSchema — never get typed there. First name + email ARE on the
  // already-created Clerk user; back-fill those once. Business name has nowhere to live on a
  // Clerk user, so step 2 below grows a field for it in resume mode instead (spec A2's "steps
  // 2–4" — this lives structurally in step 2, not a re-shown step 1).
  const { user: clerkUser } = useUser();
  const identityBackfilled = useRef(false);

  const commitAcquisition = useCallback((next: AcquisitionEnvelope | null) => {
    acquisitionRef.current = next;
    setAcquisition(next);
    if (!next) return;
    void acquisitionPersistence.save(next).catch(() => {
      setContinuityWarning(
        'We could not save this signup on the device. Keep QuoteMax open until activation finishes.',
      );
    });
  }, [acquisitionPersistence]);

  // Restore only an unbound envelope or one belonging to the live/pending
  // account. Clerk retains its pending sign-up resource across a remount, so
  // its email is the account-isolation key before a user id exists.
  const pendingAccountEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ?? signUp?.emailAddress ?? undefined;
  const pendingSignInSession = signIn?.createdSessionId
    ? clerk.client.sessions.find(session => session.id === signIn.createdSessionId)
    : undefined;
  const pendingClerkUserId =
    authUserId ??
    signUp?.createdUserId ??
    pendingSignInSession?.user?.id ??
    pendingSignInSession?.publicUserData.userId ??
    undefined;
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadAcquisitionEnvelope({
        email: pendingAccountEmail,
        clerkUserId: pendingClerkUserId,
      });
      if (cancelled) return;
      const merged = mergeAcquisitionEnvelopes(stored, incomingAcquisition);
      if (!merged) return;
      const bound =
        pendingAccountEmail || pendingClerkUserId
          ? bindAcquisitionAccount(merged, {
              email: pendingAccountEmail,
              clerkUserId: pendingClerkUserId,
            })
          : merged;
      if (!bound) return;
      commitAcquisition(bound);
      setInvitationCode(current => current || bound.invitation?.code || '');
    })().catch(() => {
      if (!cancelled) {
        setContinuityWarning(
          'We could not restore the previous signup. Recheck the acquisition details below.',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [commitAcquisition, incomingAcquisition, pendingAccountEmail, pendingClerkUserId]);

  const pendingIntentToken =
    acquisition?.intent?.status === 'pending' ? acquisition.intent.token : null;
  useEffect(() => {
    if (!pendingIntentToken) return;
    let cancelled = false;
    setIntentResolving(true);
    setIntentError(null);
    void apiRequest(
      `/api/onboard/intent/${encodeURIComponent(pendingIntentToken)}`,
      IntentResponseSchema,
      { diagnosticPath: '/api/onboard/intent/:token' },
    )
      .then(response => {
        if (cancelled) return;
        const current = acquisitionRef.current;
        if (!current?.intent || !('token' in current.intent)) return;
        const next = applyIntentResolution(current, {
          status: 'verified',
          displayPhone: response.intent.owner_mobile,
          expiresAt: response.intent.expires_at,
        });
        commitAcquisition(next);
      })
      .catch(error => {
        if (cancelled) return;
        const code =
          error instanceof ApiError && error.body && typeof error.body === 'object'
            ? (error.body as { error?: unknown }).error
            : undefined;
        if (code === 'intent_expired' || code === 'intent_used' || code === 'intent_invalid') {
          const status = code.slice('intent_'.length) as 'expired' | 'used' | 'invalid';
          const current = acquisitionRef.current;
          if (current) {
            const next = applyIntentResolution(current, { status });
            commitAcquisition(next);
            if (current.invitation?.provenance === 'sms') setInvitationCode('');
          }
          setIntentError(
            status === 'expired'
              ? 'That SMS signup link has expired. Enter a current invitation code instead.'
              : status === 'used'
                ? 'That SMS signup link was already used. Sign in, or enter a different invitation code.'
                : 'That SMS signup link is invalid. Enter a current invitation code instead.',
          );
          return;
        }
        setIntentError('Could not verify that SMS signup link. Check your signal and retry.');
      })
      .finally(() => {
        if (!cancelled) setIntentResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [commitAcquisition, intentRetry, pendingIntentToken]);

  // A deep-link uid is display/resume context only. Once Clerk hydrates, the
  // live authenticated identity always wins so a hand-crafted URL cannot steer
  // even the post-activation hand-off metadata.
  useEffect(() => {
    if (!authUserId) return;
    setIdentity(prev => ({
      clerkUserId: authUserId,
      sessionId: authSessionId ?? prev.sessionId,
    }));
    const current = acquisitionRef.current;
    if (current) {
      const bound = bindAcquisitionAccount(current, {
        email: clerkUser?.primaryEmailAddress?.emailAddress,
        clerkUserId: authUserId,
      });
      if (bound) commitAcquisition(bound);
    }
  }, [authSessionId, authUserId, clerkUser, commitAcquisition]);

  useEffect(() => {
    if (!resumeEntry || !clerkUser || identityBackfilled.current) return;
    identityBackfilled.current = true;
    setForm(prev => ({
      ...prev,
      firstName: prev.firstName || clerkUser.firstName || '',
      email: prev.email || clerkUser.primaryEmailAddress?.emailAddress || '',
    }));
  }, [resumeEntry, clerkUser]);

  // Spec A2's `?resume=1` is a plain URL param — a stale or hand-crafted deep link could point a
  // fully-onboarded tradie straight back into the wizard. With a live session to prove who they
  // are, probe the same endpoint the (tabs) guard uses: a tenant already exists → bounce home
  // instead of re-running activation. A 404 (or a dropped probe) is the legitimate resume case and
  // falls through to the wizard as normal.
  const resumeGuardRan = useRef(false);
  useEffect(() => {
    if (!resumeEntry || resumeGuardRan.current || !authSessionId) return;
    resumeGuardRan.current = true;
    (async () => {
      try {
        const token = (await getAuthToken()) ?? undefined;
        if (!token) return;
        await apiRequest('/api/tenant/me', TenantMeProbeSchema, { token });
        router.replace('/');
      } catch {
        // Not found (no tenant yet) or a network hiccup — either way, let the wizard proceed.
      }
    })();
  }, [resumeEntry, authSessionId, getAuthToken, router]);

  const meta = STEPS[step - 1] ?? STEPS[0];
  const set = <K extends keyof OnboardForm>(key: K, value: OnboardForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));
  const setRoofing = (key: RoofingMaterial, value: string) =>
    setForm(prev => ({ ...prev, roofing: { ...prev.roofing, [key]: value } }));

  const hasLabourTrade = form.trades.includes('electrical') || form.trades.includes('plumbing');
  const hasPainting = form.trades.includes('painting');
  const hasRoofing = form.trades.includes('roofing');
  const primaryTrade: TradeSlug | undefined = form.trades[0];
  const verifiedIntent =
    acquisition?.intent?.status === 'verified' ? acquisition.intent : null;
  const lockedSmsInvitation =
    verifiedIntent && acquisition?.invitation?.provenance === 'sms'
      ? acquisition.invitation.code
      : null;

  function validateStep(current: 1 | 2 | 3 | 4): boolean {
    const next: Partial<Record<string, string>> = {};
    // Resume entry (A2/A3) never renders step 1 — its password/email fields have nowhere to be
    // fixed, so a stray jump back there (e.g. from applyActivateFailure) must not dead-end here.
    if (current === 1 && !resumeEntry) {
      if (form.businessName.trim().length < 2) next.businessName = 'Business name required.';
      if (form.firstName.trim().length < 1) next.firstName = 'First name required.';
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.';
      if (form.password.length < 8) next.password = 'Password needs at least 8 characters.';
    }
    if (current === 2) {
      // Only asked here in resume mode (A2/A3) — step 1 owns it otherwise.
      if (resumeEntry && form.businessName.trim().length < 2)
        next.businessName = 'Business name required.';
      if (form.trades.length === 0) next.trades = 'Pick at least one trade.';
      if (!verifiedIntent && form.mobile.trim() && !AU_MOBILE.test(form.mobile.trim()))
        next.mobile = 'Enter a valid Australian mobile (04xx xxx xxx).';
      if (form.websiteUrl.trim() && !WEBSITE_RE.test(form.websiteUrl.trim()))
        next.websiteUrl = 'Enter a valid website (e.g. rooroofing.com.au).';
    }
    if (current === 3 && hasLabourTrade) {
      if (!form.hourlyRate.trim())
        next.hourlyRate = 'Required for electrical and plumbing pricing.';
      if (!form.callOutMin.trim())
        next.callOutMin = 'Required for electrical and plumbing pricing.';
      if (!form.markupPct.trim()) next.markupPct = 'Required for electrical and plumbing pricing.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** Spec B1 — the code pane every entry point passes through before the numbered steps. */
  async function submitCode() {
    const value = invitationCode.trim().toUpperCase();
    if (!value) {
      setCodeError('Enter your invitation code to continue.');
      return;
    }
    const channel = invitationValidationChannel(acquisitionRef.current);
    if (!channel) {
      setCodeError('Wait while we verify the SMS signup link, then continue.');
      if (!intentResolving) setIntentRetry(value => value + 1);
      return;
    }
    setCodeChecking(true);
    setCodeError(null);
    setCodeNote(null);
    try {
      const res = await apiRequest('/api/onboard/validate-code', ValidateCodeResponseSchema, {
        method: 'POST',
        body: { code: value, channel },
      });
      if (res.last_slot) setCodeNote('Heads up — this is the last sign-up slot for this code.');
      setInvitationCode(value);
      const provenance = channel === 'sms' ? 'sms' : 'manual';
      const next = withAcquisitionInvitation(acquisitionRef.current, value, provenance);
      if (next) commitAcquisition(next);
      setCodeAccepted(true);
    } catch (err) {
      setCodeError(
        apiErrorMessage(err, 'Could not check the code just now. Check your signal and try again.'),
      );
    } finally {
      setCodeChecking(false);
    }
  }

  /** Spec B4/B5 — build the exact activation payload, submit it, and route on the result. */
  async function activateAndFinish(clerkUserId: string, sessionId: string | null) {
    try {
      const acquisitionFields = activationAcquisitionFields(acquisitionRef.current);
      const body = buildActivatePayload(form, {
        invitationCode: acquisitionFields.invitationCode || invitationCode,
        intentToken: acquisitionFields.intentToken,
      });
      // A completed Clerk sign-up owns a session before it becomes active. Mint
      // the bearer from that exact pending session; resume flows may fall back
      // to the already-active session. Never send activation without a token.
      const token = await activationBearerToken({
        sessionId,
        activeSessionId: authSessionId,
        sessions: clerk.client.sessions,
        getActiveToken: getAuthToken,
      });
      if (!token) {
        setSubmitError('Your secure session expired. Sign in again before activating.');
        return;
      }
      const res = await apiRequest('/api/onboard/activate', ActivateResponseSchema, {
        method: 'POST',
        body,
        token,
        // Provisions a real phone number end-to-end — the server's own budget for that is well
        // past the generic 15s default, so match it rather than abort a slow success client-side.
        timeoutMs: 180000,
      });
      const current = acquisitionRef.current;
      if (current) {
        const redacted = completeAcquisitionEnvelope(current, {
          email: form.email,
          clerkUserId,
        });
        if (redacted) {
          const complete = withAcquisitionProvisioningReceipt(redacted, {
            setupComplete: res.setupComplete === true,
            phoneNumber: res.phoneNumber,
            warning: res.warning,
          });
          acquisitionRef.current = complete;
          setAcquisition(complete);
          try {
            await acquisitionPersistence.save(complete);
          } catch {
            setContinuityWarning(
              'Activation succeeded, but the selected plan could not be saved on this device.',
            );
          }
        }
      }
      router.replace(
        successHref({
          firstName: form.firstName.trim(),
          phoneNumber: res.phoneNumber ?? null,
          warning: res.warning ?? null,
          sessionId,
          clerkUserId,
          setupComplete: res.setupComplete === true,
        }),
      );
    } catch (err) {
      applyActivateFailure(err);
    }
  }

  function applyFieldFailures(fieldErrors: Record<string, string[]>) {
    const fields = Object.keys(fieldErrors);
    const localErrors: Partial<Record<string, string>> = {};
    for (const f of fields) {
      const localKey = API_TO_LOCAL_KEY[f];
      const msg = fieldErrors[f]?.[0];
      if (localKey && msg) localErrors[localKey] = msg;
    }
    setErrors(localErrors);
    const summary = fields
      .map(f => `${fieldLabel(f)}: ${fieldErrors[f]?.[0] ?? 'Please check this'}`)
      .join(' · ');
    setSubmitError(`Please fix: ${summary}`);
    // Resume entry never renders step 1 (spec A2) — clamp the jump to the earliest step it
    // DOES render, or validateStep(1)'s password/email checks dead-end the wizard.
    const target = stepForFields(fields) ?? 4;
    setStep((resumeEntry ? Math.max(2, target) : target) as 1 | 2 | 3 | 4);
  }

  function applyActivateFailure(err: unknown) {
    if (err instanceof OnboardNumericValidationError) {
      applyFieldFailures(err.fieldErrors);
      return;
    }
    if (err instanceof ApiError && err.body && typeof err.body === 'object') {
      const body = err.body as {
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (body.error === 'validation_failed' && body.fieldErrors) {
        applyFieldFailures(body.fieldErrors);
        return;
      }
      if (
        body.error === 'intent_expired' ||
        body.error === 'intent_used' ||
        body.error === 'intent_invalid'
      ) {
        const status = body.error.slice('intent_'.length) as 'expired' | 'used' | 'invalid';
        const current = acquisitionRef.current;
        if (current) commitAcquisition(applyIntentResolution(current, { status }));
        setInvitationCode('');
        setCodeAccepted(false);
        setIntentError(
          status === 'expired'
            ? 'That SMS signup link expired before activation. Enter a current invitation code.'
            : status === 'used'
              ? 'That SMS signup link was already used. Sign in, or enter another invitation code.'
              : 'That SMS signup link is invalid. Enter a current invitation code.',
        );
        setCodeError(null);
        setSubmitError(null);
        return;
      }
      if (isCodeError(body.error)) {
        setCodeAccepted(false);
        setCodeError(
          apiErrorMessage(err, 'That invitation code was not accepted. Try another code.'),
        );
        setSubmitError(null);
        return;
      }
    }
    setSubmitError(apiErrorMessage(err, 'Activation failed.'));
  }

  /**
   * Spec A3 — duplicate email. Proves ownership with the typed password, then resolves via
   * `GET /api/tenant/me` WITHOUT activating the session yet (`session.getToken()` mints a token
   * for a completed-but-inactive Clerk session), so a "resume" outcome can carry on in this same
   * screen rather than bouncing through a sign-in redirect.
   */
  async function handleDuplicateEmail() {
    let signInFailed = true;
    let tenantStatus: number | null = null;
    let newSessionId: string | null = null;
    let newUserId = '';
    try {
      if (signInLoaded && signIn) {
        const attempt = await signIn.create({
          identifier: form.email.trim(),
          password: form.password,
        });
        if (attempt.status === 'complete' && attempt.createdSessionId) {
          signInFailed = false;
          newSessionId = attempt.createdSessionId;
          // useSessionList()'s `sessions` is a render-time snapshot — the session this create()
          // just minted is never in it (no re-render has happened yet), so a lookup there always
          // misses and newUserId comes back ''. clerk.client is the live singleton and already
          // reflects it by the time create() resolves.
          const session = clerk.client.sessions.find(s => s.id === newSessionId);
          newUserId = session?.user?.id ?? session?.publicUserData.userId ?? '';
          const token = session ? ((await session.getToken()) ?? undefined) : undefined;
          if (token) {
            try {
              await apiRequest('/api/tenant/me', TenantMeProbeSchema, { token });
              tenantStatus = 200;
            } catch (probeErr) {
              tenantStatus = probeErr instanceof ApiError ? probeErr.status : null;
            }
          }
        }
      }
    } catch {
      // Network/SDK throw — signInFailed stays true unless it was already flipped above,
      // which fails closed to 'existing_account' (never 'resume') via decideDuplicateEmail.
    }

    switch (decideDuplicateEmail({ signInFailed, tenantStatus })) {
      case 'resume':
        if (acquisitionRef.current) {
          const bound = bindAcquisitionAccount(acquisitionRef.current, {
            email: form.email,
            clerkUserId: newUserId,
          });
          if (!bound) {
            setSubmitError(
              'This signup link belongs to another account. Switch accounts and open your own link.',
            );
            return;
          }
          commitAcquisition(bound);
        }
        setIdentity({ clerkUserId: newUserId, sessionId: newSessionId });
        setResumeEntry(true);
        setErrors({});
        setSubmitError(null);
        setStep(2);
        return;
      case 'existing_account':
        if (newSessionId && signUpLoaded && activateSignUpSession) {
          await activateSignUpSession({ session: newSessionId });
        }
        try {
          await acquisitionPersistence.drain();
          await clearAcquisitionEnvelope();
        } catch {
          // Global account cleanup will retry; do not block the proven account.
        }
        acquisitionRef.current = null;
        setAcquisition(null);
        router.replace('/');
        return;
      case 'needs_signin':
        setSubmitError('An account already exists for that email. Sign in instead.');
    }
  }

  async function next() {
    if (submitting) return;
    setSubmitError(null);
    if (step < 4) {
      if (validateStep(step)) {
        if (step === 1 && acquisitionRef.current) {
          const bound = bindAcquisitionAccount(acquisitionRef.current, { email: form.email });
          if (!bound) {
            setSubmitError(
              'Those acquisition details belong to a different account. Restart signup from your own link.',
            );
            return;
          }
          commitAcquisition(bound);
        }
        setStep((step + 1) as typeof step);
      }
      return;
    }
    setSubmitting(true);
    try {
      if (resumeEntry) {
        if (!identity.clerkUserId) {
          setSubmitError('Your session looks stale. Go back and sign in again.');
          return;
        }
        await activateAndFinish(identity.clerkUserId, identity.sessionId);
        return;
      }
      if (!signUpLoaded || !signUp) return;
      let attempt = signUp;
      if (signUp.status !== 'complete') {
        try {
          attempt = await signUp.create({
            emailAddress: form.email.trim(),
            password: form.password,
            firstName: form.firstName.trim(),
            // The Clerk instance requires a username the design has no field for; identity here
            // is the email. See usernameFromEmail.
            username: usernameFromEmail(form.email.trim()),
          });
        } catch (err) {
          if (isClerkAPIResponseError(err) && err.errors[0]?.code === 'form_identifier_exists') {
            await handleDuplicateEmail();
            return;
          }
          throw err;
        }
      }
      if (attempt.status !== 'complete') {
        await attempt.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPhase('verify');
        return;
      }
      const userId = attempt.createdUserId;
      if (!userId) throw new Error('Clerk sign-up completed without a user id');
      if (acquisitionRef.current) {
        const bound = bindAcquisitionAccount(acquisitionRef.current, {
          email: form.email,
          clerkUserId: userId,
        });
        if (!bound) throw new Error('Acquisition account mismatch');
        commitAcquisition(bound);
      }
      setIdentity({ clerkUserId: userId, sessionId: attempt.createdSessionId });
      await activateAndFinish(userId, attempt.createdSessionId);
    } catch (err) {
      setSubmitError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function verify() {
    if (!signUpLoaded || !signUp || submitting) return;
    if (!emailAlreadyVerified(signUp) && code.trim().length === 0) {
      setErrors({ code: 'Enter the code from your email.' });
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      // The attempt is one-shot: a prior press (or a success whose response was lost to bad
      // signal) may have already verified the email. Skip or converge instead of re-attempting.
      let attempt = signUp;
      if (!emailAlreadyVerified(signUp)) {
        try {
          attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
        } catch (err) {
          const already = isClerkAPIResponseError(err) && err.errors[0]?.code === ALREADY_VERIFIED;
          if (!already) throw err;
          attempt = await signUp.reload();
        }
      }
      if (attempt.status !== 'complete' && attempt.missingFields.includes('username')) {
        attempt = await signUp.update({ username: usernameFromEmail(form.email.trim()) });
      }
      if (attempt.status !== 'complete') {
        setSubmitError(
          attempt.verifications.emailAddress.status === 'verified'
            ? `Your email is verified but sign-up is incomplete (needs: ${attempt.missingFields.join(', ') || 'unknown'}). Contact QuoteMax support.`
            : 'That code did not verify. Check it and try again.',
        );
        return;
      }
      if (!attempt.createdUserId) throw new Error('Clerk sign-up completed without a user id');
      if (acquisitionRef.current) {
        const bound = bindAcquisitionAccount(acquisitionRef.current, {
          email: form.email,
          clerkUserId: attempt.createdUserId,
        });
        if (!bound) throw new Error('Acquisition account mismatch');
        commitAcquisition(bound);
      }
      setIdentity({ clerkUserId: attempt.createdUserId, sessionId: attempt.createdSessionId });
      await activateAndFinish(attempt.createdUserId, attempt.createdSessionId);
    } catch (err) {
      setSubmitError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  /** Spec B2's verify pane — send another six-digit code when the first never arrived. */
  async function resendCode() {
    if (!signUpLoaded || !signUp || resending) return;
    setResending(true);
    setResendError(null);
    setResendSent(false);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendSent(true);
    } catch (err) {
      setResendError(clerkErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  function back() {
    if (phase === 'verify') {
      setPhase('form');
      return;
    }
    if (!codeAccepted) {
      // The A2/A3 resume entries arrive here via a redirect, which leaves no history — going back
      // would throw "GO_BACK was not handled by any navigator". Leave the flow instead.
      if (router.canGoBack()) router.back();
      else router.replace('/welcome');
      return;
    }
    const firstStep = resumeEntry ? 2 : 1;
    if (step <= firstStep) {
      setCodeAccepted(false);
      return;
    }
    setStep((step - 1) as typeof step);
  }

  /**
   * The only real exit from a resumed sign-up. A signed-in tradie with no tenant row is sent here
   * by the `(tabs)` guard on every cold start, so without this they can never reach sign-in again —
   * which is exactly what a stale session from an abandoned sign-up looks like.
   */
  async function switchAccount() {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    try {
      await signOut();
      try {
        await acquisitionPersistence.drain();
        await clearAcquisitionEnvelope();
      } catch {
        // The route still leaves this account; global sign-out cleanup retries.
      }
      acquisitionRef.current = null;
      setAcquisition(null);
      queryClient.clear();
      router.replace('/welcome');
    } catch {
      setCodeError('Could not sign out. Check your signal and try again.');
      setSwitchingAccount(false);
    }
  }

  const reviewRows: { label: string; value: string }[] = [
    { label: 'Business', value: form.businessName || '—' },
    {
      label: 'Trades',
      value:
        TRADES.filter(t => form.trades.includes(t.slug))
          .map(t => t.label)
          .join(' · ') || '—',
    },
    { label: 'State', value: form.state || '—' },
    { label: 'Mobile', value: verifiedIntent?.displayPhone || form.mobile || '—' },
    {
      label: 'Licence',
      value: form.licenceNumber ? `${form.licenceType || ''} ${form.licenceNumber}`.trim() : '—',
    },
    ...(hasLabourTrade
      ? [
          { label: 'Hourly rate', value: form.hourlyRate ? `A$${form.hourlyRate} ex-GST` : '—' },
          { label: 'Call-out minimum', value: form.callOutMin ? `A$${form.callOutMin}` : '—' },
          { label: 'Materials markup', value: form.markupPct ? `${form.markupPct}%` : '—' },
        ]
      : []),
    ...(hasPainting
      ? [
          {
            label: 'Painting',
            value:
              form.paintingPricingModel === 'hourly'
                ? `A$${form.paintingHourlyRate}/hr · hourly`
                : `A$${form.paintingWallsRate}/m² walls · per m²`,
          },
        ]
      : []),
    ...(hasRoofing ? [{ label: 'Roofing', value: 'Measured per-m² rate card' }] : []),
    ...(acquisition?.selection
      ? [
          {
            label: 'Selected plan',
            value: `${acquisition.selection.plan} · ${acquisition.selection.interval === 'year' ? 'annual' : 'monthly'}`,
          },
        ]
      : []),
    { label: 'GST', value: form.gstRegistered ? 'Registered' : 'Not registered' },
    { label: 'AI line', value: 'Provisioning on activate' },
  ];

  const stepNum = meta.num;

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <AuthHeader>
        <View style={styles.headerLeft}>
          {/* A resumed sign-up (spec A2/A3) is a signed-in tradie with no tenant: the guards send
              them straight back here, so back has no destination until the code is accepted. */}
          {resumeEntry && !codeAccepted ? null : <BackButton onPress={back} />}
          <BrandMark height={22} body={colors.logoBody} notch={colors.logoNotch} />
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.stepCounter, { color: colors.textDim }]}>
          {codeAccepted ? `STEP ${stepNum} / 04` : 'GET STARTED'}
        </Text>
      </AuthHeader>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {codeAccepted ? (
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Account setup"
              accessibilityValue={{
                min: 1,
                max: 4,
                now: step,
                text: `Step ${step} of 4: ${meta.label}`,
              }}
              style={styles.progress}
            >
              {STEPS.map((s, i) => (
                <View
                  key={s.num}
                  style={[
                    styles.progressSeg,
                    { backgroundColor: i < step ? colors.textPri : colors.inkLine },
                  ]}
                />
              ))}
            </View>
          ) : null}

          {!codeAccepted ? (
            <>
              <Text style={[styles.h2, { color: colors.textPri }]}>INVITATION CODE</Text>
              <Text style={[styles.sub, { color: colors.textSec }]}>
                Enter the code from your invitation to set up your QuoteMax account.
              </Text>
              {intentResolving ? (
                <Text style={[styles.intentNote, { color: colors.textSec }]}>
                  Checking your SMS signup link…
                </Text>
              ) : null}
              {verifiedIntent ? (
                <View
                  style={[
                    styles.verifiedIntent,
                    { backgroundColor: colors.inkCard, borderColor: colors.inkLine },
                  ]}
                >
                  <Text style={[styles.verifiedIntentLabel, { color: colors.textDim }]}>
                    VERIFIED VIA SMS
                  </Text>
                  <Text selectable style={[styles.verifiedIntentPhone, { color: colors.textPri }]}>
                    {formatAuMobileDisplay(verifiedIntent.displayPhone)}
                  </Text>
                  <Text style={[styles.intentNote, { color: colors.textSec }]}>
                    We will confirm this number from the one-time link again when you activate.
                  </Text>
                </View>
              ) : null}
              {intentError ? (
                <View style={styles.intentErrorBlock}>
                  <Text style={[styles.intentNote, { color: colors.dangerBright }]}>
                    {intentError}
                  </Text>
                  {acquisition?.intent?.status === 'pending' && !intentResolving ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIntentRetry(value => value + 1)}
                      style={styles.retryIntent}
                    >
                      <Text style={[styles.retryIntentLabel, { color: colors.textPri }]}>
                        RETRY SMS LINK
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {acquisition?.selection ? (
                <Text style={[styles.intentNote, { color: colors.textSec }]}>
                  Selected plan: {acquisition.selection.plan.toUpperCase()} ·{' '}
                  {acquisition.selection.interval === 'year' ? 'ANNUAL' : 'MONTHLY'}
                </Text>
              ) : null}
              <View style={styles.fields}>
                {lockedSmsInvitation ? (
                  <View
                    accessibilityLabel={`Invitation code from verified SMS ${lockedSmsInvitation}`}
                    style={[
                      styles.verifiedIntent,
                      { backgroundColor: colors.inkCard, borderColor: colors.inkLine },
                    ]}
                  >
                    <Text style={[styles.verifiedIntentLabel, { color: colors.textDim }]}>
                      INVITATION CODE · FROM TEXT · READ-ONLY
                    </Text>
                    <Text selectable style={[styles.verifiedIntentPhone, { color: colors.textPri }]}>
                      {lockedSmsInvitation}
                    </Text>
                    {codeError ? (
                      <Text style={[styles.intentNote, { color: colors.dangerBright }]}>
                        {codeError}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Field
                    label="Invitation code"
                    value={invitationCode}
                    onChangeText={v => setInvitationCode(v.toUpperCase())}
                    required
                    hint="e.g. JON-JUNE-FLYERS-7K2P"
                    height={54}
                    autoCapitalize="none"
                    autoComplete="off"
                    error={codeError}
                  />
                )}
              </View>
              {codeNote ? (
                <Text style={[styles.codeNote, { color: colors.warningBright }]}>{codeNote}</Text>
              ) : null}
              {continuityWarning ? (
                <Text style={[styles.codeNote, { color: colors.warningBright }]}>
                  {continuityWarning}
                </Text>
              ) : null}
              <View style={styles.primaryAction}>
                <PrimaryCta
                  label={codeChecking ? 'Checking…' : 'Continue'}
                  onPress={submitCode}
                  loading={codeChecking}
                />
              </View>
              {resumeEntry ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void switchAccount()}
                  disabled={switchingAccount}
                  style={styles.switchAccount}
                >
                  <Text style={[styles.switchAccountText, { color: colors.textSec }]}>
                    {switchingAccount ? 'Signing out…' : 'Sign in with a different account'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              {phase === 'verify' ? (
                <>
                  {/* ponytail: no verification screen exists in the kit; this pane reuses the
                      wizard's own field anatomy for the code Clerk requires by email. */}
                  <Text style={[styles.h2, { color: colors.textPri }]}>CHECK YOUR EMAIL</Text>
                  <Text style={[styles.sub, { color: colors.textSec }]}>
                    We sent a six digit code to {form.email.trim()}. Enter it to activate your
                    account.
                  </Text>
                  <View style={styles.fields}>
                    <Field
                      label="Verification code"
                      value={code}
                      onChangeText={setCode}
                      required
                      hint="From your email"
                      height={54}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      error={errors.code}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={resendCode}
                    disabled={resending}
                    style={styles.resendRow}
                  >
                    <Text style={[styles.resendLabel, { color: colors.textSec }]}>
                      {resending
                        ? 'RESENDING…'
                        : resendSent
                          ? 'CODE RESENT · CHECK YOUR EMAIL'
                          : 'RESEND CODE'}
                    </Text>
                  </Pressable>
                  {resendError ? (
                    <Text style={[styles.submitError, { color: colors.dangerBright }]}>
                      {resendError}
                    </Text>
                  ) : null}
                  {submitError ? (
                    <Text style={[styles.submitError, { color: colors.dangerBright }]}>
                      {submitError}
                    </Text>
                  ) : null}
                  <View style={styles.primaryAction}>
                    <PrimaryCta label="Activate my AI line" onPress={verify} loading={submitting} />
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.h2, { color: colors.textPri }]}>
                    {meta.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.sub, { color: colors.textSec }]}>{meta.sub}</Text>

                  <View style={styles.fields}>
                    {step === 1 && !resumeEntry && (
                      <>
                        <Field
                          label="Business name"
                          value={form.businessName}
                          onChangeText={v => set('businessName', v)}
                          required
                          height={54}
                          autoCapitalize="words"
                          error={errors.businessName}
                        />
                        <Field
                          label="Your first name"
                          value={form.firstName}
                          onChangeText={v => set('firstName', v)}
                          required
                          height={54}
                          autoCapitalize="words"
                          autoComplete="name"
                          error={errors.firstName}
                        />
                        <Field
                          label="Email"
                          value={form.email}
                          onChangeText={v => set('email', v)}
                          required
                          hint="We send the quote copies here"
                          height={54}
                          keyboardType="email-address"
                          autoComplete="email"
                          error={errors.email}
                        />
                        <Field
                          label="Password"
                          value={form.password}
                          onChangeText={v => set('password', v)}
                          required
                          hint="Min 8 characters"
                          height={54}
                          secure="show"
                          autoComplete="new-password"
                          error={errors.password}
                        />
                      </>
                    )}

                    {step === 2 && (
                      <>
                        {resumeEntry && (
                          <Field
                            label="Business name"
                            value={form.businessName}
                            onChangeText={v => set('businessName', v)}
                            required
                            hint="Shows on every quote you send"
                            height={54}
                            autoCapitalize="words"
                            error={errors.businessName}
                          />
                        )}
                        <View>
                          <View style={styles.labelRow}>
                            <Text style={[styles.fieldLabel, { color: colors.textPri }]}>
                              YOUR TRADE<Text style={{ color: colors.textDim }}> *</Text>
                            </Text>
                            <Text style={[styles.fieldHint, { color: colors.textDim }]}>
                              PICK ONE OR MORE
                            </Text>
                          </View>
                          <View style={styles.grid}>
                            {TRADES.map(trade => {
                              const on = form.trades.includes(trade.slug);
                              return (
                                <Pressable
                                  key={trade.slug}
                                  accessibilityRole="checkbox"
                                  accessibilityState={{ checked: on }}
                                  onPress={() =>
                                    set(
                                      'trades',
                                      on
                                        ? form.trades.filter(t => t !== trade.slug)
                                        : [...form.trades, trade.slug],
                                    )
                                  }
                                  style={[
                                    styles.gridOption,
                                    {
                                      backgroundColor: on ? colors.inkCard : colors.ink,
                                      borderColor: on ? colors.accentSoft : colors.ctlLine,
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.tick,
                                      {
                                        borderColor: on ? colors.accentSoft : colors.ctlLine,
                                        backgroundColor: on ? colors.accentSoft : 'transparent',
                                      },
                                    ]}
                                  >
                                    {on ? (
                                      <Text style={[styles.tickMark, { color: colors.inkDeep }]}>
                                        ✓
                                      </Text>
                                    ) : null}
                                  </View>
                                  <Text style={[styles.gridLabel, { color: colors.textPri }]}>
                                    {trade.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          {errors.trades ? (
                            <Text style={[styles.fieldError, { color: colors.dangerBright }]}>
                              {errors.trades}
                            </Text>
                          ) : null}
                        </View>

                        <View>
                          <View style={styles.labelRow}>
                            <Text style={[styles.fieldLabel, { color: colors.textPri }]}>
                              STATE
                            </Text>
                            <Text style={[styles.fieldHint, { color: colors.textDim }]}>
                              OPTIONAL · SETS YOUR BOOKING TIMEZONE
                            </Text>
                          </View>
                          <View style={styles.chips}>
                            {STATES.map(code_ => {
                              const on = form.state === code_;
                              return (
                                <Pressable
                                  key={code_}
                                  accessibilityRole="radio"
                                  accessibilityState={{ selected: on }}
                                  onPress={() => set('state', on ? '' : code_)}
                                  style={[
                                    styles.chip,
                                    {
                                      backgroundColor: on ? colors.inkCard : colors.ink,
                                      borderColor: on ? colors.accentSoft : colors.ctlLine,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.chipLabel, { color: colors.textPri }]}>
                                    {code_}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {verifiedIntent ? (
                          <View
                            accessibilityLabel={`Mobile verified via SMS ${formatAuMobileDisplay(verifiedIntent.displayPhone)}`}
                            style={[
                              styles.verifiedIntent,
                              { backgroundColor: colors.inkCard, borderColor: colors.inkLine },
                            ]}
                          >
                            <Text
                              style={[styles.verifiedIntentLabel, { color: colors.textDim }]}
                            >
                              MOBILE · VERIFIED VIA SMS
                            </Text>
                            <Text
                              selectable
                              style={[styles.verifiedIntentPhone, { color: colors.textPri }]}
                            >
                              {formatAuMobileDisplay(verifiedIntent.displayPhone)}
                            </Text>
                            <Text style={[styles.intentNote, { color: colors.textSec }]}>
                              Read-only · the server will derive this from your one-time intent.
                            </Text>
                          </View>
                        ) : (
                          <Field
                            label="Mobile"
                            value={form.mobile}
                            onChangeText={v => set('mobile', v)}
                            hint="Optional · for your welcome text"
                            height={54}
                            suffix="AU"
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            error={errors.mobile}
                          />
                        )}
                        <Field
                          label="Contact name"
                          value={form.contactName}
                          onChangeText={v => set('contactName', v)}
                          hint="Optional · who customers ask for"
                          height={54}
                          autoCapitalize="words"
                          autoComplete="name"
                        />
                        <Field
                          label="Website"
                          value={form.websiteUrl}
                          onChangeText={v => set('websiteUrl', v)}
                          hint="Optional"
                          height={54}
                          autoCapitalize="none"
                          keyboardType="url"
                          error={errors.websiteUrl}
                        />
                        <Field
                          label="Business address"
                          value={form.businessAddress}
                          onChangeText={v => set('businessAddress', v)}
                          hint="Optional"
                          height={54}
                          autoCapitalize="words"
                        />
                        <Field
                          label="ABN"
                          value={form.abn}
                          onChangeText={v => set('abn', v)}
                          hint="Optional · add later"
                          height={54}
                          keyboardType="number-pad"
                        />

                        {!showLicence ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              setShowLicence(true);
                              // The pre-fill below is display-only until it's written into form
                              // state — an untouched default must still reach the activation
                              // payload, not just the screen.
                              if (!form.licenceType && form.state && primaryTrade) {
                                const prefill = LICENCE_BODIES[form.state]?.[primaryTrade];
                                if (prefill) set('licenceType', prefill);
                              }
                            }}
                            style={styles.collapseToggle}
                          >
                            <Text style={[styles.collapseToggleLabel, { color: colors.textSec }]}>
                              + ADD LICENCE DETAILS{' '}
                              <Text style={{ color: colors.textDim }}>(OPTIONAL)</Text>
                            </Text>
                          </Pressable>
                        ) : (
                          <>
                            <Field
                              label="Licence body"
                              value={form.licenceType}
                              onChangeText={v => set('licenceType', v)}
                              hint="Optional"
                              height={54}
                            />
                            <Field
                              label="Licence number"
                              value={form.licenceNumber}
                              onChangeText={v => set('licenceNumber', v)}
                              hint="Optional"
                              height={54}
                            />
                            <Field
                              label="Licence expiry"
                              value={form.licenceExpiry}
                              onChangeText={v => set('licenceExpiry', v)}
                              hint="Optional · YYYY-MM-DD"
                              height={54}
                              keyboardType="numbers-and-punctuation"
                            />
                          </>
                        )}
                      </>
                    )}

                    {step === 3 && (
                      <>
                        {hasLabourTrade && (
                          <>
                            <Text style={[styles.sectionHeading, { color: colors.textPri }]}>
                              LABOUR RATES
                            </Text>
                            <Field
                              label="Hourly rate"
                              value={form.hourlyRate}
                              onChangeText={v => set('hourlyRate', v)}
                              required
                              hint="Ex-GST"
                              height={54}
                              prefix="$"
                              suffix="/ hr"
                              keyboardType="decimal-pad"
                              error={errors.hourlyRate}
                            />
                            <Field
                              label="Call-out minimum"
                              value={form.callOutMin}
                              onChangeText={v => set('callOutMin', v)}
                              required
                              hint="Absorbed into jobs over $800"
                              height={54}
                              prefix="$"
                              keyboardType="decimal-pad"
                              error={errors.callOutMin}
                            />
                            <Field
                              label="Materials markup"
                              value={form.markupPct}
                              onChangeText={v => set('markupPct', v)}
                              required
                              hint="20–35% typical AU"
                              height={54}
                              suffix="%"
                              keyboardType="number-pad"
                              error={errors.markupPct}
                            />
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ expanded: showAdvanced }}
                              onPress={() => setShowAdvanced(v => !v)}
                              style={styles.collapseToggle}
                            >
                              <Text style={[styles.collapseToggleLabel, { color: colors.textSec }]}>
                                {showAdvanced
                                  ? 'HIDE ADVANCED PRICING'
                                  : '+ SHOW ADVANCED PRICING (5 OPTIONAL)'}
                              </Text>
                            </Pressable>
                            {showAdvanced && (
                              <>
                                <Field
                                  label="Apprentice rate"
                                  value={form.apprenticeRate}
                                  onChangeText={v => set('apprenticeRate', v)}
                                  hint="Default $65/hr"
                                  height={54}
                                  prefix="$"
                                  keyboardType="decimal-pad"
                                />
                                <Field
                                  label="Senior rate"
                                  value={form.seniorRate}
                                  onChangeText={v => set('seniorRate', v)}
                                  hint="Default $160/hr"
                                  height={54}
                                  prefix="$"
                                  keyboardType="decimal-pad"
                                />
                                <Field
                                  label="After-hours multiplier"
                                  value={form.afterHoursMultiplier}
                                  onChangeText={v => set('afterHoursMultiplier', v)}
                                  hint="Default 1.5×"
                                  height={54}
                                  keyboardType="decimal-pad"
                                />
                                <Field
                                  label="Minimum charge"
                                  value={form.minLabourHours}
                                  onChangeText={v => set('minLabourHours', v)}
                                  hint="Default 2hr"
                                  height={54}
                                  suffix="hr"
                                  keyboardType="decimal-pad"
                                />
                                <Field
                                  label="Risk buffer"
                                  value={form.riskBufferPct}
                                  onChangeText={v => set('riskBufferPct', v)}
                                  hint="Default 15%"
                                  height={54}
                                  suffix="%"
                                  keyboardType="number-pad"
                                />
                              </>
                            )}
                          </>
                        )}

                        {hasPainting && (
                          <>
                            <Text style={[styles.sectionHeading, { color: colors.textPri }]}>
                              PAINTING PRICING
                            </Text>
                            <View style={styles.modelRow}>
                              {(
                                [
                                  { value: 'sqm', label: 'Per m²', sublabel: 'Rate card' },
                                  { value: 'hourly', label: 'Hourly', sublabel: 'By labour time' },
                                ] as const
                              ).map(opt => {
                                const active = form.paintingPricingModel === opt.value;
                                return (
                                  <Pressable
                                    key={opt.value}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: active }}
                                    onPress={() => set('paintingPricingModel', opt.value)}
                                    style={[
                                      styles.modelBtn,
                                      {
                                        backgroundColor: active ? colors.inkCard : colors.ink,
                                        borderColor: active ? colors.accentSoft : colors.ctlLine,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.modelLabel, { color: colors.textPri }]}>
                                      {opt.label}
                                    </Text>
                                    <Text style={[styles.modelSub, { color: colors.textDim }]}>
                                      {opt.sublabel}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                            {form.paintingPricingModel === 'sqm' ? (
                              <>
                                <Field
                                  label="Walls"
                                  value={form.paintingWallsRate}
                                  onChangeText={v => set('paintingWallsRate', v)}
                                  hint="$/m²"
                                  height={54}
                                  prefix="$"
                                  keyboardType="decimal-pad"
                                />
                                <Field
                                  label="Ceilings"
                                  value={form.paintingCeilingsRate}
                                  onChangeText={v => set('paintingCeilingsRate', v)}
                                  hint="$/m²"
                                  height={54}
                                  prefix="$"
                                  keyboardType="decimal-pad"
                                />
                                <Field
                                  label="Trim / doors"
                                  value={form.paintingTrimRate}
                                  onChangeText={v => set('paintingTrimRate', v)}
                                  hint="$/lm"
                                  height={54}
                                  prefix="$"
                                  keyboardType="decimal-pad"
                                />
                                <Field
                                  label="Exterior"
                                  value={form.paintingExteriorRate}
                                  onChangeText={v => set('paintingExteriorRate', v)}
                                  hint="$/m²"
                                  height={54}
                                  prefix="$"
                                  keyboardType="decimal-pad"
                                />
                              </>
                            ) : (
                              <Field
                                label="Hourly rate"
                                value={form.paintingHourlyRate}
                                onChangeText={v => set('paintingHourlyRate', v)}
                                hint="$/hr ex-GST"
                                height={54}
                                prefix="$"
                                keyboardType="decimal-pad"
                              />
                            )}
                            <Field
                              label="Painting call-out minimum"
                              value={form.paintingCallOutMin}
                              onChangeText={v => set('paintingCallOutMin', v)}
                              hint="Ex-GST floor per job"
                              height={54}
                              prefix="$"
                              keyboardType="decimal-pad"
                              error={errors.paintingCallOutMin}
                            />
                          </>
                        )}

                        {hasRoofing && (
                          <>
                            <Text style={[styles.sectionHeading, { color: colors.textPri }]}>
                              ROOFING PRICING
                            </Text>
                            <Text style={[styles.sectionHint, { color: colors.textSec }]}>
                              The base $/m² rate (ex-GST) we multiply the measured sloped roof area
                              by, per material.
                            </Text>
                            {ROOFING_RATE_FIELDS.map(f => (
                              <Field
                                key={f.key}
                                label={f.label}
                                value={form.roofing[f.key]}
                                onChangeText={v => setRoofing(f.key, v)}
                                hint={
                                  f.defaultRate === 0
                                    ? 'Blank = never auto-quoted'
                                    : `Default $${f.defaultRate}/m²`
                                }
                                height={54}
                                prefix="$"
                                suffix="/ m²"
                                keyboardType="decimal-pad"
                                error={errors[`roofing.${f.key}`]}
                              />
                            ))}
                          </>
                        )}

                        <View style={[styles.switchRow, { borderColor: colors.inkLine }]}>
                          <Text style={[styles.switchLabel, { color: colors.textPri }]}>
                            GST registered
                          </Text>
                          <ThemedSwitch
                            accessibilityLabel="GST registered"
                            value={form.gstRegistered}
                            onValueChange={v => set('gstRegistered', v)}
                            trackColor={{ false: colors.inkLine, true: colors.accent }}
                            thumbColor={colors.inkCard}
                          />
                        </View>
                      </>
                    )}

                    {step === 4 && (
                      <View>
                        <View style={styles.labelRow}>
                          <Text style={[styles.fieldLabel, { color: colors.textPri }]}>
                            CHECK THESE OVER
                          </Text>
                          <Text style={[styles.fieldHint, { color: colors.textDim }]}>
                            EDITABLE LATER
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.reviewCard,
                            {
                              backgroundColor: colors.inkCard,
                              borderColor: colors.inkLine,
                            },
                          ]}
                        >
                          {reviewRows.map((row, index) => (
                            <View
                              key={row.label}
                              style={[
                                styles.reviewRow,
                                {
                                  borderBottomColor: colors.inkLine,
                                  borderBottomWidth: index === reviewRows.length - 1 ? 0 : 1,
                                },
                              ]}
                            >
                              <Text style={[styles.reviewLabel, { color: colors.textDim }]}>
                                {row.label.toUpperCase()}
                              </Text>
                              <Text style={[styles.reviewValue, { color: colors.textPri }]}>
                                {row.value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {submitError ? (
                    <Text style={[styles.submitError, { color: colors.dangerBright }]}>
                      {submitError}
                    </Text>
                  ) : null}

                  <View style={styles.primaryAction}>
                    <PrimaryCta label={meta.cta} onPress={next} loading={submitting} />
                  </View>
                  <Text style={[styles.reassure, { color: colors.textDim }]}>
                    NO CARD NEEDED · ABOUT 3 MINUTES
                  </Text>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepCounter: { ...type.label, letterSpacing: 1.2 },
  body: { flexGrow: 1, paddingTop: spacing.xxl, paddingHorizontal: AUTH_GUTTER },
  progress: { flexDirection: 'row', gap: spacing.sm },
  progressSeg: { height: 4, flex: 1, borderRadius: 2 },
  h2: { ...type.headline, marginTop: spacing.xxl },
  sub: { ...type.body, marginTop: spacing.md },
  fields: { marginTop: spacing.xxl, gap: spacing.xxl },
  primaryAction: { marginTop: spacing.gap },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    rowGap: spacing.xs,
    marginBottom: spacing.sm,
  },
  fieldLabel: { ...type.label, letterSpacing: 1.2 },
  fieldHint: { ...type.label, fontFamily: fonts.mono.regular, letterSpacing: 0.3 },
  fieldError: { ...type.bodySm, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridOption: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 132,
    minHeight: touch.listRow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tick: {
    width: 20,
    height: 20,
    borderRadius: radius.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickMark: { ...type.bodySm, fontFamily: fonts.sans.bold },
  gridLabel: { ...type.bodySm, fontFamily: fonts.sans.semiBold, flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touch.minimum,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { ...type.label, letterSpacing: 0.8 },
  collapseToggle: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  collapseToggleLabel: { ...type.label, letterSpacing: 0.6 },
  resendRow: {
    marginTop: spacing.sm,
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  resendLabel: { ...type.label, letterSpacing: 0.6 },
  sectionHeading: { ...type.title, textTransform: 'none' },
  sectionHint: { ...type.bodySm, marginTop: -spacing.md },
  modelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  modelBtn: {
    flex: 1,
    minWidth: 132,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  modelLabel: { ...type.body, fontFamily: fonts.sans.semiBold },
  modelSub: { ...type.label, fontFamily: fonts.mono.regular, letterSpacing: 0.3 },
  switchRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  switchLabel: { ...type.body, fontFamily: fonts.sans.semiBold, flex: 1 },
  codeNote: { ...type.bodySm, marginTop: spacing.md },
  intentNote: { ...type.bodySm },
  verifiedIntent: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  verifiedIntentLabel: { ...type.label, letterSpacing: 0.8 },
  verifiedIntentPhone: {
    ...type.title,
    fontFamily: fonts.mono.semiBold,
    fontVariant: ['tabular-nums'],
  },
  intentErrorBlock: { marginTop: spacing.lg, gap: spacing.sm },
  retryIntent: { minHeight: touch.minimum, justifyContent: 'center', alignSelf: 'flex-start' },
  retryIntentLabel: { ...type.label, letterSpacing: 0.6 },
  switchAccount: {
    marginTop: spacing.lg,
    minHeight: touch.minimum,
    justifyContent: 'center',
  },
  switchAccountText: { ...type.bodySm, fontFamily: fonts.sans.semiBold },
  reviewCard: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  reviewRow: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  reviewLabel: { ...type.label, letterSpacing: 0.8 },
  reviewValue: {
    ...type.bodySm,
    fontFamily: fonts.mono.semiBold,
    fontVariant: ['tabular-nums'],
  },
  submitError: { ...type.bodySm, marginTop: spacing.lg },
  reassure: { ...type.label, marginTop: spacing.lg, letterSpacing: 0.6 },
});
