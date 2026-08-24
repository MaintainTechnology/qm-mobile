/**
 * `menu` — account summary, pricing book editors and sign out (spec web-parity G1–G3, A5).
 */
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tenantTrades, useTenantMe } from '@/lib/tenant';
import { fonts, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { AccountCard } from './AccountCard';
import { CardBox, RetryLine } from './CardChrome';
import { LabourRatesCard } from './LabourRatesCard';
import { PaintRatesCard } from './PaintRatesCard';
import { RoofRatesCard } from './RoofRatesCard';

/** G3 — the support link footer points here, matching the marketing site. */
const SUPPORT_URL = 'https://www.quotemax.com.au';

export function MenuScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const me = useTenantMe();
  const [signingOut, setSigningOut] = useState(false);

  // A5 — sign out, then land on the welcome screen (web parity: afterSignOutUrl="/sign-in"). The
  // (tabs) layout also redirects on isSignedIn flipping false, but this is the deterministic path
  // the spec calls for rather than waiting on that re-render.
  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      // Clear every cached query — without this, the next account signed into on this device
      // would see the previous tenant's quotes/chats/rates until each query happened to refetch.
      queryClient.clear();
    } finally {
      router.replace('/welcome');
    }
  }

  const trades = me.data ? tenantTrades(me.data) : [];
  const labourTrades = trades.filter(t => t === 'electrical' || t === 'plumbing');
  const hasRoofing = trades.includes('roofing');
  const hasPainting = trades.includes('painting');

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <Text style={[styles.headerTitle, { color: colors.textPri }]}>MENU</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          {me.isPending ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : me.isError ? (
            <CardBox title="ACCOUNT">
              <RetryLine
                message="Couldn’t load your account — check your connection."
                onRetry={() => me.refetch()}
              />
            </CardBox>
          ) : me.data ? (
            <>
              <AccountCard me={me.data} />
              {labourTrades.length > 0 ? (
                <LabourRatesCard trades={labourTrades} pricingBooks={me.data.pricing_books} />
              ) : null}
              {hasRoofing ? <RoofRatesCard /> : null}
              {hasPainting ? <PaintRatesCard /> : null}
            </>
          ) : null}

          <View style={styles.signOutSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              disabled={signingOut}
              onPress={onSignOut}
              style={({ pressed }) => [
                styles.signOutBtn,
                {
                  borderColor: pressed ? colors.danger : colors.inkLine,
                  opacity: signingOut ? 0.6 : 1,
                },
              ]}
            >
              {signingOut ? (
                <ActivityIndicator color={colors.dangerBright} />
              ) : (
                <Text style={[styles.signOutLabel, { color: colors.dangerBright }]}>SIGN OUT</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textDim }]}>
              QuoteMax v{Constants.expoConfig?.version ?? '—'}
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="QuoteMax support"
              onPress={() => {
                Linking.openURL(SUPPORT_URL).catch(() => {});
              }}
            >
              <Text style={[styles.footerLink, { color: colors.accentText }]}>
                Support · quotemax.com.au
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.sans.extraBold, fontSize: 18, letterSpacing: -0.36 },
  centerPad: { paddingTop: spacing.section, alignItems: 'center' },
  signOutSection: { marginHorizontal: spacing.lg, marginTop: spacing.gap },
  signOutBtn: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: { fontFamily: fonts.sans.bold, fontSize: 12.5, letterSpacing: 0.75 },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: { fontFamily: fonts.mono.medium, fontSize: 10.5, letterSpacing: 0.8 },
  footerLink: { fontFamily: fonts.sans.semiBold, fontSize: 12.5 },
});
