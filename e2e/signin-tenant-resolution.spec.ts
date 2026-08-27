/**
 * Regression: signing in with an existing account must not dump the tradie into the
 * invitation-code gate.
 *
 * Reported symptom — log in, enter the verification code, land back on "Get QuoteMax" at the
 * invitation code stage. Root cause was NOT a missing tenant: `EXPO_PUBLIC_API_URL` pointed at a
 * server that isn't the QuoteMax API (another Next.js app was on port 3000), so `/api/tenant/me`
 * answered with a generic 404 — and the app read any 404 as "this tradie has no tenant row".
 *
 * These two tests pin both halves of the distinction: a foreign 404 degrades to the shell, while
 * QuoteMax's own `{ error: 'no_tenant' }` still resumes onboarding (spec A2).
 */
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, type Page, test } from '@playwright/test';

import { CLERK_TEST_CODE, expectTabBar, fillField, QA_USER, tapCta } from './helpers';
import { installApiMocks } from './mocks';

/** The reported flow, stopping short of asserting where it lands. */
async function signInThroughCode(page: Page): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto('/sign-in');
  await fillField(page, 'Email', QA_USER.email);
  await fillField(page, 'Password', QA_USER.password);
  await tapCta(page, 'Sign in');
  const codeField = page.getByLabel('Verification code', { exact: true });
  await codeField.waitFor({ state: 'visible', timeout: 30_000 });
  await codeField.fill(CLERK_TEST_CODE);
  await tapCta(page, 'Verify and sign in');
}

// The gate renders the phrase in a heading, a hint and a field label — .first() keeps the
// locator out of strict-mode ambiguity.
const codeGate = (page: Page) => page.getByText('INVITATION CODE', { exact: true }).first();

test('a 404 from a backend that is not the QuoteMax API does not trap the tradie in onboarding', async ({
  page,
}) => {
  await installApiMocks(page);
  // Registered last, so it wins: what another app on the port returns for an unknown route.
  await page.route('http://localhost:3000/api/tenant/me', route =>
    route.fulfill({ status: 404, contentType: 'text/html', body: '<html>404</html>' }),
  );

  await signInThroughCode(page);

  // The shell must render (offline-tolerant), NOT the invitation-code gate.
  await expectTabBar(page);
  await expect(codeGate(page)).toBeHidden();
});

test('QuoteMax’s own no_tenant 404 still resumes onboarding at the code gate', async ({ page }) => {
  await installApiMocks(page);
  await page.route('http://localhost:3000/api/tenant/me', route =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'no_tenant' }),
    }),
  );

  await signInThroughCode(page);

  await expect(codeGate(page)).toBeVisible({ timeout: 30_000 });
});
