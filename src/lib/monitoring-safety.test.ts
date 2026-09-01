import type { ErrorEvent } from '@sentry/react-native';

import {
  privacySafeMonitoringEvent,
  privacySafeRoute,
  validOperationId,
} from './monitoring-safety';

describe('privacySafeRoute', () => {
  it('keeps known static routes while removing queries and dynamic identifiers', () => {
    expect(privacySafeRoute('/sections/billing?stripe=return')).toBe('/sections/billing');
    expect(privacySafeRoute('/api/quote/customer-quote-id/complete')).toBe('/api/quote/:id');
    expect(privacySafeRoute('/ai/quote-assistant?prompt=private')).toBe('/ai/:operation');
  });

  it('does not report unregistered app routes', () => {
    expect(privacySafeRoute('/share/secret-token')).toBe('/unknown');
    expect(privacySafeRoute('https://evil.example/path')).toBe('/unknown');
  });
});

describe('privacySafeMonitoringEvent', () => {
  it('retains stack mechanics and approved tags but strips customer-controlled content', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'Customer Jane said secret words',
      request: { url: 'https://api.example/quote?token=secret', data: 'complete quote' },
      user: { email: 'jane@example.com', ip_address: '127.0.0.1' },
      extra: { quote: { customer: 'Jane' } },
      contexts: { customer: { name: 'Jane' } },
      breadcrumbs: [{ message: 'Clicked Jane quote' }],
      tags: {
        app_version: '1.1.0',
        route: '/quotes',
        error_kind: 'schema',
        customer_name: 'Jane',
      },
      exception: {
        values: [
          {
            type: 'ApiSchemaError',
            value: 'Payload included jane@example.com',
            stacktrace: { frames: [{ filename: 'src/lib/api.ts', lineno: 93 }] },
          },
        ],
      },
    };

    const safe = privacySafeMonitoringEvent(event);
    expect(safe.request).toBeUndefined();
    expect(safe.user).toBeUndefined();
    expect(safe.extra).toBeUndefined();
    expect(safe.contexts).toBeUndefined();
    expect(safe.breadcrumbs).toBeUndefined();
    expect(safe.message).toBeUndefined();
    expect(safe.tags).toEqual({
      app_version: '1.1.0',
      route: '/quotes',
      error_kind: 'schema',
    });
    expect(safe.exception?.values?.[0]?.value).toBe('schema failure');
    expect(safe.exception?.values?.[0]?.stacktrace?.frames).toHaveLength(1);
    expect(JSON.stringify(safe)).not.toContain('Jane');
    expect(JSON.stringify(safe)).not.toContain('secret');
  });
});

describe('validOperationId', () => {
  it('accepts stable code identifiers and rejects content-bearing values', () => {
    expect(validOperationId('api.response.schema')).toBe(true);
    expect(validOperationId('Jane customer upload failed')).toBe(false);
    expect(validOperationId('a'.repeat(81))).toBe(false);
  });
});
