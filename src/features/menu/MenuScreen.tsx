/**
 * `menu` — the web dashboard's sidebar on a phone. Renders the section
 * registry (features/sections/registry.ts) as the same grouped nav the web
 * shows (Daily / Trades / Price book / Business); rows push native section
 * screens, hop to a tab, or open the web for editor-bound tooling. Sign out
 * (spec A5) and the support footer stay from the original Menu; the account
 * summary and pricing editors moved to their own sections.
 */
import { useAuth } from '@clerk/expo';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { ArrowRightIcon, ChevronLeftIcon } from '@/features/auth/ui';
import { clearAccountScopedState } from '@/lib/account-storage';
import { openWebPath } from '@/features/trades/hub/LinkOut';
import { SECTION_GROUPS, type SectionRow } from '@/features/sections/registry';
import { unregisterPushToken } from '@/lib/notifications';
import { signOutWithCleanup } from '@/lib/sign-out';
import { useTenantMe } from '@/lib/tenant';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme, useThemePreference } from '@/lib/useTheme';

function SectionRowItem({ row, last }: { row: SectionRow; last: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();

  function open() {
    if (row.kind === 'web') openWebPath(row.target);
    // Typed routes don't know runtime strings; the registry is the source of truth.
    else router.push(row.target as never);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.title}
      accessibilityHint={row.kind === 'web' ? 'Opens in your browser' : row.blurb}
      onPress={open}
      style={({ pressed }) => [
        styles.row,
        last && styles.lastRow,
        {
          borderBottomColor: colors.inkLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
        },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: colors.textPri }]}>{row.title}</Text>
        <Text style={[styles.rowBlurb, { color: colors.textDim }]} numberOfLines={2}>
          {row.blurb}
        </Text>
      </View>
      {row.kind === 'web' ? (
        <View style={styles.webHint}>
          <Text style={[styles.webLabel, { color: colors.textDim }]}>Web</Text>
          <View style={{ transform: [{ rotate: '-45deg' }] }}>
            <ArrowRightIcon color={colors.textDim} size={14} />
          </View>
        </View>
      ) : (
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <ChevronLeftIcon color={colors.textDim} />
        </View>
      )}
    </Pressable>
  );
}

export function MenuScreen() {
  const { colors } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { data } = useTenantMe();
  const businessName = data?.tenant.business_name;

  // A5 — sign out, then land on the welcome screen (web parity: afterSignOutUrl="/sign-in").
  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOutWithCleanup({
      unregisterPush: () => unregisterPushToken(getToken),
      clerkSignOut: signOut,
      clearLocalState: clearAccountScopedState,
      navigateToWelcome: () => router.replace('/welcome'),
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <ScreenHeader title="Menu" subtitle="Your workspace, business and preferences." />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {businessName ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Business account"
            accessibilityHint="View business details and preferences"
            onPress={() => router.push('/sections/account')}
            style={({ pressed }) => [
              styles.identity,
              {
                borderColor: colors.inkLine,
                backgroundColor: pressed ? colors.ink : colors.inkCard,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.ink }]}>
              <Text style={[styles.avatarLabel, { color: colors.textPri }]}>
                {businessName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.identityName, { color: colors.textPri }]} numberOfLines={2}>
                {businessName}
              </Text>
              <Text style={[styles.rowBlurb, { color: colors.textDim }]}>Manage your account</Text>
            </View>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <ChevronLeftIcon color={colors.textDim} />
            </View>
          </Pressable>
        ) : null}
        {SECTION_GROUPS.map(group => (
          <View key={group.label} style={styles.group}>
            <Text accessibilityRole="header" style={[styles.groupLabel, { color: colors.textSec }]}>
              {group.label}
            </Text>
            <View
              style={[
                styles.groupCard,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              {group.rows.map((row, index) => (
                <SectionRowItem key={row.id} row={row} last={index === group.rows.length - 1} />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.group}>
          <Text accessibilityRole="header" style={[styles.groupLabel, { color: colors.textSec }]}>
            Appearance
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Appearance"
            style={[
              styles.appearance,
              { backgroundColor: colors.ink, borderColor: colors.inkLine },
            ]}
          >
            {(
              [
                { value: 'system', label: 'System' },
                { value: 'dark', label: 'Charcoal' },
                { value: 'light', label: 'Paper' },
              ] as const
            ).map(option => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: preference === option.value }}
                aria-checked={preference === option.value}
                onPress={() => setPreference(option.value)}
                style={({ pressed }) => [
                  styles.appearanceOption,
                  {
                    borderColor: preference === option.value ? colors.ctlLine : 'transparent',
                    backgroundColor:
                      preference === option.value || pressed ? colors.inkCard : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.appearanceLabel,
                    { color: preference === option.value ? colors.textPri : colors.textDim },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.preferenceHint, { color: colors.textDim }]}>
            System follows your device’s colour setting.
          </Text>
        </View>

        <View style={styles.signOutSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ disabled: signingOut, busy: signingOut }}
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
              <Text style={[styles.signOutLabel, { color: colors.dangerBright }]}>Sign out</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textDim }]}>
            QuoteMax{Constants.expoConfig?.version ? ` v${Constants.expoConfig.version}` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="QuoteMax support"
            style={styles.supportButton}
            onPress={() => router.push('/support' as never)}
          >
            <Text style={[styles.footerLink, { color: colors.accentText }]}>Help & support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxl },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontFamily: fonts.sans.extraBold, fontSize: 20 },
  identityName: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 24 },
  group: { gap: spacing.md },
  groupLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  groupCard: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.listRow,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  rowTitle: { fontFamily: fonts.sans.semiBold, fontSize: 16, lineHeight: 24 },
  rowBlurb: { marginTop: spacing.xs, fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  webHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  webLabel: { fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 16 },
  appearance: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  appearanceOption: {
    flexGrow: 1,
    flexBasis: 72,
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.chip,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  preferenceHint: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  signOutSection: { marginTop: spacing.sm },
  signOutBtn: {
    minHeight: touch.minimum,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  supportButton: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  footerText: { fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 16 },
  footerLink: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
});
