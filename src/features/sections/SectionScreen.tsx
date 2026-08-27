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

import { fonts, spacing, touch } from '@/lib/theme';
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
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/menu'))}
          hitSlop={8}
          style={styles.back}
        >
          <BackIcon color={colors.textSec} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPri }]} numberOfLines={1}>
          {title.toUpperCase()}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
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

const styles = StyleSheet.create({
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  back: {
    width: touch.minimum - 8,
    height: touch.minimum - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fonts.sans.extraBold,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  body: { padding: spacing.lg, gap: spacing.lg },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 13.5,
    lineHeight: 19,
  },
});
