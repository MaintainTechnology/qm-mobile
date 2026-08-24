/** Signed-in QA of every tab against the mocked backend fixtures. */
import { expect, test } from '@playwright/test';

import { signIn, tab } from './helpers';
import { installApiMocks, QA_PHONE_NUMBER } from './mocks';

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
  await signIn(page);
});

test('home shows the dashboard and tools shows the trade hub', async ({ page }) => {
  await expect(page.getByText('NEEDS YOUR ATTENTION')).toBeVisible();
  await expect(page.getByText(QA_PHONE_NUMBER).first()).toBeVisible();
  await expect(page.getByText('RECENT QUOTES')).toBeVisible();
  await expect(page.getByText('RECENT CHATS')).toBeVisible();

  await tab(page, 'Tools').click();
  await expect(page.getByText('TRADE TOOLS')).toBeVisible();
});

test('quotes list filters and opens the detail sheet', async ({ page }) => {
  // Inactive tab scenes stay mounted (hidden), so match rows by role + visibility.
  const quoteRow = (name: RegExp) =>
    page.getByRole('button', { name }).filter({ visible: true }).last();

  await tab(page, 'Quotes').click();
  await expect(quoteRow(/Dana Whitfield/)).toBeVisible();
  await expect(quoteRow(/Lee Marsh/)).toBeVisible();

  // Filter to accepted — the in-review quote drops out. Chips are their own buttons;
  // exact name dodges the ACCEPTED status badge on Lee's row.
  await page.getByRole('button', { name: 'ACCEPTED', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('button', { name: /Dana Whitfield/ }).filter({ visible: true })).toBeHidden();
  await expect(quoteRow(/Lee Marsh/)).toBeVisible();

  await page.getByRole('button', { name: 'ALL', exact: true }).filter({ visible: true }).click();
  await quoteRow(/Dana Whitfield/).click();
  await expect(page.getByText('Replace switchboard, add RCBOs.')).toBeVisible();
});

test('chats list opens SMS and voice threads', async ({ page }) => {
  const chatRow = (name: RegExp) =>
    page.getByRole('button', { name }).filter({ visible: true }).last();
  const backButton = page.getByRole('button', { name: 'Back' }).filter({ visible: true }).last();

  await tab(page, 'Chats').click();
  await chatRow(/Dana.*Switchboard upgrade/i).click();
  await expect(page.getByText('my switchboard keeps tripping')).toBeVisible();

  // The thread's own back control — browser history doesn't drive this screen.
  await backButton.click();
  await chatRow(/Lee.*Fan install/i).click();
  await expect(page.getByText('Voice call · no SMS thread')).toBeVisible();
});

test('menu shows the account and signs out cleanly', async ({ page }) => {
  await tab(page, 'Menu').click();
  await expect(page.getByText('Volt & Sons Electrical').first()).toBeVisible();
  await expect(page.getByText('LABOUR RATES')).toBeVisible();

  await page.getByText('SIGN OUT').click();
  await expect(page.getByText('BUILT FOR AUSTRALIAN TRADIES')).toBeVisible({ timeout: 30_000 });
});
