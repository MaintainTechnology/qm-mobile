import { useAuth } from '@clerk/expo';
import { useNetInfo } from '@react-native-community/netinfo';
import { usePreventRemove } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { PrimaryCta } from '@/features/auth/ui';
import { netInfoIsOnline } from '@/lib/query';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { SectionScreen } from '../sections/SectionScreen';
import {
  CONTACT_TOPICS,
  type ContactDraft,
} from './contact-contract';
import { type ContactScope } from './contact-draft';
import { useContactSupport } from './use-contact-support';

function SupportField({ label, error, required, ...input }: TextInputProps & { label: string; error?: string; required?: boolean }) {
  const { colors } = useTheme();
  return <View style={styles.fieldGroup}>
    <Text style={[styles.label, { color: colors.textPri }]}>{label.toUpperCase()}{required ? ' *' : ''}</Text>
    <TextInput {...input} accessibilityLabel={label} accessibilityHint={error}
      accessibilityState={{ disabled: input.editable === false }} autoCorrect={false}
      style={[styles.message, { minHeight: 52, color: colors.textPri, backgroundColor: colors.ink, borderColor: error ? colors.dangerBright : colors.ctlLine }]} />
    {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.dangerBright }]}>{error}</Text> : null}
  </View>;
}

export function SupportScreen() {
  const { isLoaded, userId, sessionId } = useAuth();
  if (!isLoaded) return <SectionScreen title="Help & support" fallbackRoute="/welcome"><Text>Loading your support draft…</Text></SectionScreen>;
  return <SupportForm key={JSON.stringify([userId ?? null, sessionId ?? null])} scope={{ userId: userId ?? null }} />;
}

function SupportForm({ scope }: { scope: ContactScope }) {
  const { colors } = useTheme();
  const isSignedIn = scope.userId !== null;
  const router = useRouter();
  const network = useNetInfo();
  const model = useContactSupport(scope);
  const { draft, fieldErrors, busy: submitting } = model;
  const sent = model.receipt?.status === 'confirmed';
  const unknown = model.receipt?.status === 'unknown';
  const locked = !model.loaded || submitting || unknown || sent;
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  usePreventRemove(submitting || (model.loaded && !model.stored), () => {
    setSubmissionError('Your draft is still being stored. Retry storage if needed, then press Back again.');
    void model.retryStorage();
  });

  function update<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) {
    if (locked) return;
    model.edit({ [key]: value });
    setSubmissionError(null);
  }

  function announce(message: string) {
    AccessibilityInfo.announceForAccessibility(message);
  }

  async function submit() {
    if (locked) return;
    if (!netInfoIsOnline(network)) {
      const message =
        'You are offline. Reconnect, then press Send again. Your draft is still here.';
      setSubmissionError(message);
      announce(message);
      return;
    }

    setSubmissionError(null);
    await model.send();
  }

  if (sent) {
    return (
      <SectionScreen
        title="Help & support"
        subtitle="The server confirmed that the email provider accepted your enquiry."
        fallbackRoute={isSignedIn ? '/menu' : '/welcome'}
      >
        <View
          accessibilityRole="summary"
          style={[
            styles.receipt,
            { borderColor: colors.accentSoft, backgroundColor: colors.inkCard },
          ]}
        >
          <Text accessibilityRole="header" style={[styles.receiptTitle, { color: colors.textPri }]}>
            Message sent
          </Text>
          <Text style={[type.body, { color: colors.textSec }]}>
            Your enquiry was accepted for sending to QuoteMax support. The team can reply to
            the email you supplied.
          </Text>
        </View>
        {model.storageError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.dangerBright }]}>{model.storageError}</Text> : null}
        {model.storageError ? <PrimaryCta label="Retry local storage" onPress={() => void model.retryStorage()} /> : null}
        <PrimaryCta label="Write another message" disabled={submitting || !!model.storageError} onPress={() => void model.newMessage()} />
        <PrimaryCta
          label={isSignedIn ? 'Return to menu' : 'Return to welcome'}
          onPress={() => router.replace((isSignedIn ? '/menu' : '/welcome') as never)}
        />
      </SectionScreen>
    );
  }

  return (
    <SectionScreen
      title="Help & support"
      subtitle="Send a question to QuoteMax. Nothing leaves this screen until you press Send."
      fallbackRoute={isSignedIn ? '/menu' : '/welcome'}
    >
      {unknown ? <View accessibilityRole="alert" style={[styles.alert, { borderColor: colors.ctlLine }]}>
        <Text style={[styles.receiptTitle, { color: colors.textPri }]}>Send outcome unknown</Text>
        <Text style={[type.body, { color: colors.textSec }]}>Your message may have been received. This server cannot check support requests yet. Another send is paused to avoid a duplicate. Keep this device reference and check your reply email.</Text>
        <Text selectable style={[styles.count, { color: colors.textDim }]}>Device reference: {model.receipt?.requestId}</Text>
      </View> : null}
      <View style={styles.form} pointerEvents={locked ? 'none' : 'auto'}>
        <SupportField
          label="Name"
          editable={!locked}
          required
          value={draft.name}
          onChangeText={value => update('name', value.slice(0, 100))}
          autoCapitalize="words"
          autoComplete="name"
          error={fieldErrors.name}
        />
        <SupportField
          label="Email"
          editable={!locked}
          autoCapitalize="none"
          required
          value={draft.email}
          onChangeText={value => update('email', value.slice(0, 200))}
          keyboardType="email-address"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <SupportField
          label="Mobile (optional)"
          editable={!locked}
          value={draft.phone}
          onChangeText={value => update('phone', value.slice(0, 40))}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={fieldErrors.phone}
        />

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textPri }]}>TOPIC *</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Support topic"
            style={styles.topics}
          >
            {CONTACT_TOPICS.map(topic => {
              const selected = draft.topic === topic;
              return (
                <Pressable
                  key={topic}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: locked }}
                  disabled={locked}
                  onPress={() => update('topic', topic)}
                  style={({ pressed }) => [
                    styles.topic,
                    {
                      borderColor: selected ? colors.accentSoft : colors.ctlLine,
                      backgroundColor: selected || pressed ? colors.ink : colors.inkCard,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.topicLabel,
                      { color: selected ? colors.textPri : colors.textSec },
                    ]}
                  >
                    {topic}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.topic ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: colors.dangerBright }]}
            >
              {fieldErrors.topic}
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.messageLabelRow}>
            <Text style={[styles.label, { color: colors.textPri }]}>MESSAGE *</Text>
            <Text style={[styles.count, { color: colors.textDim }]}>
              {draft.message.length} / 4000
            </Text>
          </View>
          <TextInput
            accessibilityLabel="Message"
            accessibilityHint={fieldErrors.message ?? 'At least 10 characters'}
            value={draft.message}
            onChangeText={value => update('message', value)}
            editable={!locked}
            multiline
            maxLength={4000}
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect
            placeholder="Tell us what you need help with…"
            placeholderTextColor={colors.textDim}
            style={[
              styles.message,
              {
                color: colors.textPri,
                backgroundColor: colors.ink,
                borderColor: fieldErrors.message ? colors.dangerBright : colors.ctlLine,
              },
            ]}
          />
          {fieldErrors.message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: colors.dangerBright }]}
            >
              {fieldErrors.message}
            </Text>
          ) : null}
        </View>
      </View>

      {model.storageError || (!unknown && (submissionError || model.error)) ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={[
            styles.alert,
            { borderColor: colors.dangerBright, backgroundColor: colors.inkCard },
          ]}
        >
          <Text style={[styles.alertText, { color: colors.dangerBright }]}>{model.storageError || submissionError || model.error}</Text>
        </View>
      ) : null}
      {model.storageError ? <PrimaryCta label="Retry local storage" disabled={submitting} onPress={() => void model.retryStorage()} /> : null}

      <PrimaryCta
        label="Send message"
        loading={submitting}
        disabled={locked || !model.stored}
        onPress={() => void submit()}
      />
      <Text style={[styles.draftNote, { color: colors.textDim }]}>
        {model.loaded ? (model.stored ? 'Your working draft is encrypted on this device for up to seven days. A send reference is kept separately until its outcome is known.' : 'Storing your working draft… Keep this screen open until storage finishes.') : 'Loading your private working draft…'}
      </Text>
      <PrimaryCta label="Browse Help & guides" disabled={submitting || (model.loaded && !model.stored)} onPress={() => router.push('/sections/help' as never)} />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  fieldGroup: { gap: spacing.sm },
  label: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  topic: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  topicLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  messageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  count: { fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 18 },
  message: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  error: { fontFamily: fonts.sans.medium, fontSize: 13, lineHeight: 19 },
  alert: { borderWidth: 1, borderRadius: radius.control, padding: spacing.lg },
  alertText: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 21 },
  draftNote: { ...type.bodySm, textAlign: 'center' },
  receipt: { borderWidth: 1, borderRadius: radius.card, padding: spacing.xl, gap: spacing.md },
  receiptTitle: { ...type.title },
});
