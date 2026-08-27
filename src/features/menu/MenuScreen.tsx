/**
 * `menu` — the web dashboard's sidebar on a phone. Renders the section
 * registry (features/sections/registry.ts) as the same grouped nav the web
 * shows (Daily / Trades / Price book / Business); rows push native section
 * screens, hop to a tab, or open the web for editor-bound tooling. Sign out
 * (spec A5) and the support footer stay from the original Menu; the account
 * summary and pricing editors moved to their own sections.
 */
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openWebPath } from '@/features/trades/hub/LinkOut';
import { SECTION_GROUPS, type SectionRow } from '@/features/sections/registry';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** G3 — the support link footer points here, matching the marketing site. */
const SUPPORT_URL = 'https://www.quotemax.com.au';

function SectionRowItem({ row }: { row: SectionRow }) {
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
      onPress={open}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.inkLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
        },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: colors.textPri }]}>{row.title}</Text>
        <Text style={[styles.rowBlurb, { color: colors.textDim }]} numberOfLines={1}>
          {row.blurb}
        </Text>
      </View>
      <Text
        style={[styles.rowChevron, { color: row.kind === 'web' ? colors.textDim : colors.textSec }]}
      >
        {row.kind === 'web' ? '↗' : '›'}
      </Text>
    </Pressable>
  );
}

export function MenuScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  // A5 — sign out, then land on the welcome screen (web parity: afterSignOutUrl="/sign-in").
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <Text style={[styles.headerTitle, { color: colors.textPri }]}>MENU</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        {SECTION_GROUPS.map(group => (
          <View key={group.label} style={styles.group}>
            <Text style={[styles.groupLabel, { color: colors.textDim }]}>
              {group.label.toUpperCase()}
            </Text>
            <View
              style={[
                styles.groupCard,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              {group.rows.map(row => (
                <SectionRowItem key={row.id} row={row} />
              ))}
            </View>
          </View>
        ))}

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
  group: { marginTop: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  groupLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  groupCard: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.listRow,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  rowTitle: { fontFamily: fonts.sans.bold, fontSize: 14.5 },
  rowBlurb: { marginTop: 2, fontFamily: fonts.sans.regular, fontSize: 12, lineHeight: 16 },
  rowChevron: { fontFamily: fonts.sans.bold, fontSize: 16 },
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
