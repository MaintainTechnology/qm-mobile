/**
 * Build-time configuration.
 *
 * Anything prefixed `EXPO_PUBLIC_` is inlined into the JavaScript bundle and is trivially
 * extractable from a shipped app. It is configuration, never a secret. No API key, provider
 * token, or signing credential belongs in this file or in .env — they live on the QuoteMax
 * backend, which is what this app talks to.
 */

const apiBase = process.env.EXPO_PUBLIC_API_URL;

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
  const base = apiBase.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
