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
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /**
   * Bearer token for this request. Clerk session tokens are short-lived, so
   * callers fetch one per request via useAuth().getToken() rather than storing
   * it; when omitted, the legacy SecureStore session header applies.
   */
  token?: string;
  /**
   * Per-call budget. Reads keep the 15s default; SLOW NON-IDEMPOTENT mutations
   * (activation provisions a phone number, job-quote/measure-all run an LLM)
   * must pass a budget matched to the server, or a slow success gets aborted
   * client-side and the retry double-fires the action.
   */
  timeoutMs?: number;
};

/**
 * A stalled request on a two-bar connection must fail into the retry UIs, not spin forever —
 * without this, a dead-but-connected network hangs every CTA in the app.
 */
const REQUEST_TIMEOUT_MS = 15000;

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  { signal, body, method = 'GET', token, timeoutMs = REQUEST_TIMEOUT_MS }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const response = await fetch(apiUrl(path), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // FormData sets its own multipart boundary — forcing a Content-Type here
        // would break the upload. JSON keeps the explicit header.
        ...(body === undefined || body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : await authHeader()),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
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
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The one place server errors become tradie-facing copy. Order mirrors the backend's error
 * envelope: message → detail → errors[] → error slug, then a status-aware default. Features pass
 * their own fallback line when the generic network copy doesn't fit the action.
 */
export function apiErrorMessage(
  error: unknown,
  fallback = 'Could not reach QuoteMax. Check your signal and try again.',
): string {
  if (error instanceof ApiSchemaError) {
    return 'QuoteMax sent back something unexpected. Try again shortly.';
  }
  if (error instanceof ApiError) {
    const body = (error.body ?? {}) as {
      message?: unknown;
      detail?: unknown;
      error?: unknown;
      errors?: unknown;
    };
    if (typeof body.message === 'string' && body.message) return body.message;
    if (typeof body.detail === 'string' && body.detail) return body.detail;
    if (Array.isArray(body.errors)) {
      const joined = body.errors.filter((e): e is string => typeof e === 'string').join(' · ');
      if (joined) return joined;
    }
    if (typeof body.error === 'string' && body.error) {
      return `That didn't go through (${body.error.replace(/_/g, ' ')}). Try again.`;
    }
    if (error.status >= 500) return 'QuoteMax is having trouble on their end. Try again shortly.';
  }
  // In development, name the URL that actually failed. The shipped line blames the tradie's
  // signal, which is badly misleading when the real cause is a backend that isn't running or a
  // dev server that moved port — the exact trap this project has already lost a day to.
  // Append, never replace: the tradie-facing sentence is the same in every build, and dev just
  // gets the detail bolted on. Swapping the copy out would make the shipped wording untested.
  if (__DEV__) {
    const target = apiUrl('');
    if (error instanceof Error && error.name === 'AbortError') {
      return `${fallback} [dev: no response from ${target} — is the QuoteMax server running?]`;
    }
    if (error instanceof TypeError) {
      return `${fallback} [dev: could not connect to ${target} — is the QuoteMax server running?]`;
    }
  }
  return fallback;
}
