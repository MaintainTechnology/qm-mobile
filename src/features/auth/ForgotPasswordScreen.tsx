import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { recoveryFactorLabel, usePasswordRecovery } from '@/features/auth/use-password-recovery';
import {
  AUTH_GUTTER,
  AuthHeader,
  BackButton,
  Field,
  GhostButton,
  PrimaryCta,
} from '@/features/auth/ui';
import { safeDestination } from '@/lib/destinations';
import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string | string[] }>();
  const recovery = usePasswordRecovery();
  const rawIntent = Array.isArray(intent) ? intent[0] : intent;
  const destination = rawIntent ? safeDestination(rawIntent) : null;
  const returnTo = destination?.audience === 'authenticated' ? destination.href : '/';

  function cancel() {
    recovery.restart();
    router.replace({ pathname: '/sign-in', params: returnTo === '/' ? {} : { intent: returnTo } });
  }

  const headings = {
    request: 'RESET YOUR PASSWORD',
    code: 'CHECK YOUR EMAIL',
    password: 'CHOOSE A NEW PASSWORD',
    factor: 'VERIFY YOUR ACCOUNT',
    complete: 'PASSWORD UPDATED',
    unknown: 'CHECK RECOVERY STATUS',
    blocked: 'ANOTHER STEP IS NEEDED',
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <AuthHeader>
        <BackButton onPress={cancel} />
        <Text style={[type.label, { color: colors.textDim }]}>PASSWORD RECOVERY</Text>
      </AuthHeader>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}
        >
          <Text accessibilityRole="header" style={[type.headline, { color: colors.textPri }]}>
            {headings[recovery.phase]}
          </Text>
          <Text style={[styles.description, { color: colors.textSec }]}>
            {recovery.phase === 'request'
              ? 'Enter the email you use to sign in to QuoteMax. We will send you a reset code.'
              : recovery.phase === 'code'
                ? `Enter the reset code sent to ${recovery.email}.`
                : recovery.phase === 'password'
                  ? `Set a new password for ${recovery.email}. Your account password requirements still apply.`
                  : recovery.phase === 'factor'
                    ? 'Complete the additional verification required by your account.'
                    : recovery.phase === 'complete'
                      ? 'Your new password is ready. Continue to QuoteMax.'
                      : recovery.phase === 'unknown'
                        ? 'The request may have completed. Check its status before submitting again.'
                        : 'Recovery has paused. You can check its status, start again or return to sign in.'}
          </Text>

          <View style={styles.fields}>
            {recovery.phase === 'request' ? (
              <Field
                label="Email"
                value={recovery.email}
                onChangeText={recovery.setEmail}
                keyboardType="email-address"
                autoComplete="email"
              />
            ) : null}
            {recovery.phase === 'code' ? (
              <Field
                label="Reset code"
                value={recovery.code}
                onChangeText={recovery.setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />
            ) : null}
            {recovery.phase === 'password' ? (
              <>
                <Field
                  label="New password"
                  value={recovery.password}
                  onChangeText={recovery.setPassword}
                  secure="eye"
                  autoComplete="new-password"
                />
                <Field
                  label="Confirm new password"
                  value={recovery.confirmation}
                  onChangeText={recovery.setConfirmation}
                  secure="eye"
                  autoComplete="new-password"
                />
              </>
            ) : null}
            {recovery.phase === 'factor' && recovery.factor ? (
              <Field
                label={
                  recovery.factor.strategy === 'backup_code' ? 'Backup code' : 'Verification code'
                }
                value={recovery.code}
                onChangeText={recovery.setCode}
                keyboardType={recovery.factor.strategy === 'backup_code' ? 'default' : 'number-pad'}
                autoComplete="one-time-code"
              />
            ) : null}
          </View>

          {recovery.error ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: colors.dangerBright }]}
            >
              {recovery.error}
            </Text>
          ) : null}
          {recovery.notice ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.message, { color: colors.textSec }]}
            >
              {recovery.notice}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {recovery.phase === 'request' ? (
              <PrimaryCta
                label="Send reset code"
                onPress={() => void recovery.requestCode()}
                loading={recovery.busy}
                disabled={!recovery.ready}
              />
            ) : null}
            {recovery.phase === 'code' ? (
              <>
                <PrimaryCta
                  label="Verify reset code"
                  onPress={() => void recovery.verifyCode()}
                  loading={recovery.busy}
                  disabled={!recovery.ready}
                />
                <GhostButton
                  label="Send a new reset code"
                  onPress={() => void recovery.resendCode()}
                  disabled={recovery.busy || !recovery.ready}
                />
              </>
            ) : null}
            {recovery.phase === 'password' ? (
              <PrimaryCta
                label="Update password"
                onPress={() => void recovery.savePassword()}
                loading={recovery.busy}
                disabled={!recovery.ready}
              />
            ) : null}
            {recovery.phase === 'factor' ? (
              <>
                {recovery.factor ? (
                  <PrimaryCta
                    label="Verify account"
                    onPress={() => void recovery.verifyFactor()}
                    loading={recovery.busy}
                    disabled={!recovery.ready}
                  />
                ) : null}
                {recovery.factors.map((factor, index) => (
                  <GhostButton
                    key={`${factor.strategy}-${index}`}
                    label={recoveryFactorLabel(factor)}
                    onPress={() => void recovery.chooseFactor(factor)}
                    disabled={recovery.busy || !recovery.ready}
                  />
                ))}
              </>
            ) : null}
            {recovery.phase === 'complete' ? (
              <PrimaryCta
                label="Continue to QuoteMax"
                onPress={() => void recovery.continueToApp(() => router.replace(returnTo as Href))}
                loading={recovery.busy}
                disabled={!recovery.ready}
              />
            ) : null}
            {recovery.phase === 'unknown' || recovery.phase === 'blocked' ? (
              <GhostButton
                label="Check recovery status"
                onPress={() => void recovery.checkStatus()}
                loading={recovery.busy}
                disabled={!recovery.ready}
              />
            ) : null}
            {recovery.phase !== 'request' && recovery.phase !== 'complete' ? (
              <GhostButton
                label="Start again"
                onPress={recovery.restart}
                disabled={recovery.busy}
              />
            ) : null}
            <GhostButton label="Return to sign in" onPress={cancel} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flexGrow: 1, paddingTop: spacing.gap, paddingHorizontal: AUTH_GUTTER },
  description: { ...type.body, marginTop: spacing.md },
  fields: { marginTop: spacing.gap, gap: spacing.xxl },
  actions: { marginTop: spacing.xxl, gap: spacing.md },
  message: { ...type.bodySm, marginTop: spacing.lg },
});
