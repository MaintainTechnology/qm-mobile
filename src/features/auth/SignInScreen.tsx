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
import { useRouter } from 'expo-router';
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

import { AuthHeader, BackButton, Field, PrimaryCta } from '@/features/auth/ui';
import { fonts } from '@/lib/theme';
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
        router.replace('/');
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
        router.replace('/');
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <AuthHeader>
        <BackButton onPress={() => router.back()} />
        <Text style={[styles.headerLabel, { color: colors.textDim }]}>SIGN IN</Text>
      </AuthHeader>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 34 }]}
          keyboardShouldPersistTaps="handled"
        >
          {stage === 'credentials' ? (
            <>
              <Text style={[styles.h2, { color: colors.textPri }]}>WELCOME BACK</Text>
              <Text style={[styles.sub, { color: colors.textSec }]}>
                Your AI line has been answering while you were on the tools.
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

              <View style={{ marginTop: 26 }}>
                <PrimaryCta label="Sign in" onPress={submit} loading={submitting} />
              </View>

              <View style={styles.links}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    WebBrowser.openBrowserAsync('https://www.quotemax.com.au/forgot-password')
                  }
                >
                  <Text style={[styles.forgot, { color: colors.accentText }]}>
                    Forgot your password?
                  </Text>
                </Pressable>
                <Text style={[styles.signupLine, { color: colors.textDim }]}>
                  No account yet?{' '}
                  <Text
                    style={{ color: colors.accentText }}
                    onPress={() => router.push('/sign-up')}
                  >
                    Get your QuoteMax
                  </Text>
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.h2, { color: colors.textPri }]}>NEW PHONE?</Text>
              <Text style={[styles.sub, { color: colors.textSec }]}>
                First sign-in on this phone. We emailed you a six-digit code — enter it to
                continue.
              </Text>

              <View style={styles.fields}>
                <Field
                  label="Verification code"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  error={error}
                />
              </View>

              <View style={{ marginTop: 26 }}>
                <PrimaryCta label="Verify and sign in" onPress={verifyDevice} loading={submitting} />
              </View>

              <View style={styles.links}>
                <Pressable accessibilityRole="button" onPress={() => void resendDeviceCode()}>
                  <Text style={[styles.forgot, { color: colors.accentText }]}>Send a new code</Text>
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
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 1.6, // .16em @ 10
  },
  body: { paddingTop: 30, paddingHorizontal: 26 },
  h2: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 30,
    lineHeight: 32, // kit /1; floored at 1.05 so RN cannot clip the caps
    letterSpacing: -1.05, // -.035em @ 30
  },
  sub: {
    marginTop: 11,
    fontFamily: fonts.sans.regular,
    fontSize: 14.5,
    lineHeight: 22, // 1.55
  },
  fields: { marginTop: 26, gap: 18 },
  links: {
    marginTop: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  forgot: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 12.5,
  },
  signupLine: {
    fontFamily: fonts.sans.regular,
    fontSize: 12.5,
  },
});
