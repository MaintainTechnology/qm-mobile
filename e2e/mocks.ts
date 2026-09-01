/**
 * Route mocks for the QuoteMax backend (EXPO_PUBLIC_API_URL = http://localhost:3000).
 * Fixtures satisfy the app's zod response schemas EXACTLY — a drifting mock throws
 * ApiSchemaError in-app by design, which is itself a test failure. Clerk traffic is
 * never intercepted (different host).
 */
import type { Page, Route } from '@playwright/test';

export const QA_PHONE_NUMBER = '+61 480 016 227';

/** TenantMeSchema fixture: two quotes — one awaiting review, one accepted with deposit. */
export const tenantMe = {
  tenant: {
    id: 'ten_qa_1',
    business_name: 'Volt & Sons Electrical',
    owner_first_name: 'QA',
    owner_email: 'qa-signin+clerk_test@example.com',
    trades: ['electrical'],
    state: 'NSW',
    status: 'active',
    twilio_sms_number: QA_PHONE_NUMBER,
  },
  pricing_books: [
    { trade: 'electrical', hourly_rate: 110, call_out_minimum: 90, default_markup_pct: 15 },
  ],
  quotes: [
    {
      id: 'q_review_1',
      created_at: '2026-08-23T09:30:00Z',
      status: 'awaiting_review',
      total_inc_gst: 1485.5,
      customer_full_name: 'Dana Whitfield',
      customer_first_name: 'Dana',
      customer_phone: '+61400111222',
      suburb: 'Parramatta',
      job_type: 'Switchboard upgrade',
      trade: 'electrical',
      deposit_paid: false,
      channel: 'sms',
      scope_of_works: 'Replace switchboard, add RCBOs.',
    },
    {
      id: 'q_accepted_1',
      created_at: '2026-08-22T02:10:00Z',
      status: 'accepted',
      total_inc_gst: 640,
      customer_full_name: 'Lee Marsh',
      customer_first_name: 'Lee',
      suburb: 'Ryde',
      job_type: 'Fan install',
      trade: 'electrical',
      deposit_paid: true,
      channel: 'voice',
    },
  ],
  licences: [{ trade: 'electrical' }],
};

/** ChatsResponseSchema fixture: one SMS thread (replyable) + one voice call. */
export const chats = {
  chats: [
    {
      id: 'chat_sms_1',
      channel: 'sms',
      from_number: '+61400111222',
      to_number: QA_PHONE_NUMBER,
      status: 'active',
      created_at: '2026-08-23T09:00:00Z',
      last_message_at: '2026-08-23T09:25:00Z',
      first_name: 'Dana',
      job_type: 'Switchboard upgrade',
      suburb: 'Parramatta',
      messages: [
        {
          direction: 'inbound',
          body: 'Hey, my switchboard keeps tripping',
          created_at: '2026-08-23T09:00:00Z',
        },
        {
          direction: 'outbound',
          body: 'No worries Dana — a few questions first.',
          created_at: '2026-08-23T09:01:00Z',
        },
      ],
    },
    {
      id: 'chat_voice_1',
      channel: 'voice',
      from_number: '+61400333444',
      status: 'completed',
      created_at: '2026-08-22T01:55:00Z',
      duration_seconds: 184,
      first_name: 'Lee',
      job_type: 'Fan install',
      suburb: 'Ryde',
      messages: [],
    },
  ],
};

/** Read surfaces for the native Menu pages; amounts use each endpoint's wire units. */
export const sectionFixtures: Record<string, unknown> = {
  '/api/tenant/analytics': {
    ok: true,
    analytics: {
      generatedAt: '2026-08-23T09:30:00Z',
      weeks: 8,
      headline: {
        peopleTexting: 1,
        peopleCalling: 1,
        totalChats: 1,
        totalCalls: 1,
        totalRequests: 2,
        totalQuotes: 2,
        processedQuotes: 2,
        uniqueCustomers: 2,
      },
      needsAttention: { awaitingReview: 1, coldChats: 0, inspectionsToBook: 1 },
      speedToQuoteMinutes: 8,
      funnel: [
        { label: 'Requests', count: 2 },
        { label: 'Quoted', count: 2 },
        { label: 'Accepted', count: 1 },
      ],
      weeklyTrend: [
        { label: '06 Jul', quotes: 0, intakes: 0 },
        { label: '13 Jul', quotes: 0, intakes: 0 },
        { label: '20 Jul', quotes: 0, intakes: 0 },
        { label: '27 Jul', quotes: 0, intakes: 0 },
        { label: '03 Aug', quotes: 0, intakes: 0 },
        { label: '10 Aug', quotes: 0, intakes: 0 },
        { label: '17 Aug', quotes: 2, intakes: 2 },
        { label: '24 Aug', quotes: 0, intakes: 0 },
      ],
      channelSplit: [
        { label: 'SMS', count: 1 },
        { label: 'Voice', count: 1 },
      ],
      topJobTypes: [
        { label: 'Switchboard upgrade', count: 1 },
        { label: 'Fan install', count: 1 },
      ],
    },
  },
  '/api/tenant/calendar': {
    events: [
      {
        quoteId: 'q_booking_1',
        scheduledAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        bookingState: 'requested',
        customerName: 'Mira Campbell',
        jobType: 'Safety inspection',
        suburb: 'Newtown',
        address: '12 Garden Street',
        needsInspection: true,
        href: '/quotes?quoteId=q_booking_1',
      },
    ],
    toSchedule: [
      {
        quoteId: 'q_accepted_1',
        customerName: 'Lee Marsh',
        jobType: 'Fan install',
        suburb: 'Ryde',
        paid: true,
        href: '/quotes?quoteId=q_accepted_1',
      },
    ],
    awaitingBooking: [],
    reviewCount: 1,
  },
  '/api/tenant/files': {
    documents: [
      {
        id: 'doc_quote_1',
        display_name: 'Dana Whitfield — switchboard upgrade.pdf',
        source_kind: 'quote',
        trade: 'electrical',
        state: 'active',
        created_at: '2026-08-23T09:30:00Z',
        bytes: 145_408,
        comment_count: 2,
      },
      {
        id: 'doc_invoice_1',
        display_name: 'Supplier invoice — August materials.pdf',
        source_kind: 'invoice',
        trade: 'electrical',
        state: 'pending',
        created_at: '2026-08-22T02:10:00Z',
        bytes: 84_992,
        comment_count: 0,
      },
    ],
  },
  '/api/tenant/followups': {
    followups: [
      {
        kind: 'quote',
        quote_id: 'q_review_1',
        job_type: 'Switchboard upgrade',
        total_inc_gst: 1485.5,
        followup_reason: 'Quote awaiting customer response',
        last_activity: '2026-08-23T09:25:00Z',
        age_hours: 48,
        customer: {
          first_name: 'Dana',
          full_name: 'Dana Whitfield',
          phone: '+61400111222',
          suburb: 'Parramatta',
        },
      },
    ],
  },
  '/api/tenant/followups/messages': {
    ok: true,
    messages: chats.chats[0].messages,
    last_inbound_at: '2026-08-23T09:00:00Z',
    last_outbound_at: '2026-08-23T09:01:00Z',
  },
  '/api/tenant/historical-quotes/analytics': {
    analytics: [
      {
        job_type: 'Switchboard upgrade',
        trade: 'electrical',
        count: 6,
        avg_price_inc_gst: 1485.5,
        min_price_inc_gst: 1210,
        max_price_inc_gst: 1760,
        most_recent_quoted_at: '2026-08-23T09:30:00Z',
      },
    ],
  },
  '/api/tenant/historical-quotes': {
    quotes: [
      {
        id: 'history_1',
        job_type: 'Switchboard upgrade',
        raw_description: 'Replace switchboard and add circuit protection.',
        quoted_at: '2026-08-23T09:30:00Z',
        price_inc_gst: 1485.5,
        source_kind: 'quote',
      },
    ],
  },
  '/api/tenant/historical-quotes/hint': {
    count: 6,
    avg_price_inc_gst: 1485.5,
    min_price_inc_gst: 1210,
    max_price_inc_gst: 1760,
    most_recent_quoted_at: '2026-08-23T09:30:00Z',
  },
  '/api/dashboard/marketing/qr': {
    slug: 'volt-and-sons',
    qrs: [
      {
        id: 'qr_1',
        short_code: 'volt-van',
        label: 'Work van · local electrical services',
        destination_type: 'sms',
        status: 'active',
        scan_count: 24,
      },
    ],
  },
  '/api/dashboard/invites/codes': {
    codes: [
      {
        id: 'invite_1',
        code: 'VOLT-LOCAL',
        campaign: 'Local business referrals',
        quota_total: 20,
        quota_used: 3,
        status: 'active',
      },
    ],
  },
  '/api/tenant/payouts': {
    ok: true,
    account: {
      has_account: true,
      payouts_enabled: true,
      details_submitted: true,
      bank: { bank_name: 'Test bank', last4: '4242' },
      balance: { available_cents: 64_000, pending_cents: 12_000 },
    },
    jobs: [
      {
        quote_id: 'q_accepted_1',
        job_type: 'Fan install',
        paid_tier: 'better',
        paid_at: '2026-08-22T02:10:00Z',
        paid_amount_cents: 64_000,
        net_cents: 62_000,
        release_state: 'awaiting',
      },
    ],
  },
  '/api/billing/status': {
    has_customer: true,
    status: 'active',
    plan: 'pro',
    interval: 'month',
    current_period_end: '2026-09-23T00:00:00Z',
    cancel_at_period_end: false,
    usage: { quotesUsed: 12, voiceMinutesUsed: 0 },
    limits: { quotes: 100, voice: false, voiceMinutes: 0 },
  },
  '/api/tenant/videos': {
    ok: true,
    trade: 'electrical',
    trades: [{ slug: 'electrical', label: 'Electrical' }],
    slots: {
      welcome: {
        default_script:
          'Welcome to Volt & Sons. Review your quote and choose the option that suits your job.',
        state: { status: 'idle' },
      },
      thankyou: {
        default_script:
          'Thanks for choosing Volt & Sons. We look forward to helping with your electrical work.',
        state: { status: 'idle' },
      },
    },
  },
  '/api/tenant/catalogue': { catalogue: [] },
  '/api/tenant/estimator/history': { ok: true, uploads: [] },
  '/api/tenant/trade-jobs': { jobs: [] },
};

export type ApiMockOverrides = Record<string, { body: unknown; status?: number }>;
export type ApiMockLog = { unmatched: string[]; mutations: string[] };

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

/**
 * Happy-path backend. Unmatched /api/ paths 404 with a mock marker so a spec that
 * needs a new endpoint fails loudly instead of hanging into the 15s client timeout.
 */
export async function installApiMocks(
  page: Page,
  overrides: ApiMockOverrides = {},
): Promise<ApiMockLog> {
  const log: ApiMockLog = { unmatched: [], mutations: [] };
  // Fail closed if a misconfigured build tries a production business API. Clerk's
  // development /v1 endpoints remain available for the real test-mode sign-in.
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://localhost:3000') return route.fallback();
    log.unmatched.push(`Blocked non-test API origin: ${url.origin}${url.pathname}`);
    return route.abort('blockedbyclient');
  });
  await page.route('http://localhost:3000/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'authorization, content-type',
        },
      });
    if (method !== 'GET') log.mutations.push(`${method} ${path}`);
    const override = overrides[path];
    if (override) return json(route, override.body, override.status);
    if (method === 'GET' && path in sectionFixtures) return json(route, sectionFixtures[path]);

    if (path === '/api/onboard/validate-code' && method === 'POST')
      return json(route, { ok: true });
    if (path === '/api/onboard/activate' && method === 'POST')
      return json(route, {
        ok: true,
        tenantId: 'ten_qa_1',
        phoneNumber: QA_PHONE_NUMBER,
        setupComplete: true,
      });
    if (path === '/api/onboard/retry-provision' && method === 'POST')
      return json(route, { ok: true, phoneNumber: QA_PHONE_NUMBER });

    if (path === '/api/tenant/me' && method === 'GET') return json(route, tenantMe);
    if (path === '/api/tenant/me' && method === 'PATCH') return json(route, { ok: true });

    if (path === '/api/tenant/chats' && method === 'GET') return json(route, chats);
    if (/^\/api\/quote\/[^/]+\/(approve|send)$/.test(path) && method === 'POST')
      return json(route, { ok: true, status: 'sent' });
    if (/^\/api\/tenant\/chats\/[^/]+\/reply$/.test(path) && method === 'POST') {
      const body = route.request().postDataJSON() as { body?: string };
      return json(route, {
        message: {
          direction: 'outbound',
          body: body?.body ?? '',
          created_at: new Date().toISOString(),
        },
      });
    }

    if (/^\/api\/tenant\/(roofing|painting)-rates$/.test(path) && method === 'GET')
      return json(route, { ok: true, overrides: {}, has_pricing_book: true });
    if (/^\/api\/tenant\/(roofing|painting)-rates$/.test(path) && method === 'PATCH')
      return json(route, { ok: true });

    log.unmatched.push(`${method} ${path}`);
    return json(route, { error: 'not_mocked', message: `No mock for ${method} ${path}` }, 404);
  });
  return log;
}

/** Dead backend: every API call fails at the socket, like a black spot on site. */
export async function installOfflineMocks(page: Page): Promise<void> {
  await page.route('http://localhost:3000/**', route => route.abort('connectionfailed'));
}
