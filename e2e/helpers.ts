/**
 * Shared flows and selectors. Field inputs are addressed by accessible label
 * (Field passes its label to the TextInput as accessibilityLabel → aria-label),
 * tab buttons by the TabBar's accessibilityLabel. Clerk testing tokens bypass
 * bot protection in the automated browser (dev instance only).
 */
import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, type Page } from '@playwright/test';

/** Fixed QA account on the Clerk dev instance — +clerk_test = no real email, code 424242. */
export const QA_USER = {
  email: 'qa-signin+clerk_test@example.com',
  password: 'SuperTradie!2026-qa',
};

export const CLERK_TEST_CODE = '424242';

/** A fresh signup identity per run — Clerk test-mode address, never emailed. */
export function freshSignupEmail(): string {
  return `qa-signup-${Date.now()}+clerk_test@example.com`;
}

export async function fillField(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
}

/** Primary CTAs render their label as text (uppercased by style only). */
export async function tapCta(page: Page, label: string | RegExp): Promise<void> {
  await page.getByText(label, { exact: false }).last().click();
}

/** A bottom tab button (TabBar sets accessibilityLabel per tab). */
export function tab(page: Page, name: 'Home' | 'Tools' | 'Quotes' | 'Chats' | 'Menu') {
  return page.getByLabel(name, { exact: true }).last();
}

/** UI sign-in with the QA user; resolves when the tab bar is on screen. */
export async function signIn(page: Page): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto('/sign-in');
  await fillField(page, 'Email', QA_USER.email);
  await fillField(page, 'Password', QA_USER.password);
  await tapCta(page, 'Sign in');
  // A fresh browser context is a brand-new device, so Clerk's device trust always
  // challenges it — the app must offer the emailed code step (424242 in test mode).
  const codeField = page.getByLabel('Verification code', { exact: true });
  await codeField.waitFor({ state: 'visible', timeout: 30_000 });
  await codeField.fill(CLERK_TEST_CODE);
  await tapCta(page, 'Verify and sign in');
  await expectTabBar(page);
}

export async function expectTabBar(page: Page): Promise<void> {
  for (const name of ['Home', 'Tools', 'Quotes', 'Chats', 'Menu'] as const) {
    await expect(tab(page, name)).toBeVisible({ timeout: 30_000 });
  }
}
