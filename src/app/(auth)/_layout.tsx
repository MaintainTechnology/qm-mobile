import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

import { useTheme } from '@/lib/useTheme';

export default function AuthLayout() {
  const { isSignedIn } = useAuth();
  const { colors } = useTheme();

  // A signed-in tradie never sees the auth flow. The sign-up wizard only
  // activates its session after tenant activation succeeds, so this cannot
  // fire mid-wizard.
  if (isSignedIn) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.inkDeep },
      }}
    />
  );
}
