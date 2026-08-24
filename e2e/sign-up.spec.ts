/**
 * The full onboarding wizard: invite code gate → account → trade & licence → pricing →
 * review → email verification (Clerk test code) → activation (mocked backend) → success.
 * Creates a REAL user on the Clerk dev instance each run (+clerk_test address, never emailed).
 */
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

import { CLERK_TEST_CODE, fillField, freshSignupEmail, tapCta } from './helpers';
import { installApiMocks, QA_PHONE_NUMBER } from './mocks';

test('a tradie can sign up end to end', async ({ page }) => {
  test.setTimeout(240_000);
  await installApiMocks(page);
  await setupClerkTestingToken({ page });
  await page.goto('/sign-up');

  // Code gate — validation is a backend call (mocked ok).
  await fillField(page, 'Invitation code', 'QM-QA-CODE');
  await tapCta(page, 'Continue');

  // Step 1 · Account
  await expect(page.getByLabel('Business name', { exact: true }).first()).toBeVisible();
  await fillField(page, 'Business name', 'Volt & Sons Electrical');
  await fillField(page, 'Your first name', 'QA');
  await fillField(page, 'Email', freshSignupEmail());
  await fillField(page, 'Password', 'SuperTradie!2026-qa');
  await tapCta(page, 'Continue');

  // Step 2 · Trade & licence — trade + state chips; mobile/licence stay optional.
  await expect(page.getByText('PICK ONE OR MORE')).toBeVisible();
  await page.getByText('Electrical', { exact: true }).click();
  await page.getByText('NSW', { exact: true }).click();
  await tapCta(page, 'Continue');

  // Step 3 · Pricing — labour trades require these three.
  await expect(page.getByLabel('Hourly rate', { exact: true })).toBeVisible();
  await fillField(page, 'Hourly rate', '110');
  await fillField(page, 'Call-out minimum', '90');
  await fillField(page, 'Materials markup', '15');
  await tapCta(page, 'Continue');

  // Step 4 · Review & activate — creates the Clerk account, then asks for the email code.
  await expect(page.getByText('CHECK THESE OVER')).toBeVisible();
  await tapCta(page, 'Activate my AI line');

  await expect(page.getByText('CHECK YOUR EMAIL')).toBeVisible({ timeout: 30_000 });
  await fillField(page, 'Verification code', CLERK_TEST_CODE);
  await tapCta(page, 'Activate my AI line');

  // Success — provisioned number from the (mocked) activation response.
  await expect(page.getByText('WELCOME TO QUOTEMAX')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(QA_PHONE_NUMBER).first()).toBeVisible();

  await tapCta(page, 'Open my dashboard');
  await expect(page.getByText('RECENT QUOTES')).toBeVisible({ timeout: 30_000 });
});
