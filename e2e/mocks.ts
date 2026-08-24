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
        { direction: 'inbound', body: 'Hey, my switchboard keeps tripping', created_at: '2026-08-23T09:00:00Z' },
        { direction: 'outbound', body: 'No worries Dana — a few questions first.', created_at: '2026-08-23T09:01:00Z' },
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

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Happy-path backend. Unmatched /api/ paths 404 with a mock marker so a spec that
 * needs a new endpoint fails loudly instead of hanging into the 15s client timeout.
 */
export async function installApiMocks(page: Page): Promise<void> {
  await page.route('http://localhost:3000/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === '/api/onboard/validate-code' && method === 'POST') return json(route, { ok: true });
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

    return json(route, { error: 'not_mocked', message: `No mock for ${method} ${path}` }, 404);
  });
}

/** Dead backend: every API call fails at the socket, like a black spot on site. */
export async function installOfflineMocks(page: Page): Promise<void> {
  await page.route('http://localhost:3000/**', route => route.abort('connectionfailed'));
}
