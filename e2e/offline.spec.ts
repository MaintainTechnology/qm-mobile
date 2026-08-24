/**
 * Poor-signal QA: the backend is unreachable at the socket level. Every tab must fail
 * into its retry/error copy and the app must stay alive — a tradie on a roof with two
 * bars still has a working app shell (CLAUDE.md rule).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

import { signIn, tab } from './helpers';
import { installOfflineMocks } from './mocks';

function vis(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

function retryButton(page: Page): Locator {
  return vis(page.getByRole('button', { name: 'Retry' }));
}

test('every tab degrades to retry copy instead of crashing', async ({ page }) => {
  await installOfflineMocks(page);
  // Clerk is a different host — auth still works with the backend dark.
  await signIn(page);

  await expect(vis(page.getByText(/COULDN’T LOAD YOUR DASHBOARD/))).toBeVisible({
    timeout: 30_000,
  });
  await expect(retryButton(page)).toBeVisible();

  await tab(page, 'Quotes').click();
  await expect(vis(page.getByText(/reach QuoteMax|try again/i))).toBeVisible({ timeout: 30_000 });

  await tab(page, 'Chats').click();
  await expect(vis(page.getByText(/Couldn’t load your conversations/))).toBeVisible({
    timeout: 30_000,
  });

  await tab(page, 'Menu').click();
  await expect(vis(page.getByText(/Couldn’t load your account/))).toBeVisible({ timeout: 30_000 });

  // The shell survived all of it.
  await tab(page, 'Home').click();
  await expect(retryButton(page)).toBeVisible();
});
