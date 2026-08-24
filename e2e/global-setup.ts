/**
 * 1. Obtains a Clerk testing token (bypasses bot protection for automated browsers).
 * 2. Ensures the fixed QA sign-in user exists on the Clerk DEVELOPMENT instance.
 * Uses CLERK_SECRET_KEY from .env.local (loaded by playwright.config.ts) — never logged.
 * The +clerk_test address is Clerk's test-mode convention: no real email is ever sent,
 * and any challenge code is 424242. Dev instance only — sk_test guard below.
 */
import { clerkSetup } from '@clerk/testing/playwright';

import { QA_USER } from './helpers';

export default async function globalSetup(): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error('CLERK_SECRET_KEY missing from .env.local — required for e2e setup');
  if (!secret.startsWith('sk_test_')) {
    throw new Error('Refusing to run e2e against a non-development Clerk instance');
  }

  await clerkSetup({
    publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: secret,
  });

  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_address: [QA_USER.email],
      // This instance requires a username (form_data_missing without one).
      username: 'qa-tradie',
      password: QA_USER.password,
      first_name: 'QA',
      last_name: 'Tradie',
      skip_password_checks: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    // The only acceptable failure is "this user already exists" from a previous run.
    if (!body.includes('form_identifier_exists')) {
      throw new Error(`Clerk QA user setup failed: HTTP ${res.status} ${body.slice(0, 300)}`);
    }
  }

  // Backend-created emails start unverified, which turns password sign-in into a
  // needs_first_factor flow the app refuses. Mark the QA address verified.
  const headers = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
  const lookup = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(QA_USER.email)}`,
    { headers },
  );
  type QaEmailAddress = {
    id: string;
    email_address: string;
    verification?: { status?: string } | null;
  };
  const users = (await lookup.json()) as { email_addresses?: QaEmailAddress[] }[];
  const address = users[0]?.email_addresses?.find(e => e.email_address === QA_USER.email);
  if (!address) throw new Error('QA user exists but its email address could not be found');
  if (address.verification?.status !== 'verified') {
    const patch = await fetch(`https://api.clerk.com/v1/email_addresses/${address.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ verified: true }),
    });
    if (!patch.ok) {
      throw new Error(`Could not verify QA email: HTTP ${patch.status} ${await patch.text()}`);
    }
  }
}
