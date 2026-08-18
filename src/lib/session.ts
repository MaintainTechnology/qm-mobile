/**
 * The tradie's session token, held in the OS keychain / keystore.
 *
 * expo-secure-store is native-only. Web is a development convenience here, not a shipping
 * target, so it degrades to "signed out" rather than crashing the bundler.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'quotemax.session-token';

export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setSessionToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Authorization header for an authenticated request, or `{}` when signed out. */
export async function authHeader(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
