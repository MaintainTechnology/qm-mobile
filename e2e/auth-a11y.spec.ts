/**
 * Auth inputs must be accessible by label. This is a real product requirement, not test
 * plumbing: an unlabeled TextInput is invisible to screen readers, and the same
 * accessibilityLabel is what every other spec uses to address fields.
 */
import { expect, test } from '@playwright/test';

import { installApiMocks } from './mocks';

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
});

test('sign-in fields are labelled for assistive tech', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

test('sign-up code gate field is labelled for assistive tech', async ({ page }) => {
  await page.goto('/sign-up');
  await expect(page.getByLabel('Invitation code', { exact: true })).toBeVisible();
});
