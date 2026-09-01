import { useAuth } from '@clerk/expo';
import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Field, PrimaryCta } from '@/features/auth/ui';
import { apiErrorMessage, apiRequest } from '@/lib/api';
import { netInfoIsOnline } from '@/lib/query';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { SectionScreen } from '../sections/SectionScreen';
import {
  CONTACT_TOPICS,
  ContactResponseSchema,
  contactSubmissionGate,
  EMPTY_CONTACT_DRAFT,
  type ContactDraft,
  type ContactFieldErrors,
  validateContactDraft,
} from './contact-contract';
import { clearContactDraft, loadContactDraft, saveContactDraft } from './contact-draft';

export function SupportScreen() {
  const { colors } = useTheme();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const network = useNetInfo();
  const editedRef = useRef(false);
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    void loadContactDraft().then(stored => {
      if (!active) return;
      if (!editedRef.current) setDraft(stored);
      setDraftLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftLoaded || sent) return;
    const timer = setTimeout(() => void saveContactDraft(draft), 300);
    return () => clearTimeout(timer);
  }, [draft, draftLoaded, sent]);

  function update<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) {
    editedRef.current = true;
    setDraft(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [key]: undefined }));
    setSubmissionError(null);
  }

  function announce(message: string) {
    AccessibilityInfo.announceForAccessibility(message);
  }

  async function submit() {
    const gate = contactSubmissionGate(submitting, netInfoIsOnline(network));
    if (gate === 'busy') return;
    if (gate === 'offline') {
      const message =
        'You are offline. Reconnect, then press Send again. Your draft is still here.';
      setSubmissionError(message);
      announce(message);
      return;
    }

    const validation = validateContactDraft(draft);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      const message = 'Check the highlighted fields before sending.';
      setSubmissionError(message);
      announce(message);
      return;
    }

    setFieldErrors({});
    setSubmissionError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/contact', ContactResponseSchema, {
        method: 'POST',
        body: validation.value,
        timeoutMs: 20_000,
      });
      setSent(true);
      await clearContactDraft();
      announce('Message sent. QuoteMax received your enquiry.');
    } catch (cause) {
      const message = apiErrorMessage(cause, 'That did not send. Please try again in a moment.');
      setSubmissionError(message);
      announce(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <SectionScreen
        title="Help & support"
        subtitle="QuoteMax received the message only after the server confirmed delivery."
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
            Thanks. The QuoteMax team has received your enquiry and can reply to the email you
            supplied.
          </Text>
        </View>
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
      <View style={styles.form}>
        <Field
          label="Name"
          required
          value={draft.name}
          onChangeText={value => update('name', value.slice(0, 100))}
          autoCapitalize="words"
          autoComplete="name"
          error={fieldErrors.name}
        />
        <Field
          label="Email"
          required
          value={draft.email}
          onChangeText={value => update('email', value.slice(0, 200))}
          keyboardType="email-address"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Field
          label="Mobile (optional)"
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
                  accessibilityState={{ checked: selected, disabled: submitting }}
                  disabled={submitting}
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
            editable={!submitting}
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

      {submissionError ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={[
            styles.alert,
            { borderColor: colors.dangerBright, backgroundColor: colors.inkCard },
          ]}
        >
          <Text style={[styles.alertText, { color: colors.dangerBright }]}>{submissionError}</Text>
        </View>
      ) : null}

      <PrimaryCta
        label="Send message"
        loading={submitting}
        disabled={!draftLoaded}
        onPress={() => void submit()}
      />
      <Text style={[styles.draftNote, { color: colors.textDim }]}>
        Your unfinished draft is encrypted on this device and removed after a confirmed send.
      </Text>
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
