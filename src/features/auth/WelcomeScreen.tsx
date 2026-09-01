/** Signed-out entry: a clear introduction with account actions in thumb reach. */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { AUTH_GUTTER, GhostButton, PrimaryCta } from '@/features/auth/ui';
import { fonts, spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.inkDeep }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoRow}>
        <BrandMark height={34} body={colors.logoBody} notch={colors.logoNotch} />
        <Text style={[styles.wordmark, { color: colors.logoBody }]}>QUOTEMAX</Text>
      </View>

      <View style={styles.pitch}>
        <Text style={[styles.eyebrow, { color: colors.textDim }]}>
          BUILT FOR AUSTRALIAN TRADIES
        </Text>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.4}
          style={[styles.h1, { color: colors.textPri }]}
        >
          NEVER QUOTE ON A SUNDAY NIGHT AGAIN.
        </Text>
        <Text style={[styles.body, { color: colors.textSec }]}>
          Turn job details into a quote using your own pricing book. Review it on site, make changes
          and send when you’re ready.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryCta label="Get my QuoteMax" onPress={() => router.push('/sign-up')} />
        <GhostButton label="I already have an account" onPress={() => router.push('/sign-in')} />
        <GhostButton
          label="Help & support"
          onPress={() => router.push('/support' as never)}
        />
        <Text style={[styles.reassurance, { color: colors.textDim }]}>
          Your prices. Your approval. Every quote.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: AUTH_GUTTER },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'flex-start',
  },
  wordmark: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  pitch: { flex: 1, justifyContent: 'flex-end', paddingTop: spacing.screen },
  eyebrow: { ...type.label, letterSpacing: 1.2 },
  h1: { ...type.display, marginTop: spacing.lg },
  body: { ...type.body, marginTop: spacing.lg },
  actions: { marginTop: spacing.gap, gap: spacing.md },
  reassurance: { ...type.bodySm, marginTop: spacing.xs, textAlign: 'center' },
});
