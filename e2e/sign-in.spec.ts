/** Sign-in against the live Clerk dev instance (QA user from global-setup). */
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

import { fillField, QA_USER, signIn, tapCta } from './helpers';
import { installApiMocks, QA_PHONE_NUMBER } from './mocks';

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
  await setupClerkTestingToken({ page });
});

test('rejects a wrong password with tradie-readable copy', async ({ page }) => {
  await page.goto('/sign-in');
  await fillField(page, 'Email', QA_USER.email);
  await fillField(page, 'Password', 'DefinitelyWrong!123');
  await tapCta(page, 'Sign in');
  await expect(page.getByText('That password does not match. Try again.')).toBeVisible();
});

test('signs in, verifies the new device, and lands on the dashboard', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText(QA_PHONE_NUMBER).first()).toBeVisible();
  await expect(page.getByText('RECENT QUOTES')).toBeVisible();
});

test('rejects a wrong device-verification code', async ({ page }) => {
  await page.goto('/sign-in');
  await fillField(page, 'Email', QA_USER.email);
  await fillField(page, 'Password', QA_USER.password);
  await tapCta(page, 'Sign in');
  const codeField = page.getByLabel('Verification code', { exact: true });
  await codeField.waitFor({ state: 'visible', timeout: 30_000 });
  await codeField.fill('111111');
  await tapCta(page, 'Verify and sign in');
  await expect(page.getByText(/code/i).and(page.getByText(/match|incorrect|newest/i))).toBeVisible();
});
