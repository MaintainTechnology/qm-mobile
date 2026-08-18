/**
 * `onboard` — the Sign-Up flow (design kit screen 3): a 4-step wizard that
 * mirrors the web funnel. Step 01 collects the account, steps 02–03 the trade
 * and pricing facts, step 04 reviews and activates.
 *
 * Activation is the web app's own POST /api/onboard/activate (it inserts the
 * tenants + pricing_book rows and provisions the AI line), called with the
 * Clerk user created here so the tenant lands linked via tenants.clerk_user_id.
 * The Clerk session only becomes active after activation succeeds, so a
 * failed activation leaves the wizard on screen to retry rather than dropping
 * the tradie onto an empty home screen.
 */
import { isClerkAPIResponseError, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { AuthHeader, BackButton, Field, PrimaryCta } from '@/features/auth/ui';
import { apiRequest } from '@/lib/api';
import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const TRADES = [
  { slug: 'electrical', label: 'Electrical' },
  { slug: 'plumbing', label: 'Plumbing' },
  { slug: 'painting', label: 'Painting' },
  { slug: 'roofing', label: 'Roofing' },
] as const;
type TradeSlug = (typeof TRADES)[number]['slug'];

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

const STEPS = [
  { num: '01', label: 'Account', sub: 'Your business and how customers reach you.', cta: 'Continue' },
  { num: '02', label: 'Trade & licence', sub: 'What you do, where, optional regulatory bits.', cta: 'Continue' },
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

// Matches the web wizard's AU mobile rule (lib/onboard/schema.ts).
const AU_MOBILE = /^(\+?61\s?4\d{2}\s?\d{3}\s?\d{3}|0?4\d{2}\s?\d{3}\s?\d{3})$/;

const ActivateResponse = z.looseObject({ ok: z.boolean() });

type Form = {
  businessName: string;
  firstName: string;
  email: string;
  password: string;
  trades: TradeSlug[];
  state: string;
  mobile: string;
  licence: string;
  hourlyRate: string;
  callOutMin: string;
  markupPct: string;
  reroofRate: string;
  riskBufferPct: string;
};

const EMPTY_FORM: Form = {
  businessName: '',
  firstName: '',
  email: '',
  password: '',
  trades: [],
  state: '',
  mobile: '',
  licence: '',
  hourlyRate: '',
  callOutMin: '',
  markupPct: '',
  reroofRate: '',
  riskBufferPct: '',
};

/** "110.00" | "$ 110.00" → 110; blank → undefined so optional fields drop out. */
function toNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function activateErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'body' in err) {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === 'object') {
      const b = body as { message?: string; error?: string };
      if (b.message) return b.message;
      if (b.error === 'validation_failed') return 'Some details need another look. Go back and check each step.';
      if (b.error) return `Activation failed (${b.error}). Try again.`;
    }
  }
  return 'Could not reach QuoteMax. Check your signal and try again.';
}

function clerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors[0];
    if (first?.code === 'form_identifier_exists')
      return 'An account already exists for that email. Sign in instead.';
    return first?.longMessage ?? first?.message ?? 'Could not create your account. Try again.';
  }
  return 'Could not reach QuoteMax. Check your signal and try again.';
}

export function SignUpScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<'form' | 'verify'>('form');
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const meta = STEPS[step - 1] ?? STEPS[0];
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const hasLabourTrade = form.trades.includes('electrical') || form.trades.includes('plumbing');

  function validateStep(current: number): boolean {
    const next: Partial<Record<string, string>> = {};
    if (current === 1) {
      if (form.businessName.trim().length < 2) next.businessName = 'Business name required.';
      if (form.firstName.trim().length < 1) next.firstName = 'First name required.';
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.';
      if (form.password.length < 8) next.password = 'Password needs at least 8 characters.';
    }
    if (current === 2) {
      if (form.trades.length === 0) next.trades = 'Pick at least one trade.';
      if (!form.state) next.state = 'Pick your state.';
      if (!AU_MOBILE.test(form.mobile.trim()))
        next.mobile = 'Enter a valid Australian mobile (04xx xxx xxx).';
    }
    if (current === 3) {
      if (toNumber(form.hourlyRate) === undefined) next.hourlyRate = 'Enter your hourly rate.';
      if (toNumber(form.callOutMin) === undefined) next.callOutMin = 'Enter your call-out minimum.';
      if (hasLabourTrade && toNumber(form.markupPct) === undefined)
        next.markupPct = 'Required for electrical and plumbing pricing.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function postActivate(clerkUserId: string) {
    await apiRequest('/api/onboard/activate', ActivateResponse, {
      method: 'POST',
      body: {
        business_name: form.businessName.trim(),
        owner_first_name: form.firstName.trim(),
        owner_email: form.email.trim(),
        owner_mobile: form.mobile.trim(),
        clerk_user_id: clerkUserId,
        trades: form.trades,
        state: form.state,
        licence_number: form.licence.trim(),
        hourly_rate: toNumber(form.hourlyRate),
        call_out_minimum: toNumber(form.callOutMin),
        default_markup_pct: toNumber(form.markupPct),
        roofing_corrugated_rate: toNumber(form.reroofRate),
        risk_buffer_pct: toNumber(form.riskBufferPct),
        // The kit's wizard has no code field ("No card needed"); builds carry a
        // campaign code in config. The server rejects activation without a valid one.
        invitation_code: process.env.EXPO_PUBLIC_ONBOARD_INVITE_CODE ?? '',
      },
    });
  }

  /** Activation after the Clerk account exists: tenant row first, then the session. */
  async function finishActivation(clerkUserId: string, sessionId: string | null) {
    await postActivate(clerkUserId);
    if (sessionId && setActive) await setActive({ session: sessionId });
    router.replace('/');
  }

  async function next() {
    if (submitting) return;
    setSubmitError(null);
    if (step < 4) {
      if (validateStep(step)) setStep(step + 1);
      return;
    }
    if (!isLoaded || !signUp) return;
    setSubmitting(true);
    try {
      // create() mutates signUp in place AND returns it; the return value is
      // what carries the post-create status for the type system.
      const attempt =
        signUp.status === 'complete'
          ? signUp
          : await signUp.create({
              emailAddress: form.email.trim(),
              password: form.password,
              firstName: form.firstName.trim(),
            });
      if (attempt.status !== 'complete') {
        await attempt.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPhase('verify');
        return;
      }
      const userId = attempt.createdUserId;
      if (!userId) throw new Error('Clerk sign-up completed without a user id');
      await finishActivation(userId, attempt.createdSessionId);
    } catch (err) {
      setSubmitError(
        isClerkAPIResponseError(err) ? clerkErrorMessage(err) : activateErrorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function verify() {
    if (!isLoaded || submitting) return;
    if (code.trim().length === 0) {
      setErrors({ code: 'Enter the code from your email.' });
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status !== 'complete' || !attempt.createdUserId) {
        setSubmitError('That code did not verify. Check it and try again.');
        return;
      }
      await finishActivation(attempt.createdUserId, attempt.createdSessionId);
    } catch (err) {
      setSubmitError(
        isClerkAPIResponseError(err) ? clerkErrorMessage(err) : activateErrorMessage(err),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    if (phase === 'verify') {
      setPhase('form');
      return;
    }
    if (step === 1) router.back();
    else setStep(step - 1);
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
    { label: 'Hourly rate', value: form.hourlyRate ? `$${form.hourlyRate} ex-GST` : '—' },
    { label: 'Reroof · corrugated', value: form.reroofRate ? `$${form.reroofRate} / m²` : '—' },
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
                  { backgroundColor: i < step ? colors.accent : colors.inkLine },
                ]}
              />
            ))}
          </View>

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
                {step === 1 && (
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
                          STATE<Text style={{ color: '#F43F5E' }}> *</Text>
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
                              onPress={() => set('state', code_)}
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
                      {errors.state ? (
                        <Text style={[styles.fieldError, { color: colors.dangerBright }]}>
                          {errors.state}
                        </Text>
                      ) : null}
                    </View>

                    <Field
                      label="Mobile"
                      value={form.mobile}
                      onChangeText={v => set('mobile', v)}
                      required
                      hint="Australian mobile"
                      height={54}
                      suffix="AU"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      error={errors.mobile}
                    />
                    <Field
                      label="Licence number"
                      value={form.licence}
                      onChangeText={v => set('licence', v)}
                      hint="Optional"
                      height={54}
                      autoCapitalize="words"
                    />
                  </>
                )}

                {step === 3 && (
                  <>
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
                      height={54}
                      prefix="$"
                      suffix="Min"
                      keyboardType="decimal-pad"
                      error={errors.callOutMin}
                    />
                    <Field
                      label="Default markup"
                      value={form.markupPct}
                      onChangeText={v => set('markupPct', v)}
                      hint="On materials"
                      height={54}
                      suffix="%"
                      keyboardType="number-pad"
                      error={errors.markupPct}
                    />
                    <Field
                      label="Reroof rate — Colorbond corrugated"
                      value={form.reroofRate}
                      onChangeText={v => set('reroofRate', v)}
                      hint="Roofing"
                      height={54}
                      prefix="$"
                      suffix="/ m²"
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Risk buffer"
                      value={form.riskBufferPct}
                      onChangeText={v => set('riskBufferPct', v)}
                      hint="Optional"
                      height={54}
                      suffix="%"
                      keyboardType="number-pad"
                    />
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
    minHeight: 44,
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
