import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/features/shell/TabBar';

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // Signed-out tradies land on the welcome screen; Clerk restores the session
  // from the keychain first, so wait for isLoaded rather than flashing welcome.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/welcome" />;

  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="roof" options={{ title: 'Roof' }} />
      <Tabs.Screen name="quotes" options={{ title: 'Quotes' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
    </Tabs>
  );
}
