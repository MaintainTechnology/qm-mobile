/** Phone-sized navigation and interaction QA. All business API traffic is mocked. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { signIn, tab } from './helpers';
import { installApiMocks, tenantMe, type ApiMockOverrides } from './mocks';

const artifactDir = path.resolve(__dirname, '../test-results/mobile-polish');
const visibleButton = (page: Page, name: string | RegExp) =>
  page
    .getByRole('button', { name, exact: typeof name === 'string' })
    .filter({ visible: true })
    .last();
const visibleText = (page: Page, text: string | RegExp) =>
  page
    .getByText(text, { exact: typeof text === 'string' })
    .filter({ visible: true })
    .first();

async function capture(page: Page, name: string) {
  await mkdir(artifactDir, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), animations: 'disabled' });
}

/** Check usable, reachable controls rather than asserting implementation-specific CSS. */
async function expectReachableControl(page: Page, control: Locator) {
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeGreaterThanOrEqual(48);
  expect(box!.height).toBeGreaterThanOrEqual(48);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function openMenu(page: Page) {
  await tab(page, 'Menu').click();
  await expect(page.getByRole('heading', { name: 'Menu', exact: true })).toBeVisible();
}

async function appearance(page: Page, name: 'System' | 'Charcoal' | 'Paper') {
  await openMenu(page);
  const option = page
    .getByRole('radiogroup', { name: 'Appearance' })
    .getByRole('radio', { name, exact: true });
  await option.scrollIntoViewIfNeeded();
  await option.click();
  await expect(option).toBeChecked();
}

async function openSection(page: Page, name: string, slug: string, heading: RegExp) {
  const row = visibleButton(page, name);
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/sections/${slug}$`));
  await expect(
    page.getByRole('heading', { name: heading }).filter({ visible: true }).first(),
  ).toBeVisible();
  await expectReachableControl(page, visibleButton(page, 'Back'));
}

async function backToMenu(page: Page) {
  await visibleButton(page, 'Back').click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page.getByRole('heading', { name: 'Menu', exact: true })).toBeVisible();
}

test('all five tabs, quote filters and SMS / voice conversations', async ({ page }) => {
  const api = await installApiMocks(page);
  await page.goto('/sign-in');
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await capture(page, '390-auth-sign-in');
  await signIn(page);
  await appearance(page, 'Charcoal');
  for (const name of ['Home', 'Tools', 'Quotes', 'Chats', 'Menu'] as const) {
    await expectReachableControl(page, tab(page, name));
  }

  await test.step('Home is the trade workspace; Tools opens its quoting tools', async () => {
    await tab(page, 'Home').click();
    await expect(visibleText(page, 'Electrical')).toBeVisible();
    const sections = page
      .getByRole('tablist', { name: 'Workspace sections' })
      .filter({ visible: true });
    await expect(sections.getByRole('tab', { name: 'Quotes', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(visibleButton(page, /Dana Whitfield/)).toBeVisible();
    const quoteRows = page
      .getByRole('button', { name: /Dana Whitfield|Lee Marsh/ })
      .filter({ visible: true });
    await expect(quoteRows.nth(0)).toHaveAccessibleName(/Dana Whitfield/);
    await visibleButton(page, 'Sort quotes: Newest first').click();
    await page
      .getByRole('radiogroup', { name: 'Sort quotes' })
      .getByRole('radio', { name: 'Lowest value', exact: true })
      .click();
    await expect(quoteRows.nth(0)).toHaveAccessibleName(/Lee Marsh/);
    await expect(visibleButton(page, 'Sort quotes: Lowest value')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await visibleButton(page, 'Sort quotes: Lowest value').click();
    await page
      .getByRole('radiogroup', { name: 'Sort quotes' })
      .getByRole('radio', { name: 'Newest first', exact: true })
      .click();
    await expect(quoteRows.nth(0)).toHaveAccessibleName(/Dana Whitfield/);
    await expect(visibleButton(page, 'Sort quotes: Newest first')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await capture(page, '390-charcoal-home');

    await tab(page, 'Tools').click();
    await expect(sections.getByRole('tab', { name: 'Tools', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(visibleText(page, 'Create a quote')).toBeVisible();
    await capture(page, '390-charcoal-tools');
  });

  await test.step('Quotes filters and opens a reviewable detail', async () => {
    await tab(page, 'Quotes').click();
    await expect(visibleButton(page, /Dana Whitfield/)).toBeVisible();
    await expect(visibleButton(page, /Lee Marsh/)).toBeVisible();
    await capture(page, '390-charcoal-quotes');
    const filters = page.getByRole('tablist', { name: 'Filter quotes' });
    await filters.getByRole('tab', { name: 'ACCEPTED', exact: true }).click();
    await expect(filters.getByRole('tab', { name: 'ACCEPTED', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByRole('button', { name: /Dana Whitfield/ }).filter({ visible: true }),
    ).toHaveCount(0);
    await expect(visibleButton(page, /Lee Marsh/)).toBeVisible();
    await filters.getByRole('tab', { name: 'ALL', exact: true }).click();
    await visibleButton(page, /Dana Whitfield/).click();
    await expect(visibleText(page, 'Replace switchboard, add RCBOs.')).toBeVisible();
    await expectReachableControl(page, visibleButton(page, 'Close'));
    await capture(page, '390-charcoal-quote-detail');
    await visibleButton(page, 'Close').click();
  });

  await test.step('SMS drafts survive Back, and voice calls have no SMS composer', async () => {
    await tab(page, 'Chats').click();
    await expect(visibleButton(page, /Dana.*Switchboard upgrade/i)).toBeVisible();
    await capture(page, '390-charcoal-chats');
    await visibleButton(page, /Dana.*Switchboard upgrade/i).click();
    await expect(visibleText(page, 'Hey, my switchboard keeps tripping')).toBeVisible();
    const reply = page.getByLabel('Reply by SMS', { exact: true });
    await reply.fill('I can visit tomorrow morning. Does 9 am suit?');
    await expectReachableControl(page, visibleButton(page, 'Send reply'));
    await capture(page, '390-charcoal-sms-thread');
    await visibleButton(page, 'Back').click();
    await visibleButton(page, /Dana.*Switchboard upgrade/i).click();
    await expect(reply).toHaveValue('I can visit tomorrow morning. Does 9 am suit?');
    await visibleButton(page, 'Back').click();
    await visibleButton(page, /Lee.*Fan install/i).click();
    await expect(visibleText(page, 'Voice call · no SMS thread')).toBeVisible();
    await expect(page.getByLabel('Reply by SMS', { exact: true })).toHaveCount(0);
    await visibleButton(page, 'Back').click();
  });

  await openMenu(page);
  await visibleButton(page, 'Business account').scrollIntoViewIfNeeded();
  await capture(page, '390-charcoal-menu');
  for (const group of ['Daily', 'Trades & pricing', 'Marketing', 'Records', 'Account']) {
    await expect(page.getByRole('heading', { name: group, exact: true })).toBeVisible();
  }
  expect(api.unmatched).toEqual([]);
  expect(api.mutations).toEqual([]);
});

test('every native Menu page has content, a clear heading and working Back', async ({ page }) => {
  const api = await installApiMocks(page);
  await signIn(page);
  await appearance(page, 'Charcoal');

  const sections = [
    {
      name: 'Overview',
      slug: 'overview',
      heading: /^GOOD (MORNING|ARVO|EVENING), QA$/,
      content: 'NEEDS YOUR ATTENTION',
    },
    { name: 'Follow-ups', slug: 'followups', heading: /^FOLLOW-UPS$/, content: 'Dana Whitfield' },
    { name: 'Calendar', slug: 'calendar', heading: /^CALENDAR$/, content: 'Lee Marsh' },
    {
      name: 'General pricing',
      slug: 'pricing-book',
      heading: /^PRICING BOOK$/,
      content: 'LABOUR RATES',
    },
    {
      name: 'Marketing',
      slug: 'invites',
      heading: /^MARKETING$/,
      content: 'Work van · local electrical services',
    },
    { name: 'Videos', slug: 'videos', heading: /^VIDEOS$/, content: 'WELCOME VIDEO' },
    {
      name: 'Files',
      slug: 'files',
      heading: /^FILES$/,
      content: 'Dana Whitfield — switchboard upgrade.pdf',
    },
    { name: 'History', slug: 'history', heading: /^HISTORY$/, content: 'Switchboard upgrade' },
    { name: 'Account', slug: 'account', heading: /^ACCOUNT$/, content: 'BUSINESS DETAILS' },
    { name: 'Payouts', slug: 'payouts', heading: /^PAYOUTS$/, content: 'PAYOUT ACCOUNT' },
    { name: 'Billing', slug: 'billing', heading: /^BILLING$/, content: 'Quotes this period' },
  ];

  for (const section of sections) {
    await test.step(section.name, async () => {
      await openSection(page, section.name, section.slug, section.heading);
      await expect(visibleText(page, section.content)).toBeVisible();
      await expect(page.getByRole('progressbar').filter({ visible: true })).toHaveCount(0);
      await capture(page, `390-charcoal-${section.slug}`);
      if (section.slug === 'followups') {
        await visibleButton(page, 'Messages').click();
        await expect(visibleText(page, 'Hey, my switchboard keeps tripping')).toBeVisible();
        await capture(page, '390-charcoal-followup-messages');
      }
      await backToMenu(page);
    });
  }

  // Exercise the public appearance control, not storage or an auth shortcut.
  await appearance(page, 'Paper');
  await capture(page, '390-paper-appearance');
  await visibleButton(page, 'Business account').scrollIntoViewIfNeeded();
  await capture(page, '390-paper-menu');
  await openSection(page, 'Files', 'files', /^FILES$/);
  await expect(visibleText(page, 'Dana Whitfield — switchboard upgrade.pdf')).toBeVisible();
  await capture(page, '390-paper-files');
  await backToMenu(page);

  await page.setViewportSize({ width: 320, height: 844 });
  await openSection(page, 'Calendar', 'calendar', /^CALENDAR$/);
  await expectReachableControl(page, visibleButton(page, 'Confirm booking'));
  await capture(page, '320-paper-calendar');
  await backToMenu(page);
  await openSection(page, 'Marketing', 'invites', /^MARKETING$/);
  await expect(visibleText(page, 'Work van · local electrical services')).toBeVisible();
  await capture(page, '320-paper-marketing');
  await expectReachableControl(page, visibleButton(page, 'Create QR'));
  await visibleButton(page, 'Send').click();
  await expect(page.getByLabel('Invite recipient', { exact: true })).toBeVisible();
  await expectReachableControl(page, visibleButton(page, 'Send SMS'));
  await expectReachableControl(page, visibleButton(page, 'Send email'));
  await capture(page, '320-paper-invite-compose');
  await backToMenu(page);
  expect(api.unmatched).toEqual([]);
  expect(api.mutations).toEqual([]);
});

test('empty pages and a recoverable API error stay usable on a narrow phone', async ({ page }) => {
  const overrides: ApiMockOverrides = {
    '/api/tenant/files': { body: { documents: [] } },
    '/api/tenant/historical-quotes/analytics': { body: { analytics: [] } },
    '/api/tenant/calendar': {
      status: 503,
      body: { error: 'service_unavailable', message: 'Calendar is temporarily unavailable.' },
    },
  };
  const api = await installApiMocks(page, overrides);
  await signIn(page);
  await appearance(page, 'Charcoal');
  await page.setViewportSize({ width: 320, height: 844 });

  await openSection(page, 'Files', 'files', /^FILES$/);
  await expect(visibleText(page, 'No documents yet')).toBeVisible();
  await expectReachableControl(page, visibleButton(page, 'Ask'));
  await capture(page, '320-charcoal-files-empty');
  await backToMenu(page);
  await openSection(page, 'History', 'history', /^HISTORY$/);
  await expect(visibleText(page, 'No quote history yet')).toBeVisible();
  await capture(page, '320-charcoal-history-empty');
  await backToMenu(page);

  await openSection(page, 'Calendar', 'calendar', /^CALENDAR$/);
  await expect(visibleText(page, 'Could not load the calendar')).toBeVisible({ timeout: 25_000 });
  await expectReachableControl(page, visibleButton(page, 'TRY AGAIN'));
  await capture(page, '320-charcoal-calendar-error');
  overrides['/api/tenant/calendar'] = { body: { events: [], toSchedule: [], awaitingBooking: [] } };
  await visibleButton(page, 'TRY AGAIN').click();
  await expect(visibleText(page, 'No upcoming bookings')).toBeVisible();
  await capture(page, '320-charcoal-calendar-empty');
  await backToMenu(page);
  expect(api.unmatched).toEqual([]);
  expect(api.mutations).toEqual([]);
});

test('quote delivery keeps explicit confirmation and labelled recipients', async ({ page }) => {
  const api = await installApiMocks(page, {
    '/api/tenant/me': {
      body: {
        ...tenantMe,
        quotes: tenantMe.quotes.map(quote =>
          quote.id === 'q_review_1' ? { ...quote, customer_phone: null } : quote,
        ),
      },
    },
  });
  await signIn(page);
  await appearance(page, 'Paper');
  await tab(page, 'Quotes').click();
  await visibleButton(page, /Dana Whitfield/).click();
  const send = visibleButton(page, 'Send to customer');
  await expect(send).toBeDisabled();
  await visibleButton(page, /^Change delivery/).click();
  await expectReachableControl(page, page.getByLabel('Customer mobile', { exact: true }));
  await page.getByLabel('Customer mobile', { exact: true }).fill('0400111222');
  await expect(send).toBeEnabled();
  const emailChannel = page
    .getByRole('radiogroup', { name: 'Delivery channel' })
    .getByRole('radio', { name: 'Email', exact: true });
  await emailChannel.click();
  await expect(emailChannel).toBeChecked();
  await page.getByLabel('Customer email', { exact: true }).fill('customer@example.com');
  await expectReachableControl(page, send);
  await capture(page, '390-paper-quote-email');

  await send.click();
  await expect(visibleText(page, 'Tap again to confirm.')).toBeVisible();
  expect(api.mutations).toEqual([]);
  const request = page.waitForRequest(
    req => new URL(req.url()).pathname === '/api/quote/q_review_1/send' && req.method() === 'POST',
  );
  await visibleButton(page, 'Tap again to confirm').click();
  const delivery = await request;
  expect(delivery.postDataJSON()).toEqual({
    quoteId: 'q_review_1',
    channel: 'email',
    to: 'customer@example.com',
  });
  await expect(visibleText(page, 'Sent to the customer.')).toBeVisible();
  await expect(send).toHaveCount(0);
  await visibleButton(page, 'Close').click();
  expect(api.unmatched).toEqual([]);
  expect(api.mutations).toEqual(['POST /api/quote/q_review_1/send']);
});
