import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { TabBar } from '@/features/shell/TabBar';
import { isTenantMissing, useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

export default function TabsLayout() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { colors } = useTheme();
  // Cold-start + post-sign-in tenant check (spec A2). Only fires once Clerk
  // confirms a session — useTenantMe forces retry:false, so a 404 (no tenant)
  // or an offline error both resolve fast rather than spinning.
  const { isPending, error } = useTenantMe({ enabled: !!isSignedIn });

  // Signed-out tradies land on the welcome screen; Clerk restores the session
  // from the keychain first, so wait for isLoaded rather than flashing welcome.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/welcome" />;
  if (isPending) {
    // A visible wait, not a blank shell — the probe can be slow on two bars.
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.inkDeep,
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  // Signed in, no tenant row → resume onboarding at the invitation-code step
  // (spec A2): resume=1 keeps the (auth) layout from bouncing us back here,
  // and uid gives the wizard its clerk_user_id for activation.
  if (isTenantMissing(error))
    return <Redirect href={{ pathname: '/sign-up', params: { resume: '1', uid: userId ?? '' } }} />;
  // Any other error (offline, 5xx) must not lock the tradie out of a shell
  // they may already have cached data for — spec H: assume poor signal.

  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="roof" options={{ title: 'Tools' }} />
      <Tabs.Screen name="quotes" options={{ title: 'Quotes' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
    </Tabs>
  );
}
