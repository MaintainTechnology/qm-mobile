import { useAuth } from '@clerk/expo';
import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/features/shell/TabBar';
import { isTenantMissing, useTenantMe } from '@/lib/tenant';

export default function TabsLayout() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  // Cold-start + post-sign-in tenant check (spec A2). This decides ONE thing: whether a
  // signed-in tradie still owes us onboarding. It deliberately does NOT gate the shell —
  // blocking every tab on this call meant an unreachable backend showed a bare spinner for
  // the whole retry ladder, with no error, no retry, and no way to reach sign-out. Each
  // screen owns its own skeleton, error copy and Retry, and they all share this one query.
  const { error } = useTenantMe({ enabled: !!isSignedIn });

  // Signed-out tradies land on the welcome screen; Clerk restores the session
  // from the keychain first, so wait for isLoaded rather than flashing welcome.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/welcome" />;
  // Signed in, no tenant row → resume onboarding at the invitation-code step (spec A2):
  // resume=1 keeps the (auth) layout from bouncing us back here, and uid gives the wizard
  // its clerk_user_id for activation. This needs QuoteMax's own no_tenant marker, so an
  // unreachable or wrong backend leaves the tradie in the shell rather than in onboarding.
  if (isTenantMissing(error))
    return <Redirect href={{ pathname: '/sign-up', params: { resume: '1', uid: userId ?? '' } }} />;

  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="quotes" options={{ title: 'Quotes' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
    </Tabs>
  );
}
