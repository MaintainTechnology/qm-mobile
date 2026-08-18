/**
 * Typed client for the QuoteMax API.
 *
 * Every response is validated against a schema before it reaches the app. The network is a trust
 * boundary: an API that quietly changes a field from cents to dollars must fail here, loudly,
 * rather than render a quote that is 100x wrong.
 */
import type { z } from 'zod';

import { apiUrl } from '@/lib/env';
import { authHeader } from '@/lib/session';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    /** Parsed JSON error body when the server sent one — e.g. { error, message, fieldErrors }. */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The response did not match its schema — treat as a bug, not as bad user input. */
export class ApiSchemaError extends Error {
  constructor(
    readonly path: string,
    readonly issues: z.ZodError['issues'],
  ) {
    super(`Unexpected response shape from ${path}`);
    this.name = 'ApiSchemaError';
  }
}

type RequestOptions = {
  signal?: AbortSignal;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /**
   * Bearer token for this request. Clerk session tokens are short-lived, so
   * callers fetch one per request via useAuth().getToken() rather than storing
   * it; when omitted, the legacy SecureStore session header applies.
   */
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  { signal, body, method = 'GET', token }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : await authHeader()),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => undefined);
    throw new ApiError(`${method} ${path} failed`, response.status, path, errorBody);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiSchemaError(path, parsed.error.issues);
  }
  return parsed.data;
}
