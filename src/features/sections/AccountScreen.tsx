/**
 * Account — business identity, contact details and licences, as the web
 * Account tab shows them. The summary card owns its own field rendering; the
 * deeper editors (logo/photo upload, password) stay web-side and link out.
 */
import { ActivityIndicator, View } from 'react-native';

import { AccountCard } from '@/features/menu/AccountCard';
import { CardBox, RetryLine } from '@/features/menu/CardChrome';
import { WebOnlyCard } from '@/features/trades/hub/SectionsContent';
import { apiErrorMessage } from '@/lib/api';
import { spacing } from '@/lib/theme';
import { isTenantMissing, useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

import { SectionScreen } from './SectionScreen';

export function AccountScreen() {
  const { colors } = useTheme();
  const me = useTenantMe();

  return (
    <SectionScreen
      title="Account"
      subtitle="Your business as customers see it on quotes and the customer page."
      refreshing={me.isFetching}
      onRefresh={() => void me.refetch()}
    >
      {me.isPending ? (
        <CardBox title="ACCOUNT">
          <ActivityIndicator color={colors.accent} />
        </CardBox>
      ) : me.isError && !me.data && !isTenantMissing(me.error) ? (
        <CardBox title="ACCOUNT">
          <RetryLine message={apiErrorMessage(me.error)} onRetry={() => void me.refetch()} />
        </CardBox>
      ) : me.data ? (
        <View style={{ gap: spacing.lg }}>
          <AccountCard me={me.data} />
          <WebOnlyCard
            label="Logo, photo & licences"
            body="Upload your logo and photo, edit licences and change your password on the web dashboard."
            path="/dashboard?tab=account"
            cta="Open account on the web"
          />
        </View>
      ) : null}
    </SectionScreen>
  );
}
