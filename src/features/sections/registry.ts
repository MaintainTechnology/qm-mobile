/**
 * Dashboard section registry — the mobile mirror of the web dashboard's
 * sidebar (quotemate-automation/app/dashboard/page.tsx buildNav, ~2020-2080).
 * Every section the web lists exists here, with where it lives on mobile:
 *   tab    → one of the five bottom tabs already owns it
 *   screen → a native /sections/* screen in this app
 *   web    → opens the web page (editor tech that stays web-side)
 * The Menu tab renders this registry as the grouped nav, so a tradie can reach
 * every dashboard feature from the same list the web sidebar shows.
 */

export type SectionRow = {
  id: string;
  title: string;
  /** One-line description under the title, mobile-worded. */
  blurb: string;
} & (
  | { kind: 'tab'; target: '/' | '/roof' | '/quotes' | '/chats' }
  | { kind: 'screen'; target: string }
  | { kind: 'web'; target: string }
);

export type SectionGroup = { label: string; rows: SectionRow[] };

export const SECTION_GROUPS: SectionGroup[] = [
  {
    label: 'Daily',
    rows: [
      {
        id: 'overview',
        title: 'Overview',
        blurb: 'Today at a glance — totals, conversion and what needs you.',
        kind: 'screen',
        target: '/sections/overview',
      },
      {
        id: 'quotes',
        title: 'Quotes',
        blurb: 'The full quote queue, filters and detail.',
        kind: 'tab',
        target: '/quotes',
      },
      {
        id: 'chats',
        title: 'Chats',
        blurb: 'Every SMS and call QuoteMax has handled.',
        kind: 'tab',
        target: '/chats',
      },
      {
        id: 'followups',
        title: 'Follow-ups',
        blurb: 'Chase quotes that went quiet — call or text from here.',
        kind: 'screen',
        target: '/sections/followups',
      },
      {
        id: 'calendar',
        title: 'Calendar',
        blurb: 'Booked jobs and site visits.',
        kind: 'screen',
        target: '/sections/calendar',
      },
    ],
  },
  {
    label: 'Trades',
    rows: [
      {
        id: 'trades',
        title: 'Trade workspaces',
        blurb: 'Quotes, tools, pricing and sections per trade.',
        kind: 'tab',
        target: '/',
      },
    ],
  },
  {
    label: 'Price book',
    rows: [
      {
        id: 'pricing-book',
        title: 'General pricing',
        blurb: 'Hourly rates, call-outs and per-trade rates.',
        kind: 'screen',
        target: '/sections/pricing-book',
      },
      {
        id: 'pricing-wizard',
        title: 'Pricing wizard',
        blurb: 'Guided rate setup — a web dashboard tool.',
        kind: 'web',
        target: '/dashboard/pricing-wizard',
      },
    ],
  },
  {
    label: 'Business',
    rows: [
      {
        id: 'invites',
        title: 'Marketing',
        blurb: 'Invite codes and QR codes that bring work in.',
        kind: 'screen',
        target: '/sections/invites',
      },
      {
        id: 'flyer',
        title: 'Flyer',
        blurb: 'Design flyers in the web editor.',
        kind: 'web',
        target: '/dashboard?tab=flyer',
      },
      {
        id: 'videos',
        title: 'Videos',
        blurb: 'AI welcome and thank-you videos for your quote pages.',
        kind: 'screen',
        target: '/sections/videos',
      },
      {
        id: 'files',
        title: 'Files',
        blurb: 'Archived quotes, invoices and your documents.',
        kind: 'screen',
        target: '/sections/files',
      },
      {
        id: 'historical-quotes',
        title: 'History',
        blurb: 'Your past pricing, imported and analysed.',
        kind: 'screen',
        target: '/sections/history',
      },
      {
        id: 'account',
        title: 'Account',
        blurb: 'Business details, licences and sign-in.',
        kind: 'screen',
        target: '/sections/account',
      },
      {
        id: 'payouts',
        title: 'Payouts',
        blurb: 'Deposits collected and where they land.',
        kind: 'screen',
        target: '/sections/payouts',
      },
      {
        id: 'billing',
        title: 'Billing',
        blurb: 'Your QuoteMax plan and invoices.',
        kind: 'screen',
        target: '/sections/billing',
      },
      {
        id: 'crm',
        title: 'CRM sync',
        blurb: 'Connect and sync your CRM — set up on the web.',
        kind: 'web',
        target: '/dashboard/crm',
      },
    ],
  },
];
