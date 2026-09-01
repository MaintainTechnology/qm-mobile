import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export function RouteRecovery({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.inkDeep,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <View style={styles.brand}>
        <BrandMark height={32} body={colors.logoBody} notch={colors.logoNotch} />
        <Text style={[styles.wordmark, { color: colors.logoBody }]}>QUOTEMAX</Text>
      </View>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPri }]}>
          {title}
        </Text>
        <Text style={[styles.message, { color: colors.textSec }]}>{message}</Text>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: pressed ? colors.accentPress : colors.accent },
            ]}
          >
            <Text style={[styles.primaryLabel, { color: colors.accentInk }]}>Try again</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to QuoteMax home"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: colors.inkLine, opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Text style={[styles.secondaryLabel, { color: colors.textPri }]}>Go to home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.xl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wordmark: { fontFamily: fonts.sans.extraBold, fontSize: 20, lineHeight: 28 },
  content: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  title: { ...type.headline },
  message: { ...type.body },
  primary: {
    minHeight: touch.primaryCta,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 24 },
  secondary: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryLabel: { fontFamily: fonts.sans.semiBold, fontSize: 15, lineHeight: 22 },
});
