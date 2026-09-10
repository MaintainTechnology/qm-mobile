import * as SecureStore from 'expo-secure-store';

import { ApiError, ApiSchemaError } from '@/lib/api';

import {
  attemptStorageKey,
  beginAnotherJobDraft,
  loadDraftAttempt,
  reconcileJobDraft,
  runGuardedJobDraft,
} from './draft-attempt';
import type { JobQuoteRequest, JobQuoteOperation } from './schema';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'dddddddd-1111-4111-8111-dddddddddddd' }));
const operationId = 'dddddddd-1111-4111-8111-dddddddddddd';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const scope = { userId: 'user_a', tenantId: 'tenant_a' };
const request: JobQuoteRequest = {
  job_type: 'ev_charger',
  address: 'Private customer address',
  suburb: 'Penrith',
  answers: {},
  notes: '',
  customer_name: 'Private name',
  customer_mobile: '0400000000',
  customer_email: '',
};
const response: JobQuoteOperation = {
  ok: true,
  status: 'completed',
  operationId,
  pinned: false,
  pinRequested: false,
  intakeId: 'intake1',
  quoteId: 'quote1',
  shareToken: 'private_capability',
  needsInspection: false,
};
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => values.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    values.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => {
    values.delete(key);
  });
});

it('writes a minimal durable pending receipt before dispatch and retains only owned quote ID after success', async () => {
  const send = jest.fn(async () => {
    expect(await loadDraftAttempt(scope)).toEqual({ status: 'pending', operationId });
    return response;
  });
  await expect(runGuardedJobDraft(scope, request, send)).resolves.toEqual(response);
  expect(await loadDraftAttempt(scope)).toMatchObject({
    status: 'succeeded',
    quoteId: 'quote1',
    operationId,
  });
  expect(send).toHaveBeenCalledWith({ ...request, operation_id: operationId });
  const persisted = [...values.values()].join('');
  for (const privateValue of ['Private', '0400000000', 'private_capability', 'intake1']) {
    expect(persisted).not.toContain(privateValue);
  }
  await expect(runGuardedJobDraft(scope, request, send)).rejects.toThrow(/previous draft/);
  expect(send).toHaveBeenCalledTimes(1);
  await beginAnotherJobDraft(scope);
  expect(await loadDraftAttempt(scope)).toBeNull();
});

it.each([
  new TypeError('Network lost after the server write'),
  new ApiSchemaError('/api/tenant/job-quote', []),
  new ApiError('failed', 502, '/x', { error: 'draft_failed', intakeId: 'intake1' }),
  new ApiError('failed', 500, '/x', { error: 'pipeline_failed' }),
])('retains an unknown fence through remount/login and never blindly retries %s', async error => {
  const send = jest.fn(async () => {
    throw error;
  });
  await expect(runGuardedJobDraft(scope, request, send)).rejects.toBe(error);
  expect(await loadDraftAttempt({ ...scope })).toEqual({ status: 'unknown', operationId });
  await expect(beginAnotherJobDraft(scope)).rejects.toThrow(/previous draft/);
  await expect(runGuardedJobDraft(scope, request, send)).rejects.toThrow(/previous draft/);
  expect(send).toHaveBeenCalledTimes(1);
  expect(await loadDraftAttempt({ userId: 'user_b', tenantId: 'tenant_b' })).toBeNull();
});

it('permits corrected fields only after a confirmed pre-write rejection', async () => {
  const failure = new ApiError('failed', 400, '/x', { error: 'invalid_body' });
  await expect(
    runGuardedJobDraft(scope, request, async () => {
      throw failure;
    }),
  ).rejects.toBe(failure);
  expect(await loadDraftAttempt(scope)).toBeNull();
  await expect(runGuardedJobDraft(scope, request, async () => response)).resolves.toEqual(response);
});

it('cannot dispatch if receipt storage fails or existing receipt is corrupt', async () => {
  const send = jest.fn(async () => response);
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('storage failed'));
  await expect(runGuardedJobDraft(scope, request, send)).rejects.toThrow('storage failed');
  values.set(attemptStorageKey(scope), '{');
  await expect(runGuardedJobDraft(scope, request, send)).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});

it('prevents simultaneous dispatches even before asynchronous storage finishes', async () => {
  let finish!: (result: JobQuoteOperation) => void;
  const send = jest.fn(
    () =>
      new Promise<JobQuoteOperation>(resolve => {
        finish = resolve;
      }),
  );
  const first = runGuardedJobDraft(scope, request, send);
  await expect(runGuardedJobDraft(scope, request, send)).rejects.toThrow(/previous draft/);
  await Promise.resolve();
  await Promise.resolve();
  finish(response);
  await first;
  expect(send).toHaveBeenCalledTimes(1);
});

it('restores a lost completed response by the original operation after remount without resubmitting private input', async () => {
  const send = jest.fn(async () => {
    throw new Error('lost response');
  });
  await expect(runGuardedJobDraft(scope, request, send)).rejects.toThrow('lost response');
  const read = jest.fn(async () => response);
  expect(await reconcileJobDraft({ ...scope }, read)).toMatchObject({
    status: 'succeeded',
    quoteId: 'quote1',
    operationId,
  });
  expect(read).toHaveBeenCalledWith(operationId);
  expect(send).toHaveBeenCalledTimes(1);
  await beginAnotherJobDraft(scope);
});

it('keeps saved availability paused until the full server completion is confirmed', async () => {
  const quoteId = 'eeeeeeee-1111-4111-8111-eeeeeeeeeeee';
  const available: JobQuoteOperation = { ...response, status: 'quote_available', quoteId };
  await runGuardedJobDraft(scope, request, async () => available);
  expect(await loadDraftAttempt(scope)).toMatchObject({ status: 'quote_available', quoteId });
  await expect(beginAnotherJobDraft(scope)).rejects.toThrow(/previous draft/);
  await reconcileJobDraft(scope, async () => ({ ...response, quoteId }));
  await beginAnotherJobDraft(scope);
});

it('only authoritative no-commit permits a fresh attempt; unknown, missing and mismatched status never unlock it', async () => {
  await runGuardedJobDraft(scope, request, async () => ({
    ok: true,
    operationId,
    status: 'unknown',
    pinned: false,
    pinRequested: false,
  }));
  await expect(
    reconcileJobDraft(scope, async () => {
      throw new ApiError('missing', 404, '/status', {});
    }),
  ).rejects.toThrow();
  await expect(
    reconcileJobDraft(scope, async () => ({
      ...response,
      operationId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    })),
  ).rejects.toThrow(/identity mismatch/);
  await expect(beginAnotherJobDraft(scope)).rejects.toThrow(/previous draft/);
  await reconcileJobDraft(scope, async () => ({
    ok: true,
    operationId,
    status: 'failed_no_commit',
    pinned: false,
    pinRequested: false,
  }));
  await beginAnotherJobDraft(scope);
  expect(await loadDraftAttempt(scope)).toBeNull();
});

it('retains pre-contract unknown receipts and never sends another account a status request', async () => {
  values.set(attemptStorageKey(scope), JSON.stringify({ status: 'unknown' }));
  const read = jest.fn(async () => response);
  expect(await reconcileJobDraft(scope, read)).toEqual({ status: 'unknown' });
  expect(await reconcileJobDraft({ userId: 'user_b', tenantId: 'tenant_b' }, read)).toBeNull();
  expect(read).not.toHaveBeenCalled();
});
