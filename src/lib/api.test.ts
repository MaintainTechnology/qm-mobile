import { z } from 'zod';

import { apiRequest, ApiSchemaError } from './api';
import { authHeader } from './session';

const mockCaptureAppError = jest.fn();

jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://api.test${path}` }));
jest.mock('@/lib/session', () => ({ authHeader: jest.fn(async () => ({})) }));
jest.mock('@/lib/monitoring', () => ({
  captureAppError: (...args: unknown[]) => mockCaptureAppError(...args),
}));

describe('apiRequest diagnostic paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the capability URL but never stores or reports its token in a schema error', async () => {
    const secret = 'single-use-secret-capability';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ wrong: true }), { status: 200 }));

    const promise = apiRequest(
      `/api/onboard/intent/${secret}`,
      z.object({ status: z.literal('verified') }),
      { diagnosticPath: '/api/onboard/intent/:token' },
    );

    await expect(promise).rejects.toMatchObject({
      path: '/api/onboard/intent/:token',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.test/api/onboard/intent/${secret}`,
      expect.any(Object),
    );
    expect(mockCaptureAppError).toHaveBeenCalledWith(
      expect.any(ApiSchemaError),
      expect.objectContaining({ route: '/api/onboard/intent/:token' }),
    );
    expect(JSON.stringify(mockCaptureAppError.mock.calls)).not.toContain(secret);
  });
});

describe('apiRequest whole-operation cancellation', () => {
  const schema = z.object({ ok: z.literal(true) });
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([true, false])(
    'times out a stuck response body even if the transport ignores abort (ok=%s)',
    async ok => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({
          ok,
          status: ok ? 200 : 409,
          json: () => new Promise(() => {}),
        } as Response);
      const result = apiRequest('/api/quote/q/send', schema, {
        token: 'test-token',
        timeoutMs: 30,
        method: 'POST',
      });
      const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
      await jest.advanceTimersByTimeAsync(31);
      await rejected;
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('does not dispatch a write when auth storage completes after cancellation', async () => {
    let resolveHeader!: (value: Record<string, string>) => void;
    jest.mocked(authHeader).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveHeader = resolve;
        }),
    );
    const fetchMock = jest.spyOn(global, 'fetch');
    const result = apiRequest('/api/write', schema, { method: 'POST', timeoutMs: 30 });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await jest.advanceTimersByTimeAsync(31);
    await rejected;
    resolveHeader({});
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honours explicit cancellation during body parsing and removes the external listener', async () => {
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: () => new Promise(() => {}) } as Response);
    const result = apiRequest('/api/read', schema, {
      token: 'test-token',
      signal: controller.signal,
    });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    controller.abort();
    await rejected;
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('does not fetch for a pre-aborted caller', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(
      apiRequest('/api/write', schema, {
        token: 'test-token',
        signal: controller.signal,
        method: 'POST',
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('distinguishes malformed success JSON from an authoritative structured rejection', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('private body');
      },
    } as unknown as Response);
    await expect(apiRequest('/api/read', schema, { token: 'test-token' })).rejects.toBeInstanceOf(
      ApiSchemaError,
    );
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'quote_paid' }),
    } as Response);
    await expect(apiRequest('/api/write', schema, { token: 'test-token' })).rejects.toMatchObject({
      status: 409,
      body: { error: 'quote_paid' },
    });
    expect(JSON.stringify(mockCaptureAppError.mock.calls)).not.toContain('private body');
  });
});

describe('explicit anonymous capability transport', () => {
  const schema = z.object({ ok: z.literal(true), status: z.literal('unsubscribed') }).strict();
  const path = '/api/email/unsubscribe/opaque.capability';
  beforeEach(() => { jest.clearAllMocks(); });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
  it('never reads session storage or adds Authorization for an explicit anonymous request', async () => {
    jest.mocked(authHeader).mockRejectedValueOnce(new Error('Locked keychain'));
    const request = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true, status: 'unsubscribed' })));
    expect(await apiRequest(path, schema, { anonymous: true, diagnosticPath: '/api/email/unsubscribe/:token' })).toEqual({ ok: true, status: 'unsubscribed' });
    expect(authHeader).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(`https://api.test${path}`, expect.objectContaining({ credentials: 'omit', headers: { Accept: 'application/json' } }));
    jest.mocked(authHeader).mockReset().mockResolvedValue({});
  });
  it('rejects contradictory anonymous and token options before any request or storage access', async () => {
    const request = jest.spyOn(global, 'fetch');
    // @ts-expect-error Explicit anonymous requests cannot include a session token.
    await expect(apiRequest(path, schema, { anonymous: true, token: 'session' })).rejects.toThrow('Anonymous requests cannot include a session token');
    expect(request).not.toHaveBeenCalled(); expect(authHeader).not.toHaveBeenCalled();
  });
  it('bounds an anonymous stalled success body and never reports its capability URL in diagnostics', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: () => new Promise(() => {}) } as Response);
    const result = apiRequest(path, schema, { anonymous: true, diagnosticPath: '/api/email/unsubscribe/:token', timeoutMs: 30 });
    const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await jest.advanceTimersByTimeAsync(31); await rejected;
    expect(authHeader).not.toHaveBeenCalled(); expect(JSON.stringify(mockCaptureAppError.mock.calls)).not.toContain('opaque.capability');
  });
});
