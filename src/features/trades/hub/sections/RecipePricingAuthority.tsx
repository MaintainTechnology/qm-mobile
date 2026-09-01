import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { Notice } from '../../ui';

export function RecipePricingAuthority({
  count,
  conditionalCount,
  detectionFailed,
  onOpenCatalogue,
}: {
  count: number;
  conditionalCount: number;
  detectionFailed: boolean;
  onOpenCatalogue: () => void;
}) {
  const { colors } = useTheme();
  const hasPriceIssue = detectionFailed || count > 0;
  const subject = detectionFailed
    ? 'Catalogue authority could not be checked.'
    : `${count} recipe ${count === 1 ? 'line has' : 'lines have'} no active tenant catalogue price.`;
  return (
    <View style={{ gap: spacing.sm }}>
      {hasPriceIssue ? (
        <>
          <Notice
            tone="warn"
            label="Price needed"
            body={`${subject} This recipe routes to inspection and cannot become quote-ready until your Catalogue has the required prices.`}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onOpenCatalogue}
            style={[styles.button, { borderColor: colors.accent }]}
          >
            <Text style={[styles.label, { color: colors.accentText }]}>OPEN CATALOGUE</Text>
          </Pressable>
        </>
      ) : null}
      {conditionalCount > 0 ? (
        <Notice
          tone="accent"
          label="Product context needed"
          body={`${conditionalCount} conditional recipe ${conditionalCount === 1 ? 'line depends' : 'lines depend'} on the resolved headline product. This no-context preview keeps required lines fail-closed; final readiness is decided while pricing the quote.`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
