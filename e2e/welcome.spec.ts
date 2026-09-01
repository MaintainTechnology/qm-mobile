/** Entry screen: renders and routes into both auth flows. */
import { expect, test } from '@playwright/test';

import { installApiMocks } from './mocks';

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/');
});

test('welcome renders the pitch and both CTAs', async ({ page }) => {
  await expect(page.getByText('BUILT FOR AUSTRALIAN TRADIES')).toBeVisible();
  await expect(page.getByText('Get my QuoteMax')).toBeVisible();
  await expect(page.getByText('I already have an account')).toBeVisible();
});

test('routes to sign-in', async ({ page }) => {
  await page.getByText('I already have an account').click();
  await expect(page.getByText('WELCOME BACK')).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('routes to sign-up code gate', async ({ page }) => {
  await page.getByText('Get my QuoteMax').click();
  await expect(page.getByText('INVITATION CODE')).toBeVisible();
  await expect(page.getByLabel('Invitation code', { exact: true })).toBeVisible();
});
