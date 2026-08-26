/**
 * Direct Supabase client, for experimenting with realtime and storage from the device.
 *
 * This is NOT the app's data path. Quotes, the pricing book and leads come from the QuoteMax API
 * (`src/lib/api.ts` → `/api/tenant/*`), which holds the service-role key server-side and enforces
 * tenant isolation in route handlers. That stays the source of truth for anything that renders a
 * price — see CLAUDE.md.
 *
 * WHAT YOU WILL SEE BEFORE THE BACKEND WORK IS DONE
 * -------------------------------------------------
 * Queries against tenant tables return **zero rows**, not an error. That is correct behaviour, not
 * a broken connection: ~88 tables have RLS enabled with no policies (deny-all), and the schema's
 * single policy keys off `auth.uid()`, which a Clerk token does not supply. Two things must happen
 * on the Supabase side before this returns data — both outside this repo:
 *
 *   1. Register Clerk as a Third-Party Auth provider on the Supabase project, so PostgREST
 *      validates Clerk-signed JWTs, and add a `role: "authenticated"` claim to the Clerk session
 *      token (Clerk's default has none, so PostgREST would treat the caller as `anon`).
 *   2. Write tenant-scoped RLS policies keyed on `auth.jwt() ->> 'sub' = tenants.clerk_user_id`
 *      — not `auth.uid()`, which is a uuid while a Clerk sub is `user_…` text.
 *
 * Until then, use this for Storage and for tables you have deliberately opened.
 */
import { useAuth } from '@clerk/expo';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useMemo, useRef } from 'react';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Both values are `EXPO_PUBLIC_*`, so they ship inside the bundle — the anon key is designed for
 *  that. A service-role key must never appear here: it bypasses RLS entirely and, since tenant
 *  isolation lives in the API's route handlers rather than the database, it is the only boundary
 *  between one tradie's data and every other tradie's. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * Builds a client that presents `token()` as its bearer on every request. Exported for tests and
 * scripts; screens should use {@link useSupabase}.
 */
export function createSupabaseClient(token: () => Promise<string | null>): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. Add them to .env.local (see CLAUDE.md).',
    );
  }
  return createClient(url, anonKey, {
    // Supplying `accessToken` puts the client in third-party-auth mode: Clerk owns the session, so
    // supabase.auth.* must not be used and no session is persisted on the device.
    accessToken: token,
  });
}

/** The Supabase client bound to the signed-in tradie's Clerk session. Stable across re-renders. */
export function useSupabase(): SupabaseClient {
  const { getToken } = useAuth();
  // Clerk hands back a new `getToken` identity on some renders; a ref keeps one client (and so one
  // realtime socket) alive while always minting the token from the current session.
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  return useMemo(() => createSupabaseClient(async () => (await tokenRef.current()) ?? null), []);
}
