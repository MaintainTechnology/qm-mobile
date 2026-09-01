/**
 * Shared chrome for dashboard section screens — the mobile counterpart of the
 * web dashboard's TabHeader + panel (page.tsx:1037). Every section the web
 * sidebar lists gets one of these: back chevron, uppercase title, optional
 * subtitle, scrollable body with pull-to-refresh, and the standard
 * loading/error states over the section's own query.
 */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SectionScreen({
  title,
  subtitle,
  children,
  refreshing = false,
  onRefresh,
  fallbackRoute = '/menu',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Destination used when a public/root route has no navigation history. */
  fallbackRoute?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace(fallbackRoute as never)
          }
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: pressed ? colors.inkCard : 'transparent' },
          ]}
        >
          <BackIcon color={colors.textSec} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.textPri }]}
          maxFontSizeMultiplier={1.4}
        >
          {title.toUpperCase()}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.gap }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            ) : undefined
          }
        >
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSec }]}>{subtitle}</Text>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Keep related rows together without giving every row its own section spacing. */
export function SectionGroup({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text accessibilityRole="header" style={[styles.groupTitle, { color: colors.textSec }]}>
          {title.toUpperCase()}
        </Text>
        {count != null ? (
          <Text style={[styles.groupCount, { color: colors.textDim }]}>{count}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Static skeletons stay calm under Reduce Motion and never imply a real amount. */
export function SectionLoading({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.group}>
      {[0, 1].map(index => (
        <View
          key={index}
          style={[
            styles.loadingCard,
            { backgroundColor: colors.inkCard, borderColor: colors.inkLine },
          ]}
        >
          <View style={[styles.loadingTitle, { backgroundColor: colors.ink }]} />
          <View style={[styles.loadingLine, { backgroundColor: colors.ink }]} />
          <View style={[styles.loadingShort, { backgroundColor: colors.ink }]} />
        </View>
      ))}
    </View>
  );
}

export function SectionEmpty({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[type.title, { color: colors.textPri }]}>{title}</Text>
      <Text style={[type.bodySm, { color: colors.textSec }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  back: {
    width: touch.minimum,
    height: touch.minimum,
    flexShrink: 0,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.sans.extraBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.66,
  },
  body: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  subtitle: {
    ...type.bodySm,
    maxWidth: 600,
  },
  group: { gap: spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  groupTitle: {
    flex: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  groupCount: {
    fontFamily: fonts.mono.regular,
    fontSize: 12,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  loadingCard: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingTitle: { height: 20, width: '56%', borderRadius: radius.chip },
  loadingLine: { height: 14, width: '90%', borderRadius: radius.chip },
  loadingShort: { height: 14, width: '70%', borderRadius: radius.chip },
  empty: { paddingVertical: spacing.xxl, gap: spacing.sm },
});
