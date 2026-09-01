import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

/** Reserve the list's shape while loading, without ever showing placeholder prices. */
export function ListSkeleton({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.skeleton}>
      {[0, 1, 2].map(row => (
        <View
          key={row}
          style={[
            styles.skeletonRow,
            { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
          ]}
        >
          <View style={[styles.titleLine, { backgroundColor: colors.inkLine }]} />
          <View style={[styles.bodyLine, { backgroundColor: colors.ink }]} />
          <View style={[styles.metaLine, { backgroundColor: colors.ink }]} />
        </View>
      ))}
    </View>
  );
}

export function ListState({
  title,
  description,
  action,
  inset = true,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  inset?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.state, !inset && { paddingHorizontal: 0 }]}>
      <Text accessibilityRole="header" style={[type.title, { color: colors.textPri }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.textSec }]}>{description}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { padding: spacing.xl, gap: spacing.md },
  skeletonRow: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  titleLine: { width: '48%', height: 20, borderRadius: radius.chip },
  bodyLine: { width: '80%', height: 16, borderRadius: radius.chip },
  metaLine: { width: '35%', height: 16, borderRadius: radius.chip },
  state: { paddingHorizontal: spacing.xl, paddingVertical: spacing.gap, gap: spacing.sm },
  description: { ...type.bodySm, maxWidth: 480 },
  action: { alignSelf: 'flex-start', marginTop: spacing.sm },
});
