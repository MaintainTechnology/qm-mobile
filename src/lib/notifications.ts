/**
 * Push notifications — registration and deep-link handling.
 *
 * The backend owns delivery: this module registers the device's Expo push token against
 * POST /api/tenant/push-token, retires it on sign-out via DELETE, and routes a tapped
 * notification to the screen its `data.url` names ('/quotes?quoteId=…', '/chats?chatId=…').
 * Everything here is best-effort — a tradie on two bars must never be blocked by push plumbing.
 */
import { useAuth } from '@clerk/expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { z } from 'zod';

import { apiRequest } from '@/lib/api';
import { useApiMutation } from '@/lib/useApi';

const PUSH_TOKEN_PATH = '/api/tenant/push-token';

/** Both push-token routes answer with a bare ack — anything else is a contract break. */
const pushTokenAckSchema = z.object({ ok: z.literal(true) });
type PushTokenAck = z.infer<typeof pushTokenAckSchema>;

export type PushTokenRegistration = {
  token: string;
  platform: 'ios' | 'android';
  deviceName?: string;
};

/** POST registers this device's token; DELETE retires it (body: `{ token }`). */
export function usePushTokenMutation(method: 'POST' | 'DELETE' = 'POST') {
  return useApiMutation<PushTokenRegistration | Pick<PushTokenRegistration, 'token'>, PushTokenAck>(
    PUSH_TOKEN_PATH,
    pushTokenAckSchema,
    { method },
  );
}

// ── Pure decision helpers (unit-tested in notifications.test.ts) ────────────

export type RegistrationDecision = 'register' | 'ask' | 'skip';

/**
 * Whether to register now, ask for permission first, or leave push alone.
 * Simulators have no push service; Expo Go dropped remote push in SDK 53; and a denial is
 * final — re-prompting a tradie who said no is how apps get deleted.
 */
export function registrationDecision({
  isDevice,
  appOwnership,
  permissionStatus,
}: {
  isDevice: boolean;
  appOwnership: string | null;
  permissionStatus: string;
}): RegistrationDecision {
  if (!isDevice || appOwnership === 'expo') return 'skip';
  if (permissionStatus === 'granted') return 'register';
  if (permissionStatus === 'undetermined') return 'ask';
  return 'skip';
}

/**
 * The in-app path a notification asks us to open, or null. Push payloads cross a trust
 * boundary, so only a relative path is honoured — never an absolute or protocol-relative URL.
 */
export function notificationUrl(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const url = (data as Record<string, unknown>).url;
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return null;
  return url;
}

// ── Registration ────────────────────────────────────────────────────────────

function easProjectId(): string | undefined {
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' ? projectId : undefined;
}

async function expoPushToken(): Promise<string> {
  const projectId = easProjectId();
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

/** One contextual pre-prompt per app run — even if the tradie dismisses it undecided. */
let askedThisRun = false;

function confirmPrePrompt(): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Turn on notifications?',
      'Get pinged when a lead lands or a deposit is paid.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Turn on', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Registers this device for push once the tradie is signed in. Mount once inside
 * ClerkProvider (the root layout's PushBridge). Re-runs on sign-in changes only.
 */
export function usePushRegistration(): void {
  const { isSignedIn } = useAuth();
  // react-query keeps mutateAsync referentially stable, so it never re-fires the effect.
  const { mutateAsync: registerToken } = usePushTokenMutation('POST');

  useEffect(() => {
    if (!isSignedIn || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
    let cancelled = false;

    void (async () => {
      try {
        const current = await Notifications.getPermissionsAsync();
        const decision = registrationDecision({
          isDevice: Device.isDevice,
          appOwnership: Constants.appOwnership,
          permissionStatus: current.status,
        });
        if (decision === 'skip' || cancelled) return;

        if (decision === 'ask') {
          if (askedThisRun) return;
          askedThisRun = true;
          if (!(await confirmPrePrompt()) || cancelled) return;
          const requested = await Notifications.requestPermissionsAsync();
          if (!requested.granted || cancelled) return;
        }

        // The channel must exist before the token is fetched, or Android delivers silently.
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
          });
        }

        const token = await expoPushToken();
        if (cancelled) return;
        await registerToken({
          token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceName: Device.deviceName ?? undefined,
        });
      } catch {
        // Best-effort: a failed registration costs a push, not the session. The next
        // sign-in (or cold start while signed in) retries.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, registerToken]);
}

/**
 * Retire this device's token on the backend. Called BEFORE signOut() so the Clerk token is
 * still mintable. Best-effort: sign-out must never hang on push cleanup.
 */
export async function unregisterPushToken(
  getToken: () => Promise<string | null>,
): Promise<void> {
  try {
    if (!Device.isDevice || Constants.appOwnership === 'expo') return;
    const token = await expoPushToken();
    await apiRequest(PUSH_TOKEN_PATH, pushTokenAckSchema, {
      method: 'DELETE',
      body: { token },
      token: (await getToken()) ?? undefined,
    });
  } catch {
    // The token also dies server-side on its first failed delivery; losing this call is fine.
  }
}

// ── Tap handling ────────────────────────────────────────────────────────────

/**
 * Routes notification taps — warm (listener) and cold-start (last response) — to the path in
 * `data.url`, and keeps foreground pushes visible. Mount once in the root layout.
 */
export function useNotificationObserver(): void {
  const router = useRouter();

  useEffect(() => {
    // Without a handler, a push that arrives while the app is open is silently dropped.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    let active = true;

    function openFromResponse(response: Notifications.NotificationResponse | null): void {
      const url = notificationUrl(response?.notification.request.content.data);
      // Typed routes don't know runtime strings; the backend contract is the source of truth.
      if (url) router.push(url as never);
    }

    // Cold start: the tap that launched the app arrives before any listener exists.
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        if (active) openFromResponse(response);
      })
      .catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);

    return () => {
      active = false;
      subscription.remove();
    };
  }, [router]);
}
