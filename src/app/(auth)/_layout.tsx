import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack, useGlobalSearchParams, useSegments } from 'expo-router';

import { useTheme } from '@/lib/useTheme';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();
  const { resume } = useGlobalSearchParams<{ resume?: string }>();
  const segments = useSegments();

  // Wait for Clerk to restore any keychain session before deciding, so a
  // signed-in tradie is never flashed the auth flow on a cold start.
  if (!isLoaded) return null;

  // A signed-in tradie never sees the auth flow — with two exceptions:
  //  - the spec A2 resume entry (`/sign-up?resume=1`): a signed-in tradie with
  //    no tenant row is sent back into the wizard by the (tabs) guard, and
  //    bouncing them to '/' here would loop them between the two layouts;
  //  - the activation success screen (spec B6): the A2/A3 paths arrive there
  //    with an already-active session, and it must still show the phone
  //    reveal + provisioning retry before its CTA goes to the dashboard.
  const onSuccessScreen = segments.some(segment => segment === 'success');
  if (isSignedIn && resume !== '1' && !onSuccessScreen) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.inkDeep },
      }}
    />
  );
}
