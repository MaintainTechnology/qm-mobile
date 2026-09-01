import type { ErrorEvent } from '@sentry/react-native';

const ALLOWED_TAGS = new Set([
  'app_version',
  'runtime_version',
  'update_id',
  'route',
  'operation_id',
  'error_kind',
]);

const SAFE_TAG_VALUE = /^[A-Za-z0-9_./:@-]{1,128}$/;
const SAFE_OPERATION_ID = /^[a-z][a-z0-9._-]{2,79}$/;

export type MonitoringErrorKind =
  | 'background_return'
  | 'provider'
  | 'route'
  | 'schema'
  | 'startup'
  | 'stream'
  | 'upload';

/**
 * Keep monitoring route tags useful without ever sending IDs, invitation
 * tokens, share tokens, search terms, or query values.
 */
export function privacySafeRoute(rawRoute: string): string {
  const path = rawRoute.split(/[?#]/, 1)[0] ?? '';
  if (!path.startsWith('/') || /[\u0000-\u001F\u007F]/.test(path)) return '/unknown';

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  if (segments[0] !== 'api' && segments[0] !== 'ai') {
    const staticAppRoutes = new Set([
      'chats',
      'invalid-link',
      'menu',
      'quotes',
      'resolve-link',
      'sections',
      'sign-in',
      'sign-up',
      'success',
      'tools',
      'welcome',
    ]);
    if (!staticAppRoutes.has(segments[0] ?? '')) return '/unknown';
    // App routes are static today. Keep at most the known section slug; any
    // future dynamic segment becomes a placeholder until deliberately mapped.
    if (segments[0] === 'sections' && /^[a-z-]{1,40}$/.test(segments[1] ?? '')) {
      return `/sections/${segments[1]}`;
    }
    return `/${segments[0]}`;
  }

  if (segments[0] === 'ai') return '/ai/:operation';
  const group = segments[1];
  if (!group || !/^[a-z-]{1,40}$/.test(group)) return '/api/unknown';
  if (group === 'tenant') {
    const resource = segments[2];
    return resource && /^[a-z-]{1,40}$/.test(resource)
      ? `/api/tenant/${resource}`
      : '/api/tenant';
  }
  if (group === 'quote') return '/api/quote/:id';
  const action = segments[2];
  return action && /^[a-z-]{1,40}$/.test(action)
    ? `/api/${group}/${action}`
    : `/api/${group}`;
}

export function validOperationId(value: string): boolean {
  return SAFE_OPERATION_ID.test(value);
}

function safeTag(value: unknown): string | undefined {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  return SAFE_TAG_VALUE.test(text) ? text : undefined;
}

/**
 * Last boundary before an error leaves the device. Stack frames and native
 * crash mechanics remain, while every customer-controlled field is removed.
 */
export function privacySafeMonitoringEvent(event: ErrorEvent): ErrorEvent {
  const tags = Object.fromEntries(
    Object.entries(event.tags ?? {}).flatMap(([key, value]) => {
      if (!ALLOWED_TAGS.has(key)) return [];
      const cleaned = safeTag(value);
      return cleaned ? [[key, cleaned]] : [];
    }),
  );
  const kind = safeTag(tags.error_kind) ?? 'application';

  return {
    ...event,
    breadcrumbs: undefined,
    contexts: undefined,
    extra: undefined,
    fingerprint: undefined,
    logger: undefined,
    logentry: undefined,
    measurements: undefined,
    message: undefined,
    request: undefined,
    server_name: undefined,
    spans: undefined,
    transaction: undefined,
    user: undefined,
    tags,
    exception: event.exception
      ? {
          values: event.exception.values?.map(value => ({
            ...value,
            type:
              typeof value.type === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(value.type)
                ? value.type
                : 'Error',
            value: `${kind} failure`,
          })),
        }
      : undefined,
  };
}
