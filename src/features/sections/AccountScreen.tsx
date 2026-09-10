/**
 * Account — business identity, contact details and licences, as the web
 * Account tab shows them. The summary card owns its own field rendering; the
 * Native business details/media are separate from Clerk credentials.
 */
import { useAuth } from '@clerk/expo';
import { View } from 'react-native';

import { AccountCard } from '@/features/menu/AccountCard';
import { CardBox, RetryLine } from '@/features/menu/CardChrome';
import { WebOnlyCard } from '@/features/trades/hub/SectionsContent';
import { apiErrorMessage } from '@/lib/api';
import { spacing } from '@/lib/theme';
import { isTenantMissing, useTenantMe } from '@/lib/tenant';

import { SectionLoading, SectionScreen } from './SectionScreen';
import { BusinessProfileEditor } from './BusinessProfileEditor';
import { BusinessMediaEditor } from './BusinessMediaEditor';
import { SecurityCard } from './SecurityCard';

export function AccountScreen() {
  const me = useTenantMe();
  const { userId, sessionId } = useAuth();

  return (
    <SectionScreen
      title="Account"
      subtitle="Your business as customers see it on quotes and the customer page."
      refreshing={me.isFetching}
      onRefresh={() => void me.refetch()}
    >
      {me.isPending ? (
        <SectionLoading label="Loading your account" />
      ) : me.isError && !me.data && !isTenantMissing(me.error) ? (
        <CardBox title="ACCOUNT">
          <RetryLine message={apiErrorMessage(me.error)} onRetry={() => void me.refetch()} />
        </CardBox>
      ) : me.data ? (
        <View style={{ gap: spacing.xxl }}>
          <AccountCard me={me.data} />
          {userId ? <BusinessProfileEditor key={`${userId}:${sessionId}:${me.data.tenant.id}`} me={me.data} /> : null}
          {userId ? <BusinessMediaEditor key={`media:${userId}:${sessionId}:${me.data.tenant.id}`} tenantId={me.data.tenant.id} /> : null}
          <WebOnlyCard
            label="Licences and login details"
            body="Edit licences and manage your login details on the web dashboard."
            path="/dashboard?tab=account"
            cta="Open account on the web"
          />
        </View>
      ) : null}
      <SecurityCard />
    </SectionScreen>
  );
}
