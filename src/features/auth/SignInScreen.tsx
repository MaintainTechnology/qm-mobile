/**
 * `signin` — the Login screen (design kit screen 2), wired to Clerk.
 *
 * Same Clerk instance as the quotemax web app, so an account created on either
 * surface signs in on both, and the session token authorises the web /api routes.
 */
import { isClerkAPIResponseError, useAuth } from '@clerk/expo';
// Core 3 made the signal-based hooks the default: no isLoaded, no setActive, and
// create() resolves to { error }. The resource-shaped hooks this flow is built on
// moved to /legacy — see the note in SignUpScreen.
import { useSignIn } from '@clerk/expo/legacy';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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

import { AUTH_GUTTER, AuthHeader, BackButton, Field, PrimaryCta } from '@/features/auth/ui';
import { safeDestination } from '@/lib/destinations';
import { fonts, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** A Clerk failure, worded for a tradie rather than an API consumer. */
function signInErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors[0];
    if (first?.code === 'form_identifier_not_found')
      return 'No account matches that email. Check the address, or get your QuoteMax below.';
    if (first?.code === 'form_password_incorrect')
      return 'That password does not match. Try again.';
    if (first?.code === 'form_code_incorrect')
      return 'That code does not match. Check the newest email and try again.';
    return first?.longMessage ?? first?.message ?? 'Sign in failed. Try again.';
  }
  return 'Could not reach QuoteMax. Check your signal and try again.';
}

export function SignInScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string | string[] }>();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Device trust (Clerk "client trust", on by default): the first sign-in on a new
  // phone must be confirmed with an emailed six-digit code before a session exists.
  const [stage, setStage] = useState<'credentials' | 'verify'>('credentials');
  const [code, setCode] = useState('');

  function destinationAfterSignIn(): Href {
    const rawIntent = Array.isArray(intent) ? intent[0] : intent;
    const destination = rawIntent ? safeDestination(rawIntent) : null;
    return destination?.audience === 'authenticated' ? (destination.href as Href) : '/';
  }

  /** Email the device-trust code for the pending sign-in. False when Clerk offers no email factor. */
  async function prepareDeviceCode(): Promise<boolean> {
    if (!signIn) return false;
    const factor = (signIn.supportedSecondFactors ?? []).find(f => f.strategy === 'email_code');
    if (!factor || factor.strategy !== 'email_code') return false;
    await signIn.prepareSecondFactor({
      strategy: 'email_code',
      emailAddressId: factor.emailAddressId,
    });
    return true;
  }

  async function submit() {
    if (!isLoaded || submitting) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let attempt;
      try {
        attempt = await signIn.create({ identifier: email.trim(), password });
      } catch (err) {
        // A session can survive on the server while the app's local state says
        // signed out (e.g. after onboarding activated it in another launch).
        // Clerk then rejects sign-in with session_exists and the screen would
        // dead-end. The tradie just typed valid credentials, so replace the
        // stale session: sign it out and retry once.
        const stale = isClerkAPIResponseError(err) && err.errors[0]?.code === 'session_exists';
        if (!stale) throw err;
        await signOut();
        attempt = await signIn.create({ identifier: email.trim(), password });
      }
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace(destinationAfterSignIn());
      } else if (attempt.status === 'needs_client_trust' && (await prepareDeviceCode())) {
        setStage('verify');
      } else {
        // The kit designs no MFA; anything else unresolvable here goes to the web.
        setError('This account needs another verification step. Sign in on the web first.');
      }
    } catch (err) {
      setError(signInErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyDevice() {
    if (!isLoaded || submitting) return;
    if (code.trim().length < 6) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: code.trim(),
      });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace(destinationAfterSignIn());
      } else {
        setError('That code does not match. Check the newest email and try again.');
      }
    } catch (err) {
      setError(signInErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendDeviceCode() {
    if (submitting) return;
    setError(null);
    try {
      await prepareDeviceCode();
    } catch (err) {
      setError(signInErrorMessage(err));
    }
  }

  /**
   * A `<Redirect>` or `router.replace` leaves no history, so this screen is often the first one on
   * the stack — `router.back()` then throws "GO_BACK was not handled by any navigator". Fall back
   * to the auth entry point rather than dead-ending the tradie.
   */
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <AuthHeader>
        <BackButton onPress={goBack} />
        <Text style={[styles.headerLabel, { color: colors.textDim }]}>SIGN IN</Text>
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
          {stage === 'credentials' ? (
            <>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={1.4}
                style={[styles.h2, { color: colors.textPri }]}
              >
                WELCOME BACK
              </Text>
              <Text style={[styles.sub, { color: colors.textSec }]}>
                Sign in to review your quotes and keep work moving.
              </Text>

              <View style={styles.fields}>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secure="eye"
                  autoComplete="password"
                  error={error}
                />
              </View>

              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  WebBrowser.openBrowserAsync('https://www.quotemax.com.au/forgot-password')
                }
                style={({ pressed }) => [styles.forgotLink, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.linkText, { color: colors.textSec }]}>
                  Forgot your password?
                </Text>
              </Pressable>

              <View style={styles.primaryAction}>
                <PrimaryCta label="Sign in" onPress={submit} loading={submitting} />
              </View>

              <View style={[styles.accountLinks, { borderTopColor: colors.inkLine }]}>
                <Text style={[styles.signupLine, { color: colors.textDim }]}>New to QuoteMax?</Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push('/sign-up')}
                  style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.linkText, { color: colors.textPri }]}>
                    Create an account
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={1.4}
                style={[styles.h2, { color: colors.textPri }]}
              >
                CHECK YOUR EMAIL
              </Text>
              <Text style={[styles.sub, { color: colors.textSec }]}>
                First sign-in on this phone. Enter the six-digit code we sent to {email.trim()}.
              </Text>

              <View style={styles.fields}>
                <Field
                  label="Verification code"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  error={error}
                />
              </View>

              <View style={styles.primaryAction}>
                <PrimaryCta
                  label="Verify and sign in"
                  onPress={verifyDevice}
                  loading={submitting}
                />
              </View>

              <View style={styles.links}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void resendDeviceCode()}
                  style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.linkText, { color: colors.textSec }]}>Send a new code</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerLabel: {
    ...type.label,
    letterSpacing: 1.2,
  },
  body: { flexGrow: 1, paddingTop: spacing.gap, paddingHorizontal: AUTH_GUTTER },
  h2: { ...type.headline },
  sub: { ...type.body, marginTop: spacing.md },
  fields: { marginTop: spacing.gap, gap: spacing.xxl },
  primaryAction: { marginTop: spacing.xxl },
  links: { marginTop: spacing.md, alignItems: 'center' },
  forgotLink: { minHeight: touch.minimum, alignSelf: 'flex-end', justifyContent: 'center' },
  linkButton: { minHeight: touch.minimum, justifyContent: 'center' },
  linkText: { ...type.bodySm, fontFamily: fonts.sans.semiBold },
  accountLinks: {
    marginTop: spacing.gap,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  signupLine: { ...type.bodySm },
});
