import { useAuth } from '@clerk/expo';
import { useNetInfo } from '@react-native-community/netinfo';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { PrimaryCta } from '@/features/auth/ui';
import { SectionScreen } from '@/features/sections/SectionScreen';
import { Card, Notice } from '@/features/trades/ui';
import { netInfoIsOnline } from '@/lib/query';
import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { unsubscribeToken } from './unsubscribe-contract';
import { useUnsubscribe } from './use-unsubscribe';

export function UnsubscribeScreen() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const { userId, sessionId } = useAuth();
  return <UnsubscribeForm key={JSON.stringify([token, userId ?? null, sessionId ?? null])}
    token={unsubscribeToken(token)} signedIn={!!userId} />;
}
function UnsubscribeForm({ token, signedIn }: { token: string | null; signedIn: boolean }) {
  const { colors } = useTheme();
  const network = useNetInfo();
  const model = useUnsubscribe(token);
  const busy = model.status === 'submitting';
  return <SectionScreen title="Email preferences" fallbackRoute={signedIn ? '/menu' : '/welcome'}>
    <Card style={{ gap: spacing.lg }}>
      {model.status === 'confirmed' ? <Notice tone="accent" label="You're unsubscribed" body="QuoteMax confirmed this email unsubscribe request. You can close this screen." />
        : model.status === 'invalid' ? <Notice tone="danger" label="This unsubscribe link is unavailable" body={model.message || 'Open the original unsubscribe link from your email again. No email preference has been confirmed here.'} />
          : <>
            <Text accessibilityRole="header" style={[type.title, { color: colors.textPri }]}>Unsubscribe from these emails?</Text>
            <Text style={[type.body, { color: colors.textSec }]}>This changes the email preference covered by your unsubscribe link. You do not need to sign in.</Text>
            {model.message ? <Notice tone="warn" label="Unsubscribe not confirmed" body={model.message} /> : null}
            <PrimaryCta label={model.status === 'unconfirmed' ? 'Try unsubscribe again' : 'Unsubscribe'} loading={busy} disabled={busy}
              onPress={() => void model.submit(netInfoIsOnline(network))} />
          </>}
    </Card>
  </SectionScreen>;
}
