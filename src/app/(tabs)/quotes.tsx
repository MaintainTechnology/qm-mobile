import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { UnifiedQuoteQueue } from '@/features/quotes/UnifiedQuoteQueue';
import { spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

export default function QuotesRoute() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ quoteId?: string; filter?: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      <ScreenHeader title="Quotes" subtitle="Review drafts and track customer decisions." />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl + insets.bottom }}
      >
        <UnifiedQuoteQueue
          quoteId={params.quoteId}
          initialFilter={params.filter}
          onCloseDetail={() => router.setParams({ quoteId: undefined })}
        />
      </ScrollView>
    </View>
  );
}
