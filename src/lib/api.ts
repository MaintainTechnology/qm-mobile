/**
 * Typed client for the QuoteMax API.
 *
 * Every response is validated against a schema before it reaches the app. The network is a trust
 * boundary: an API that quietly changes a field from cents to dollars must fail here, loudly,
 * rather than render a quote that is 100x wrong.
 */
import type { z } from 'zod';

import { apiUrl } from '@/lib/env';
import { captureAppError } from '@/lib/monitoring';
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
   * Per-call budget. Reads keep the 15s default; SLOW NON-IDEMPOTENT mutations
   * (activation provisions a phone number, job-quote/measure-all run an LLM)
   * must pass a budget matched to the server, or a slow success gets aborted
   * client-side and the retry double-fires the action.
   */
  timeoutMs?: number;
  /**
   * Stable, non-sensitive label for endpoints whose concrete path contains a
   * capability token. Fetch still uses `path`; errors and monitoring use this.
   */
  diagnosticPath?: string;
} & (
  // Public capability requests never read a saved session or send credentials.
  { anonymous: true; token?: never }
  // Authenticated callers fetch a fresh Clerk token per request. Existing
  // callers without one retain the legacy SecureStore header by default.
  | { anonymous?: false; token?: string }
);

/**
 * A stalled request on a two-bar connection must fail into the retry UIs, not spin forever —
 * without this, a dead-but-connected network hangs every CTA in the app.
 */
const REQUEST_TIMEOUT_MS = 15000;

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  {
    signal,
    body,
    method = 'GET',
    token,
    anonymous = false,
    timeoutMs = REQUEST_TIMEOUT_MS,
    diagnosticPath = path,
  }: RequestOptions = {},
): Promise<T> {
  if (anonymous && token !== undefined) throw new Error('Anonymous requests cannot include a session token.');
  const controller = new AbortController();
  const abortError = () =>
    Object.assign(new Error('The request was interrupted; its outcome is not confirmed.'), {
      name: 'AbortError',
    });
  const checkAborted = () => {
    if (controller.signal.aborted) throw abortError();
  };
  let rejectAborted: (error: Error) => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAborted = reject;
  });
  const rejectOnAbort = () => rejectAborted(abortError());
  const forwardAbort = () => controller.abort();
  controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
  const timer = setTimeout(forwardAbort, timeoutMs);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });

  async function performRequest(): Promise<T> {
    checkAborted();
    const authorization = anonymous ? {} : token ? { Authorization: `Bearer ${token}` } : await authHeader();
    // Secure storage may settle after cancellation. Never begin a write after that boundary.
    checkAborted();
    const response = await fetch(apiUrl(path), {
      method,
      signal: controller.signal,
      ...(anonymous ? { credentials: 'omit' as const } : {}),
      headers: {
        Accept: 'application/json',
        // FormData sets its own multipart boundary — forcing a Content-Type here
        // would break the upload. JSON keeps the explicit header.
        ...(body === undefined || body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...authorization,
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => undefined);
      throw new ApiError(
        `${method} ${diagnosticPath} failed`,
        response.status,
        diagnosticPath,
        errorBody,
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      checkAborted();
      throw new ApiSchemaError(diagnosticPath, [
        { code: 'custom', path: [], message: 'Response was not valid JSON.' },
      ]);
    }
    checkAborted();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiSchemaError(diagnosticPath, parsed.error.issues);
    }
    return parsed.data;
  }

  try {
    // Some native transports ignore abort after headers, leaving response.json() pending.
    // Race the entire operation, including auth storage and body parsing, against cancellation.
    return await Promise.race([performRequest(), aborted]);
  } catch (error) {
    if (error instanceof ApiSchemaError) {
      captureAppError(error, {
        kind: 'schema',
        operationId: 'api.response.schema',
        route: diagnosticPath,
      });
    } else if (body instanceof FormData) {
      captureAppError(error, {
        kind: 'upload',
        operationId: 'api.upload.request',
        route: diagnosticPath,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
    controller.signal.removeEventListener('abort', rejectOnAbort);
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
  if (
    __DEV__ &&
    (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError'))
  ) {
    let target: string;
    try {
      target = apiUrl('');
    } catch {
      return `${fallback} [dev: the QuoteMax API URL is not configured.]`;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      return `${fallback} [dev: no response from ${target} — is the QuoteMax server running?]`;
    }
    if (error instanceof TypeError) {
      return `${fallback} [dev: could not connect to ${target} — is the QuoteMax server running?]`;
    }
  }
  return fallback;
}
