/**
 * Interim screen for tabs whose kit design is not built yet.
 *
 * DESIGN.md empty-state shape: a Title line, one body sentence, no
 * illustration. Each of these dies as its real screen lands.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.inkDeep, paddingTop: insets.top + 30 },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPri }]}>{title.toUpperCase()}</Text>
      <Text style={[styles.body, { color: colors.textSec }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -1.04,
  },
  body: {
    marginTop: 10,
    fontFamily: fonts.sans.regular,
    fontSize: 14.5,
    lineHeight: 22,
  },
});
