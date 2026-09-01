import { z } from 'zod';

import { apiRequest, ApiSchemaError } from './api';

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
