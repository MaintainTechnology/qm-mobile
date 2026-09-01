/**
 * The only navigation strings that may cross an external trust boundary.
 *
 * Push payloads, universal links, provider returns and auth continuation all
 * pass through this registry. A valid-looking relative string is not enough:
 * the route, audience and query shape must be known here first.
 */
export type DestinationAudience = 'public' | 'authenticated' | 'staff';

type DestinationDefinition = {
  audience: DestinationAudience;
  query?: Readonly<Record<string, RegExp>>;
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_SHORT_TEXT = /^[^\u0000-\u001F\u007F]{0,256}$/;
const SAFE_INTENT = /^\/(?!\/)[^\u0000-\u001F\u007F]{0,1023}$/;
const SAFE_INVITATION_CODE = /^[A-Za-z0-9][A-Za-z0-9-]{0,59}$/;
const SAFE_OPAQUE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._~-]{5,1023}$/;
const SAFE_CAMPAIGN_VALUE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export const DESTINATION_REGISTRY = {
  '/': { audience: 'authenticated' },
  '/welcome': { audience: 'public' },
  '/support': { audience: 'public' },
  '/sign-in': { audience: 'public', query: { intent: SAFE_INTENT } },
  '/sign-up': {
    audience: 'public',
    query: {
      resume: /^(?:0|1)$/,
      uid: SAFE_ID,
      code: SAFE_INVITATION_CODE,
      // Existing web/SMS contract: `intent` is an opaque one-use SMS token.
      intent: SAFE_OPAQUE_TOKEN,
      source: SAFE_CAMPAIGN_VALUE,
      referral: SAFE_CAMPAIGN_VALUE,
      plan: /^(?:starter|pro|crew)$/,
      interval: /^(?:month|year)$/,
      returnTo: SAFE_INTENT,
    },
  },
  '/success': {
    audience: 'public',
    query: {
      name: SAFE_SHORT_TEXT,
      phone: SAFE_SHORT_TEXT,
      warning: SAFE_SHORT_TEXT,
      session: SAFE_ID,
      uid: SAFE_ID,
      ready: /^(?:0|1)$/,
    },
  },
  '/quotes': { audience: 'authenticated', query: { quoteId: SAFE_ID } },
  '/chats': { audience: 'authenticated', query: { chatId: SAFE_ID } },
  '/tools': { audience: 'authenticated' },
  '/menu': { audience: 'authenticated' },
  '/sections/account': { audience: 'authenticated' },
  '/sections/billing': { audience: 'authenticated', query: { stripe: /^return$/ } },
  '/sections/calendar': { audience: 'authenticated' },
  '/sections/files': { audience: 'authenticated' },
  '/sections/followups': { audience: 'authenticated' },
  '/sections/history': { audience: 'authenticated' },
  '/sections/help': { audience: 'authenticated' },
  '/sections/invites': { audience: 'authenticated' },
  '/sections/overview': { audience: 'authenticated' },
  '/sections/payouts': {
    audience: 'authenticated',
    query: { stripe: /^(?:return|refresh)$/ },
  },
  '/sections/pricing-book': { audience: 'authenticated' },
  '/sections/videos': { audience: 'authenticated' },
} as const satisfies Record<string, DestinationDefinition>;

export type RegisteredDestinationPath = keyof typeof DESTINATION_REGISTRY;

export type SafeDestination = {
  audience: DestinationAudience;
  href: string;
  path: RegisteredDestinationPath;
};

export const APPROVED_LINK_HOSTS = new Set(['quotemax.com.au', 'www.quotemax.com.au']);

function routeUrl(value: string): URL | null {
  try {
    if (value.startsWith('//')) return null;
    if (value.startsWith('/')) return new URL(value, 'quotemax://app');
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol === 'quotemax:') {
      const routePath =
        parsed.hostname && parsed.hostname !== 'app'
          ? `/${parsed.hostname}${parsed.pathname}`
          : parsed.pathname || '/';
      return new URL(`${routePath}${parsed.search}`, 'quotemax://app');
    }

    if (protocol !== 'https:' || !APPROVED_LINK_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    // Only links deliberately published under /app are claimed by the native
    // binary today. Customer/browser routes remain installation-optional until
    // their native counterparts are implemented and added to this registry.
    if (parsed.pathname !== '/app' && !parsed.pathname.startsWith('/app/')) return null;
    const routePath = parsed.pathname.slice('/app'.length) || '/';
    return new URL(`${routePath}${parsed.search}`, 'quotemax://app');
  } catch {
    return null;
  }
}

export function safeDestination(value: string): SafeDestination | null {
  const parsed = routeUrl(value);
  if (!parsed || parsed.hash || parsed.username || parsed.password) return null;

  const path = parsed.pathname.replace(/\/{2,}/g, '/') as RegisteredDestinationPath;
  const definition = (DESTINATION_REGISTRY as Record<string, DestinationDefinition>)[path];
  if (!definition) return null;

  const allowedQuery = definition.query ?? {};
  for (const [key, rawValue] of parsed.searchParams.entries()) {
    const matcher = allowedQuery[key];
    if (!matcher || !matcher.test(rawValue)) return null;
  }

  const query = parsed.searchParams.toString();
  return {
    audience: definition.audience,
    href: `${path}${query ? `?${query}` : ''}`,
    path,
  };
}

/**
 * SDK 54 `+native-intent` hook. Keep development-server URLs untouched; all
 * QuoteMax custom/universal links are routed through an auth-aware resolver.
 */
export function rewriteIncomingSystemPath(value: string): string {
  if (
    value.startsWith('/') ||
    value.startsWith('exp://') ||
    value.startsWith('exps://') ||
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(value)
  ) {
    return value;
  }

  const destination = safeDestination(value);
  if (!destination) return '/invalid-link';
  return `/resolve-link?target=${encodeURIComponent(destination.href)}`;
}
