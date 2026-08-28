import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { Notice } from '../../ui';

export function RecipePricingAuthority({ count, detectionFailed, onOpenCatalogue }: {
  count: number;
  detectionFailed: boolean;
  onOpenCatalogue: () => void;
}) {
  const { colors } = useTheme();
  const subject = detectionFailed
    ? 'Catalogue authority could not be checked.'
    : `${count} recipe ${count === 1 ? 'line has' : 'lines have'} no active tenant catalogue price.`;
  return (
    <View style={{ gap: spacing.sm }}>
      <Notice
        tone="warn"
        label="Price needed"
        body={`${subject} This recipe routes to inspection and cannot become quote-ready until your Catalogue has the required prices.`}
      />
      <Pressable accessibilityRole="button" onPress={onOpenCatalogue} style={[styles.button, { borderColor: colors.accent }]}>
        <Text style={[styles.label, { color: colors.accentText }]}>OPEN CATALOGUE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: touch.minimum, alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingHorizontal: spacing.md },
  label: { fontFamily: fonts.mono.bold, fontSize: 11, letterSpacing: 0.88 },
});
