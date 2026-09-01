/**
 * `success` — spec web-parity B6, the port of the web's `/onboard/success`. Reached only after
 * `POST /api/onboard/activate` returns `ok:true`; the phone reveal, warning + retry, and the
 * "open my dashboard" CTA are the same three states the web page shows.
 *
 * The Clerk session created (or proven, on the A3 duplicate-email path) earlier in the wizard is
 * deliberately still PENDING when this screen mounts — `setActive` is not called until the CTA
 * below is pressed. That preserves the wizard's existing invariant that a failed activation never
 * strands a signed-in-but-no-tenant session: activation has already succeeded by the time a
 * tradie reaches this screen, but the session itself only goes live on their own tap.
 *
 * Retry needs a Bearer token before that tap happens, though — Clerk supports this because a
 * completed sign-up/sign-in registers a SESSION on the client (`useSessionList`) independently of
 * which one is "active"; `session.getToken()` mints a token for a specific session without
 * activating it, so Retry works before the CTA is pressed.
 */
import { useAuth, useSessionList } from '@clerk/expo';
// Resource-shaped hook (setActive/isLoaded) — Core 3 keeps these at /legacy.
import { useSignUp } from '@clerk/expo/legacy';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { BrandMark } from '@/components/BrandMark';
import {
  acquisitionPostAuthDestination,
  loadAcquisitionEnvelope,
  saveAcquisitionEnvelope,
  type AcquisitionEnvelope,
  withAcquisitionProvisioningReceipt,
} from '@/features/auth/acquisition-envelope';
import { AUTH_GUTTER, PrimaryCta } from '@/features/auth/ui';
import { formatAuMobileDisplay } from '@/features/auth/onboard-fields';
import { ownerTestSmsHref, trustedSuccessState } from '@/features/auth/success-adapter';
import { apiErrorMessage, apiRequest } from '@/lib/api';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { TENANT_ME_KEY } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

const RetryProvisionResponse = z.looseObject({
  ok: z.boolean(),
  phoneNumber: z.string().nullish(),
  warning: z.string().nullish(),
  error: z.string().nullish(),
  setupComplete: z.boolean().optional(),
});

export function SuccessScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    phone?: string;
    warning?: string;
    session?: string;
    uid?: string;
    ready?: string;
  }>();

  // `setActive` is identical regardless of which Clerk hook hands it back — this screen has no
  // sign-up of its own, `useSignUp` is just the confirmed-working source elsewhere in the wizard.
  const { setActive, isLoaded } = useSignUp();
  const { sessions } = useSessionList();
  const { getToken, sessionId: activeSessionId, userId: activeUserId } = useAuth();
  const queryClient = useQueryClient();

  const firstName = params.name?.trim() || 'mate';
  const pendingSessionId = params.session ?? null;
  // `phone`, `warning`, and `ready` are untrusted route hints. A crafted deep
  // link must not manufacture success copy or an SMS CTA; the values below
  // hydrate only from the account-bound response receipt or a fresh retry.
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [hasReceipt, setHasReceipt] = useState(false);
  const [receiptChecked, setReceiptChecked] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const pendingSession = pendingSessionId
    ? sessions?.find(session => session.id === pendingSessionId)
    : undefined;
  const receiptOwnerId =
    activeUserId ?? pendingSession?.user?.id ?? pendingSession?.publicUserData.userId ?? null;
  const smsHref = ownerTestSmsHref(phoneNumber, setupComplete);
  const lineReady = smsHref !== null;
  const statusWarning =
    warning ??
    (!receiptChecked
      ? 'Confirming the saved provisioning result for this account…'
      : !hasReceipt
        ? 'Could not confirm a saved activation result. Retry with your authenticated session.'
        : !lineReady
          ? 'Your dedicated number is still being provisioned. You can open the dashboard and retry here later.'
          : null);
  const statusLabel = !receiptChecked
    ? 'CHECKING ACCOUNT'
    : hasReceipt
      ? 'ACCOUNT CREATED'
      : 'STATUS UNAVAILABLE';
  const statusHeading = !receiptChecked
    ? 'CONFIRMING SETUP.'
    : !hasReceipt
      ? 'SETUP STATUS UNAVAILABLE.'
      : lineReady
        ? "YOU'RE SET UP."
        : 'ACCOUNT SAVED. LINE STILL PENDING.';
  const statusSummary = !receiptChecked
    ? 'QuoteMax is checking the activation result saved for this account.'
    : !hasReceipt
      ? 'This link alone does not prove activation. Retry with the authenticated account or open the dashboard.'
      : lineReady
        ? 'Your account and dedicated number are ready. Open your dashboard to check your pricing book and review quotes before they go out.'
        : 'Your account was created, but the dedicated number is not ready for customer messages. You can still open your dashboard.';

  useEffect(() => {
    setReceiptChecked(false);
    setHasReceipt(false);
    setPhoneNumber(null);
    setWarning(null);
    setSetupComplete(false);
    if (!receiptOwnerId) return;
    let cancelled = false;
    void loadAcquisitionEnvelope({ clerkUserId: receiptOwnerId })
      .then(envelope => {
        if (cancelled) return;
        const trusted = trustedSuccessState(envelope);
        setPhoneNumber(trusted.phoneNumber);
        setWarning(trusted.warning);
        setSetupComplete(trusted.setupComplete);
        setHasReceipt(trusted.hasReceipt);
      })
      .catch(() => {
        // Missing/unavailable SecureStore fails closed to pending + retry.
      })
      .finally(() => {
        if (!cancelled) setReceiptChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [receiptOwnerId]);

  /** A token for the pending (not-yet-active) session, or the live one if this screen was
   *  reached already signed in (the A2 resume-entry path, whose session is active throughout). */
  async function tokenForRequest(): Promise<string | undefined> {
    if (activeSessionId) return (await getToken()) ?? undefined;
    const session = pendingSessionId ? sessions?.find(s => s.id === pendingSessionId) : undefined;
    return session ? ((await session.getToken()) ?? undefined) : undefined;
  }

  async function retry() {
    if (retrying) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const token = await tokenForRequest();
      if (!token) {
        setRetryError('Not signed in on this screen anymore. Open the dashboard below instead.');
        return;
      }
      const res = await apiRequest('/api/onboard/retry-provision', RetryProvisionResponse, {
        method: 'POST',
        token,
        // Provisions a phone number — same budget as the activation call itself.
        timeoutMs: 120000,
      });
      const nextPhoneNumber = res.phoneNumber ?? null;
      const nextSetupComplete = res.setupComplete === true;
      setSetupComplete(nextSetupComplete);
      setPhoneNumber(nextPhoneNumber);
      setHasReceipt(true);
      setReceiptChecked(true);
      if (ownerTestSmsHref(nextPhoneNumber, nextSetupComplete)) {
        setWarning(null);
      } else {
        setWarning(res.warning ?? res.error ?? 'Still not ready — try again shortly.');
      }
      if (receiptOwnerId) {
        try {
          const current = await loadAcquisitionEnvelope({ clerkUserId: receiptOwnerId });
          if (current) {
            await saveAcquisitionEnvelope(
              withAcquisitionProvisioningReceipt(current, {
                setupComplete: nextSetupComplete,
                phoneNumber: nextPhoneNumber,
                warning: res.warning ?? res.error,
              }),
            );
          }
        } catch {
          setRetryError(
            'The latest result is available now but could not be saved for the next app restart.',
          );
        }
      }
    } catch (err) {
      setRetryError(
        apiErrorMessage(err, 'Could not reach QuoteMax. Check your signal and try again.'),
      );
    } finally {
      setRetrying(false);
    }
  }

  async function openOwnerTestSms() {
    setSmsError(null);
    if (!smsHref) {
      setSmsError('Your dedicated number is not ready for a test message yet.');
      return;
    }
    try {
      if (!(await Linking.canOpenURL(smsHref))) {
        setSmsError('No SMS app is available on this device.');
        return;
      }
      await Linking.openURL(smsHref);
    } catch {
      setSmsError('Could not open your SMS app. Try again from this device.');
    }
  }

  /** The only place the session becomes active (spec B6). */
  async function openDashboard() {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const pendingSession = pendingSessionId
        ? sessions?.find(session => session.id === pendingSessionId)
        : undefined;
      const destinationOwnerId =
        activeUserId ?? pendingSession?.user?.id ?? pendingSession?.publicUserData.userId ?? null;
      let acquisition: AcquisitionEnvelope | null = null;
      if (destinationOwnerId) {
        try {
          acquisition = await loadAcquisitionEnvelope({ clerkUserId: destinationOwnerId });
        } catch {
          // SecureStore continuity is helpful, but must never block an already
          // activated account from reaching the dashboard.
        }
      }
      const destination = acquisitionPostAuthDestination(acquisition) as Href;
      if (!activeSessionId && pendingSessionId && isLoaded && setActive) {
        await setActive({ session: pendingSessionId });
      }
      // The (tabs) guard's own useTenantMe() query may still be caching activation's own
      // pre-activate 404 from earlier in this session — clear it so the dashboard fetches fresh
      // rather than reading "no tenant" and bouncing straight back into the wizard.
      queryClient.removeQueries({ queryKey: TENANT_ME_KEY });
      router.replace(destination);
    } catch {
      setOpenError("Couldn't open the dashboard — check your signal and tap again.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <BrandMark height={26} body={colors.logoBody} notch={colors.logoNotch} />

        <View style={[styles.badge, { borderColor: colors.inkLine }]}>
          <Text style={[styles.badgeText, { color: colors.textSec }]}>{statusLabel}</Text>
        </View>

        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.4}
          style={[styles.h1, { color: colors.textPri }]}
        >
          G&apos;DAY {firstName.toUpperCase()}.{'\n'}
          {statusHeading}
        </Text>
        <Text style={[styles.sub, { color: colors.textSec }]}>{statusSummary}</Text>

        <View
          style={[
            styles.numberBlock,
            { backgroundColor: colors.inkCard, borderColor: colors.inkLine },
          ]}
        >
          <Text style={[styles.numberLabel, { color: colors.textDim }]}>YOUR QUOTEMAX NUMBER</Text>
          {phoneNumber ? (
            <>
              <Text selectable style={[styles.number, { color: colors.textPri }]}>
                {formatAuMobileDisplay(phoneNumber)}
              </Text>
              <Text style={[styles.numberHint, { color: colors.textDim }]}>
                {lineReady
                  ? 'This is the number your customers can contact.'
                  : 'Provisioning detail only — this line is not ready for customer messages.'}
              </Text>
              {smsHref ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={openOwnerTestSms}
                  hitSlop={8}
                  style={({ pressed }) => [styles.smsLinkRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.smsLink, { color: colors.textPri }]}>
                    Send yourself a test text →
                  </Text>
                </Pressable>
              ) : null}
              {smsError ? (
                <Text style={[styles.smsError, { color: colors.dangerBright }]}>{smsError}</Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.numberPending, { color: colors.warningBright }]}>
              {!receiptChecked
                ? 'Checking your saved number…'
                : hasReceipt
                  ? "Your number isn't ready yet. You can still open your dashboard."
                  : 'No dedicated number has been confirmed for this link.'}
            </Text>
          )}
        </View>

        {statusWarning ? (
          <View
            style={[
              styles.warningBox,
              { borderColor: colors.warning, backgroundColor: colors.ink },
            ]}
          >
            <Text style={[styles.warningText, { color: colors.warningBright }]}>
              {statusWarning}
            </Text>
            {receiptChecked ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry provisioning"
                accessibilityState={{ disabled: retrying, busy: retrying }}
                onPress={retry}
                disabled={retrying}
                style={({ pressed }) => [
                  styles.retryBtn,
                  {
                    borderColor: colors.ctlLine,
                    backgroundColor: pressed ? colors.inkCard : colors.ink,
                    opacity: retrying ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.retryLabel, { color: colors.textPri }]}>
                  {retrying ? 'RETRYING…' : 'RETRY PROVISIONING'}
                </Text>
              </Pressable>
            ) : null}
            {retryError ? (
              <Text style={[styles.retryError, { color: colors.dangerBright }]}>{retryError}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.primaryAction}>
          <PrimaryCta label="Open my dashboard" onPress={openDashboard} loading={opening} />
          {openError ? (
            <Text style={[styles.openError, { color: colors.dangerBright }]}>{openError}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flexGrow: 1, paddingTop: spacing.xxl, paddingHorizontal: AUTH_GUTTER },
  badge: {
    marginTop: spacing.gap,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  badgeText: { ...type.label, letterSpacing: 1.2 },
  h1: { ...type.display, marginTop: spacing.xl },
  sub: { ...type.body, marginTop: spacing.lg },
  numberBlock: {
    marginTop: spacing.gap,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  numberLabel: { ...type.label, letterSpacing: 1.2 },
  number: {
    ...type.price,
    marginTop: spacing.md,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  numberHint: { ...type.bodySm, marginTop: spacing.sm },
  smsLinkRow: { marginTop: spacing.md, minHeight: touch.minimum, justifyContent: 'center' },
  smsLink: { ...type.bodySm, fontFamily: fonts.sans.semiBold },
  smsError: { ...type.bodySm, marginTop: spacing.sm },
  numberPending: { ...type.body, marginTop: spacing.md },
  warningBox: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  warningText: { ...type.bodySm },
  retryBtn: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { ...type.bodySm, fontFamily: fonts.sans.bold, letterSpacing: 0.6 },
  retryError: { ...type.bodySm },
  primaryAction: { marginTop: spacing.gap },
  openError: { ...type.bodySm, marginTop: spacing.md },
});
