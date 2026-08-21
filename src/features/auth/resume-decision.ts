/**
 * Duplicate-email + resume-entry decisions (spec web-parity A2/A3) — the mobile port of the web's
 * `lib/onboard/resume-decision.ts`. Pure so it unit-tests without Clerk or expo-router.
 *
 * An account with NO tenant row is an abandoned wizard run, not a real account, so `sign-up`
 * proves ownership with the typed password before disclosing anything about tenant state — that
 * ordering is what stops this becoming an email-enumeration oracle.
 */
import type { Href } from 'expo-router';

/** What `/sign-up` should do about a duplicate email (`form_identifier_exists`). */
export type DuplicateEmailOutcome =
  /** The password did NOT authenticate. No session exists — show "sign in instead" and stop. */
  | 'needs_signin'
  /** Authenticated, and `GET /api/tenant/me` confirmed 404 → abandoned wizard run. Resume the
   *  wizard from the code step (spec A2), identity carried from the now-authenticated session. */
  | 'resume'
  /** Authenticated, and a tenant already exists → the account is fully set up. */
  | 'existing_account';

/**
 * Decide the duplicate-email outcome.
 *
 * @param signInFailed the password did NOT authenticate against Clerk
 * @param tenantStatus  HTTP status from `GET /api/tenant/me`, or `null` if the call never completed
 *
 * Two invariants, both load-bearing:
 *   1. ONLY a clean 404 resumes. An outage, a 401, or anything else must never open the wizard —
 *      that is the fail-closed half.
 *   2. `needs_signin` is reachable ONLY when the password failed. Once the password authenticates
 *      we have a real (if not yet active) session, so "sign in instead" would be a dead end.
 */
export function decideDuplicateEmail(input: {
  signInFailed: boolean;
  tenantStatus: number | null;
}): DuplicateEmailOutcome {
  if (input.signInFailed) return 'needs_signin';
  if (input.tenantStatus === 404) return 'resume';
  return 'existing_account';
}

/** Builds the query string manually — RN has no reliable global `URLSearchParams`. */
function toQuery(params: Record<string, string | null | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    parts.push(`${key}=${encodeURIComponent(value)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Spec A2 — the href the `(tabs)` cold-start guard sends a tenant-less signed-in tradie to: the
 * wizard resumes at the invitation-code step, skipping account creation entirely, with the Clerk
 * user id from the caller's live session (`useAuth().userId`).
 *
 * Cast to `Href`: `/sign-up` already exists as a typed route, this only adds a query string that
 * expo-router's generated route types don't model per-param.
 */
export function resumeOnboardingHref(clerkUserId: string): Href {
  return `/sign-up${toQuery({ resume: '1', uid: clerkUserId })}` as Href;
}

/** Spec B6 — the href the wizard hands off to after a successful activation. The Clerk session
 *  stays pending (not yet `setActive`) until the success screen's own CTA, so a failed
 *  activation never strands a signed-in-but-no-tenant session (see SuccessScreen.tsx). */
export function successHref(params: {
  firstName: string;
  phoneNumber: string | null;
  warning: string | null;
  sessionId: string | null;
  clerkUserId: string;
}): Href {
  return `/success${toQuery({
    name: params.firstName,
    phone: params.phoneNumber,
    warning: params.warning,
    session: params.sessionId,
    uid: params.clerkUserId,
  })}` as Href;
}
