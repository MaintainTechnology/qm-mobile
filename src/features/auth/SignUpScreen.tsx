/**
 * `onboard` — the Sign-Up flow (design kit screen 3): a code gate (spec B1) followed by a 4-step
 * wizard that mirrors the web funnel (account, trade & licence, pricing, review).
 *
 * Activation is the web app's own POST /api/onboard/activate (it inserts the tenants +
 * pricing_book rows and provisions the AI line), called with the Clerk user created here so the
 * tenant lands linked via tenants.clerk_user_id. The Clerk session only becomes active on the
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { BrandMark } from '@/components/BrandMark';
import { AuthHeader, BackButton, Field, PrimaryCta } from '@/features/auth/ui';
import {
  API_TO_LOCAL_KEY,
  buildActivatePayload,
  EMPTY_ONBOARD_FORM,
  fieldLabel,
  isCodeError,
  LICENCE_BODIES,
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
import { fonts, touch } from '@/lib/theme';
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
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ resume?: string; uid?: string }>();

  const { signUp, setActive: activateSignUpSession, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const clerk = useClerk();
  const { userId: authUserId, sessionId: authSessionId, getToken: getAuthToken } = useAuth();

  const [resumeEntry, setResumeEntry] = useState(params.resume === '1');
  const [identity, setIdentity] = useState<{ clerkUserId: string; sessionId: string | null }>(
    () => ({ clerkUserId: params.uid || authUserId || '', sessionId: authSessionId ?? null }),
  );

  const [codeAccepted, setCodeAccepted] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeNote, setCodeNote] = useState<string | null>(null);

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

  // Resume entry (A2/A3) skips step 1, so business_name/owner_first_name/owner_email — all
  // required by OnboardActivateSchema — never get typed there. First name + email ARE on the
  // already-created Clerk user; back-fill those once. Business name has nowhere to live on a
  // Clerk user, so step 2 below grows a field for it in resume mode instead (spec A2's "steps
  // 2–4" — this lives structurally in step 2, not a re-shown step 1).
  const { user: clerkUser } = useUser();
  const identityBackfilled = useRef(false);
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
      if (form.mobile.trim() && !AU_MOBILE.test(form.mobile.trim()))
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
    setCodeChecking(true);
    setCodeError(null);
    setCodeNote(null);
    try {
      const res = await apiRequest('/api/onboard/validate-code', ValidateCodeResponseSchema, {
        method: 'POST',
        body: { code: value, channel: 'web' },
      });
      if (res.last_slot) setCodeNote('Heads up — this is the last sign-up slot for this code.');
      setInvitationCode(value);
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
      const res = await apiRequest('/api/onboard/activate', ActivateResponseSchema, {
        method: 'POST',
        body: buildActivatePayload(form, { clerkUserId, invitationCode }),
        // Provisions a real phone number end-to-end — the server's own budget for that is well
        // past the generic 15s default, so match it rather than abort a slow success client-side.
        timeoutMs: 180000,
      });
      router.replace(
        successHref({
          firstName: form.firstName.trim(),
          phoneNumber: res.phoneNumber ?? null,
          warning: res.warning ?? null,
          sessionId,
          clerkUserId,
        }),
      );
    } catch (err) {
      applyActivateFailure(err);
    }
  }

  function applyActivateFailure(err: unknown) {
    if (err instanceof ApiError && err.body && typeof err.body === 'object') {
      const body = err.body as {
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (body.error === 'validation_failed' && body.fieldErrors) {
        const fields = Object.keys(body.fieldErrors);
        const localErrors: Partial<Record<string, string>> = {};
        for (const f of fields) {
          const localKey = API_TO_LOCAL_KEY[f];
          const msg = body.fieldErrors[f]?.[0];
          if (localKey && msg) localErrors[localKey] = msg;
        }
        setErrors(localErrors);
        const summary = fields
          .map(f => `${fieldLabel(f)}: ${body.fieldErrors?.[f]?.[0] ?? 'Please check this'}`)
          .join(' · ');
        setSubmitError(`Please fix: ${summary}`);
        // Resume entry never renders step 1 (spec A2) — clamp the jump to the earliest step it
        // DOES render, or validateStep(1)'s password/email checks dead-end the wizard.
        const target = stepForFields(fields) ?? 4;
        setStep((resumeEntry ? Math.max(2, target) : target) as 1 | 2 | 3 | 4);
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
      if (validateStep(step)) setStep((step + 1) as typeof step);
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
      router.back();
      return;
    }
    const firstStep = resumeEntry ? 2 : 1;
    if (step <= firstStep) {
      setCodeAccepted(false);
      return;
    }
    setStep((step - 1) as typeof step);
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
    { label: 'Mobile', value: form.mobile || '—' },
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
    { label: 'GST', value: form.gstRegistered ? 'Registered' : 'Not registered' },
    { label: 'AI line', value: 'Provisioning on activate' },
  ];

  const lift = isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : '0 1px 2px rgba(43,36,34,0.06)';
  const stepNum = meta.num;

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <AuthHeader>
        <View style={styles.headerLeft}>
          <BackButton onPress={back} />
          <BrandMark height={22} body={colors.logoBody} notch={colors.logoNotch} />
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.stepCounter, { color: colors.textDim }]}>
          STEP {stepNum} <Text style={{ color: colors.inkLine }}>/</Text> 04
        </Text>
      </AuthHeader>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progress}>
            {STEPS.map((s, i) => (
              <View
                key={s.num}
                style={[
                  styles.progressSeg,
                  { backgroundColor: codeAccepted && i < step ? colors.accent : colors.inkLine },
                ]}
              />
            ))}
          </View>

          {!codeAccepted ? (
            <>
              <View style={styles.stepMeta}>
                <Text style={[styles.stepMetaRight, { color: colors.textPri }]}>
                  One code to start
                </Text>
              </View>
              <Text style={[styles.h2, { color: colors.textPri }]}>INVITATION CODE</Text>
              <Text style={[styles.sub, { color: colors.textSec }]}>
                Enter the invitation code whoever invited you sent. It unlocks tradie sign-up.
              </Text>
              <View style={styles.fields}>
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
              </View>
              {codeNote ? (
                <Text style={[styles.codeNote, { color: colors.warningBright }]}>{codeNote}</Text>
              ) : null}
              <View style={{ marginTop: 26 }}>
                <PrimaryCta
                  label={codeChecking ? 'Checking…' : 'Continue'}
                  onPress={submitCode}
                  loading={codeChecking}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.stepMeta}>
                <Text style={[styles.stepMetaLeft, { color: colors.textDim }]}>
                  STEP {stepNum} / 04
                </Text>
                <Text style={[styles.stepMetaRight, { color: colors.textPri }]}>{meta.label}</Text>
              </View>

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
                      error={errors.code}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={resendCode}
                    disabled={resending}
                    style={styles.resendRow}
                  >
                    <Text style={[styles.resendLabel, { color: colors.accentText }]}>
                      {resending
                        ? 'RESENDING…'
                        : resendSent
                          ? 'CODE RESENT — CHECK YOUR EMAIL'
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
                  <View style={{ marginTop: 26 }}>
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
                              YOUR TRADE<Text style={{ color: '#F43F5E' }}> *</Text>
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
                                      backgroundColor: on ? 'rgba(255,196,0,0.10)' : colors.ink,
                                      borderColor: on ? colors.accent : colors.inkLine,
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.tick,
                                      {
                                        borderColor: on ? colors.accent : colors.inkLine,
                                        backgroundColor: on ? colors.accent : 'transparent',
                                      },
                                    ]}
                                  >
                                    {on ? (
                                      <Text style={[styles.tickMark, { color: colors.accentInk }]}>
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
                                      backgroundColor: on ? 'rgba(255,196,0,0.12)' : colors.ink,
                                      borderColor: on ? colors.accent : colors.inkLine,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.chipLabel,
                                      { color: on ? colors.accentText : colors.textSec },
                                    ]}
                                  >
                                    {code_}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

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
                            <Text style={[styles.sectionHeading, { color: colors.accentText }]}>
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
                              onPress={() => setShowAdvanced(v => !v)}
                              style={styles.collapseToggle}
                            >
                              <Text
                                style={[styles.collapseToggleLabel, { color: colors.accentText }]}
                              >
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
                            <Text style={[styles.sectionHeading, { color: colors.accentText }]}>
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
                                        backgroundColor: active
                                          ? 'rgba(255,196,0,0.10)'
                                          : colors.ink,
                                        borderColor: active ? colors.accent : colors.inkLine,
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
                            <Text style={[styles.sectionHeading, { color: colors.accentText }]}>
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

                        <View style={styles.switchRow}>
                          <Text style={[styles.switchLabel, { color: colors.textPri }]}>
                            GST registered
                          </Text>
                          <Switch
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
                              boxShadow: lift,
                            },
                          ]}
                        >
                          {reviewRows.map(row => (
                            <View
                              key={row.label}
                              style={[styles.reviewRow, { borderBottomColor: colors.inkLine }]}
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

                  <View style={{ marginTop: 26 }}>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepCounter: {
    fontFamily: fonts.mono.medium,
    fontSize: 10.5,
    letterSpacing: 1.68, // .16em @ 10.5
  },
  body: { paddingTop: 22, paddingHorizontal: 26 },
  progress: { flexDirection: 'row', gap: 7 },
  progressSeg: { height: 4, flex: 1, borderRadius: 2 },
  stepMeta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepMetaLeft: {
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    letterSpacing: 1.6, // .16em @ 10
  },
  stepMetaRight: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13.5,
  },
  h2: {
    marginTop: 28,
    fontFamily: fonts.sans.extraBold,
    fontSize: 27,
    lineHeight: 29, // kit 1.03; floored at 1.05 so RN cannot clip the caps
    letterSpacing: -0.81, // -.03em @ 27
  },
  sub: {
    marginTop: 10,
    fontFamily: fonts.sans.regular,
    fontSize: 14.5,
    lineHeight: 22, // 1.55
  },
  fields: { marginTop: 22, gap: 20 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.47, // .14em @ 10.5
  },
  fieldHint: {
    fontFamily: fonts.mono.regular,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  fieldError: {
    marginTop: 6,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridOption: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tick: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickMark: { fontSize: 11, lineHeight: 13, fontFamily: fonts.sans.bold },
  gridLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    lineHeight: 17, // 1.2
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: touch.minimum,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 12.5,
    letterSpacing: 1, // .08em @ 12.5
  },
  collapseToggle: { minHeight: touch.minimum, justifyContent: 'center' },
  collapseToggleLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  resendRow: {
    marginTop: 4,
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  resendLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  sectionHeading: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
  },
  sectionHint: {
    marginTop: -12,
    fontFamily: fonts.sans.regular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  modelRow: { flexDirection: 'row', gap: 10 },
  modelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 3,
  },
  modelLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 13.5,
  },
  modelSub: {
    fontFamily: fonts.mono.regular,
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 14.5,
  },
  codeNote: {
    marginTop: 12,
    fontFamily: fonts.sans.semiBold,
    fontSize: 13.5,
    lineHeight: 19,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  reviewLabel: {
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    lineHeight: 13, // 1.3
    letterSpacing: 1.2, // .12em @ 10
  },
  reviewValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.sans.bold,
    fontSize: 13.5,
    lineHeight: 18, // 1.3
  },
  submitError: {
    marginTop: 16,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  reassure: {
    marginTop: 16,
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    lineHeight: 15, // 1.5
    letterSpacing: 1.4, // .14em @ 10
  },
});
