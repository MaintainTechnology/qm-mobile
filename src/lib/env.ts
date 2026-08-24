/**
 * Build-time configuration.
 *
 * Anything prefixed `EXPO_PUBLIC_` is inlined into the JavaScript bundle and is trivially
 * extractable from a shipped app. It is configuration, never a secret. No API key, provider
 * token, or signing credential belongs in this file or in .env — they live on the QuoteMax
 * backend, which is what this app talks to.
 */

import Constants from 'expo-constants';

const apiBase = process.env.EXPO_PUBLIC_API_URL;

/**
 * Clerk publishable key. Core 3 requires this to be passed to `<ClerkProvider>`
 * explicitly: environment variables are not inlined inside `node_modules` in a
 * production React Native build, so Clerk can no longer read it for itself.
 * Publishable, as the name says — configuration, not a secret.
 */
export function clerkPublishableKey(): string {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Copy .env.example to .env.local and paste the key from the Clerk dashboard.',
    );
  }
  return key;
}

/**
 * On a device, `localhost` is the phone, not the machine running the QuoteMax
 * web app. In dev, rewrite it to the host Metro is serving from (the dev
 * machine's LAN IP) so .env.local can stay `http://localhost:3000` for
 * everyone. Release builds pass through untouched.
 */
function withDevHost(url: string): string {
  if (!__DEV__) return url;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!host) return url;
  return url.replace(/\/\/(localhost|127\.0\.0\.1)/, `//${host}`);
}

/**
 * Builds an absolute URL against the QuoteMax API.
 * Throws loudly at the call site rather than silently requesting a relative path that will
 * 404 on device but appear to work on web.
 */
export function apiUrl(path: string): string {
  if (!apiBase) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.local and point it at the QuoteMax API.',
    );
  }
  const base = withDevHost(apiBase.replace(/\/+$/, ''));
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
