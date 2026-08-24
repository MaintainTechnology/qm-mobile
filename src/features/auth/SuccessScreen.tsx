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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryCta } from '@/features/auth/ui';
import { formatAuMobileDisplay } from '@/features/auth/onboard-fields';
import { apiErrorMessage, apiRequest } from '@/lib/api';
import { fonts, touch } from '@/lib/theme';
import { TENANT_ME_KEY } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

const RetryProvisionResponse = z.looseObject({
  ok: z.boolean(),
  phoneNumber: z.string().nullish(),
  warning: z.string().nullish(),
  error: z.string().nullish(),
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
  }>();

  // `setActive` is identical regardless of which Clerk hook hands it back — this screen has no
  // sign-up of its own, `useSignUp` is just the confirmed-working source elsewhere in the wizard.
  const { setActive, isLoaded } = useSignUp();
  const { sessions } = useSessionList();
  const { getToken, sessionId: activeSessionId } = useAuth();
  const queryClient = useQueryClient();

  const firstName = params.name?.trim() || 'mate';
  const pendingSessionId = params.session ?? null;
  const [phoneNumber, setPhoneNumber] = useState(params.phone ?? null);
  const [warning, setWarning] = useState(params.warning ?? null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

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
      if (res.phoneNumber) {
        setPhoneNumber(res.phoneNumber);
        setWarning(null);
      } else {
        setWarning(res.warning ?? res.error ?? 'Still not ready — try again shortly.');
      }
    } catch (err) {
      setRetryError(
        apiErrorMessage(err, 'Could not reach QuoteMax. Check your signal and try again.'),
      );
    } finally {
      setRetrying(false);
    }
  }

  /** The only place the session becomes active (spec B6). */
  async function openDashboard() {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      if (!activeSessionId && pendingSessionId && isLoaded && setActive) {
        await setActive({ session: pendingSessionId });
      }
      // The (tabs) guard's own useTenantMe() query may still be caching activation's own
      // pre-activate 404 from earlier in this session — clear it so the dashboard fetches fresh
      // rather than reading "no tenant" and bouncing straight back into the wizard.
      queryClient.removeQueries({ queryKey: TENANT_ME_KEY });
      router.replace('/');
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
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 30 }]}
      >
        <BrandMark height={26} body={colors.logoBody} notch={colors.logoNotch} />

        <View style={[styles.badge, { borderColor: colors.inkLine }]}>
          <Text style={[styles.badgeText, { color: colors.accentText }]}>WELCOME TO QUOTEMAX</Text>
        </View>

        <Text style={[styles.h1, { color: colors.textPri }]}>
          G&apos;DAY {firstName.toUpperCase()}.{'\n'}
          <Text style={{ color: colors.accentText }}>YOU&apos;RE ON THE LINE.</Text>
        </Text>
        <Text style={[styles.sub, { color: colors.textSec }]}>
          You&apos;re all set. From here on, QuoteMax answers, quotes, and books your jobs round the
          clock. You do the trade — we&apos;ll do the quoting.
        </Text>

        <View style={styles.numberBlock}>
          <Text style={[styles.numberLabel, { color: colors.textDim }]}>YOUR QUOTEMAX NUMBER</Text>
          {phoneNumber ? (
            <>
              <Text style={[styles.number, { color: colors.textPri }]}>
                {formatAuMobileDisplay(phoneNumber)}
              </Text>
              <Text style={[styles.numberHint, { color: colors.textDim }]}>
                Real number routed to your AI receptionist
              </Text>
              <Pressable
                onPress={() => Linking.openURL(`sms:${phoneNumber}`)}
                hitSlop={8}
                style={styles.smsLinkRow}
              >
                <Text style={[styles.smsLink, { color: colors.accentText }]}>
                  Send yourself a test text →
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.numberPending, { color: colors.warningBright }]}>
              Number not yet assigned — provisioning didn&apos;t finish.
            </Text>
          )}
        </View>

        {warning ? (
          <View
            style={[
              styles.warningBox,
              { borderColor: colors.warning, backgroundColor: colors.ink },
            ]}
          >
            <Text style={[styles.warningText, { color: colors.warningBright }]}>{warning}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry provisioning"
              onPress={retry}
              disabled={retrying}
              style={({ pressed }) => [
                styles.retryBtn,
                { borderColor: pressed ? colors.accent : colors.inkLine },
              ]}
            >
              <Text style={[styles.retryLabel, { color: colors.textPri }]}>
                {retrying ? 'RETRYING…' : 'RETRY PROVISIONING'}
              </Text>
            </Pressable>
            {retryError ? (
              <Text style={[styles.retryError, { color: colors.dangerBright }]}>{retryError}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: 30 }}>
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
  body: { paddingTop: 22, paddingHorizontal: 26 },
  badge: {
    marginTop: 22,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  badgeText: {
    fontFamily: fonts.mono.bold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  h1: {
    marginTop: 20,
    fontFamily: fonts.sans.extraBold,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.44,
  },
  sub: {
    marginTop: 14,
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    lineHeight: 23,
  },
  numberBlock: { marginTop: 34 },
  numberLabel: {
    fontFamily: fonts.mono.medium,
    fontSize: 10.5,
    letterSpacing: 1.68,
  },
  number: {
    marginTop: 10,
    fontFamily: fonts.mono.bold,
    fontSize: 34,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  numberHint: {
    marginTop: 8,
    fontFamily: fonts.mono.regular,
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  smsLinkRow: {
    marginTop: 12,
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  smsLink: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  numberPending: {
    marginTop: 10,
    fontFamily: fonts.sans.semiBold,
    fontSize: 15,
    lineHeight: 21,
  },
  warningBox: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  warningText: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  retryBtn: {
    height: touch.minimum,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  retryError: {
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  openError: {
    marginTop: 12,
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});
