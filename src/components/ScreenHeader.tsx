import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** Consistent page hierarchy; the screen owns its safe-area inset. */
export function ScreenHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPri }]}>
          {title}
        </Text>
        {trailing}
      </View>
      {subtitle ? <Text style={[type.bodySm, { color: colors.textSec }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { ...type.headline, flexShrink: 1 },
});
