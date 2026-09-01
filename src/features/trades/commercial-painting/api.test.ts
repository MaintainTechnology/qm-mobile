/**
 * Pure coverage for the commercial-painting pipeline: the upload/extract
 * state machine (multi-file happy path, failure mid-file, resume from server
 * state), the payload builders that feed sign/complete, and the run-id
 * persistence used to survive an app kill mid-pipeline.
 */
import * as FileSystem from 'expo-file-system/legacy';

import type { PickedFile } from '@/lib/media';
import { ApiError } from '@/lib/api';

import {
  buildCompleteBody,
  buildSignBody,
  canSavePaintQuote,
  classifyPaintPricingBlock,
  COMMERCIAL_PAINT_DOCUMENT_POLICY,
  initialPipeline,
  loadPersistedRunId,
  persistRunId,
  pipelineReducer,
  putSignedFile,
  RUN_ID_STORAGE_KEY,
  signedUploadResponseProblem,
  zipUploads,
  type PipelineEvent,
  type PipelineState,
  type SignedTarget,
} from './api';

jest.mock('expo-file-system/legacy', () => ({ uploadAsync: jest.fn() }));
const fileSystem = jest.mocked(FileSystem);

describe('commercial painting document upload contract', () => {
  it('pins the sign metadata field, formats, 32 MB cap and 12-file limit', () => {
    expect(COMMERCIAL_PAINT_DOCUMENT_POLICY).toEqual({
      purpose: 'painting document',
      field: 'files',
      allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
      allowedTypeLabel: 'a PDF, PNG, JPEG or WebP file',
      maxBytes: 32 * 1024 * 1024,
      maxFiles: 12,
    });
  });

  it('discriminates expired signed targets, confirmed rejection and ambiguous server failure', () => {
    expect(signedUploadResponseProblem(201, '', 'plan.pdf')).toBeNull();
    expect(signedUploadResponseProblem(403, 'expired token', 'plan.pdf')).toMatchObject({
      kind: 'signed_target_expired',
      status: 403,
    });
    expect(signedUploadResponseProblem(415, 'unsupported', 'plan.pdf')).toMatchObject({
      kind: 'rejected',
      status: 415,
    });
    expect(signedUploadResponseProblem(503, 'unavailable', 'plan.pdf')).toMatchObject({
      kind: 'unknown_outcome',
      status: 503,
    });
  });

  it('uploads raw bytes with the declared MIME and surfaces signed-target/network discriminators', async () => {
    const file: PickedFile = {
      uri: 'file:///tmp/plan.pdf',
      name: 'plan.pdf',
      type: 'application/pdf',
      size: 100,
    };
    fileSystem.uploadAsync.mockResolvedValueOnce({ status: 201, body: '' } as never);
    await expect(putSignedFile('https://storage.example/signed', file)).resolves.toBeUndefined();
    expect(fileSystem.uploadAsync).toHaveBeenCalledWith(
      'https://storage.example/signed',
      file.uri,
      {
        httpMethod: 'PUT',
        headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
      },
    );

    fileSystem.uploadAsync.mockResolvedValueOnce({ status: 403, body: 'expired token' } as never);
    await expect(putSignedFile('https://storage.example/expired', file)).rejects.toMatchObject({
      kind: 'signed_target_expired',
      status: 403,
    });
    fileSystem.uploadAsync.mockRejectedValueOnce(new Error('Network connection lost'));
    await expect(putSignedFile('https://storage.example/offline', file)).rejects.toMatchObject({
      kind: 'network',
    });
  });
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

function run(events: PipelineEvent[], from: PipelineState = initialPipeline): PipelineState {
  return events.reduce(pipelineReducer, from);
}

const pdf = (name: string, size = 1024): PickedFile => ({
  uri: `file:///tmp/${name}`,
  name,
  type: 'application/pdf',
  size,
});

const target = (uploadId: string, filename: string): SignedTarget => ({
  uploadId,
  filename,
  signedUrl: `https://storage.example/${uploadId}`,
});

describe('pipelineReducer', () => {
  it('walks the multi-file happy path end to end', () => {
    let state = run([{ type: 'SIGN_START', fileCount: 3 }]);
    expect(state.step).toBe('signing');

    state = run([{ type: 'SIGNED', runId: 'run-1' }], state);
    expect(state).toMatchObject({ step: 'uploading', runId: 'run-1', fileIdx: 0, fileCount: 3 });

    state = run([{ type: 'FILE_PUT_OK' }], state);
    expect(state).toMatchObject({ step: 'uploading', fileIdx: 1 });
    state = run([{ type: 'FILE_PUT_OK' }], state);
    expect(state).toMatchObject({ step: 'uploading', fileIdx: 2 });

    // The last PUT tips the machine into completing.
    state = run([{ type: 'FILE_PUT_OK' }], state);
    expect(state.step).toBe('completing');

    state = run(
      [
        { type: 'COMPLETED' },
        { type: 'EXTRACT_START', runId: 'run-1' },
        { type: 'EXTRACTED' },
        { type: 'PRICED' },
        { type: 'SAVED' },
      ],
      state,
    );
    expect(state).toMatchObject({ step: 'saved', runId: 'run-1', failedStage: null });
  });

  it('retains server run context after a mid-file failure without claiming byte resume', () => {
    const state = run([
      { type: 'SIGN_START', fileCount: 2 },
      { type: 'SIGNED', runId: 'run-1' },
      { type: 'FILE_PUT_OK' },
      { type: 'FAILED' },
    ]);
    expect(state).toMatchObject({
      step: 'failed',
      failedStage: 'upload',
      runRecoverable: true,
      runId: 'run-1',
    });
  });

  it('has no recoverable run context when signing failed before returning a run', () => {
    const state = run([{ type: 'SIGN_START', fileCount: 2 }, { type: 'FAILED' }]);
    expect(state).toMatchObject({ step: 'failed', failedStage: 'sign', runRecoverable: false });
  });

  it('ignores FAILED outside a tracked stage (price/save errors keep their step)', () => {
    const priced = run([
      { type: 'SIGN_START', fileCount: 1 },
      { type: 'SIGNED', runId: 'run-1' },
      { type: 'FILE_PUT_OK' },
      { type: 'COMPLETED' },
      { type: 'EXTRACT_START', runId: 'run-1' },
      { type: 'EXTRACTED' },
      { type: 'PRICED' },
    ]);
    expect(run([{ type: 'FAILED' }], priced)).toBe(priced);
  });

  it('resumes each server status onto the right step', () => {
    const cases: [string, string][] = [
      ['draft', 'classified'],
      ['extracting', 'extracting'],
      ['ready', 'review'],
      ['priced', 'priced'],
    ];
    for (const [status, step] of cases) {
      const state = run([{ type: 'RESUME', runId: 'run-9', status }]);
      expect(state).toMatchObject({ step, runId: 'run-9' });
    }
  });

  it('reopens a server-failed run with recoverable run context', () => {
    const state = run([{ type: 'RESUME', runId: 'run-9', status: 'failed' }]);
    expect(state).toMatchObject({
      step: 'failed',
      failedStage: 'extract',
      runRecoverable: true,
      runId: 'run-9',
    });
  });

  it('never lets a RESUME stomp a mid-flight upload or the saved step', () => {
    const uploading = run([
      { type: 'SIGN_START', fileCount: 2 },
      { type: 'SIGNED', runId: 'run-1' },
    ]);
    expect(run([{ type: 'RESUME', runId: 'run-1', status: 'draft' }], uploading)).toBe(uploading);

    const saved = run(
      [
        { type: 'COMPLETED' },
        { type: 'EXTRACT_START', runId: 'run-1' },
        { type: 'EXTRACTED' },
        { type: 'PRICED' },
        { type: 'SAVED' },
      ],
      { ...uploading, step: 'completing' },
    );
    expect(saved.step).toBe('saved');
    // The server still says 'priced' after a save — that must not downgrade.
    expect(run([{ type: 'RESUME', runId: 'run-1', status: 'priced' }], saved)).toBe(saved);
  });

  it('RESET returns to the initial state', () => {
    const state = run([
      { type: 'SIGN_START', fileCount: 1 },
      { type: 'SIGNED', runId: 'run-1' },
      { type: 'RESET' },
    ]);
    expect(state).toEqual(initialPipeline);
  });
});

describe('buildSignBody', () => {
  it('maps files and trims/omits optional fields', () => {
    expect(
      buildSignBody([pdf('plans.pdf', 5000)], {
        jobName: '  IGA fit-out  ',
        siteAddress: '   ',
        runId: null,
      }),
    ).toEqual({
      files: [{ name: 'plans.pdf', size: 5000, type: 'application/pdf' }],
      job_name: 'IGA fit-out',
    });
  });

  it('carries the existing run id for the append/retry path', () => {
    expect(buildSignBody([pdf('a.pdf')], { runId: 'run-1' })).toMatchObject({
      paint_run_id: 'run-1',
    });
  });

  it('sends size 0 when the picker reported none (server re-checks bytes)', () => {
    const file: PickedFile = { uri: 'file:///x', name: 'x.pdf', type: 'application/pdf' };
    expect(buildSignBody([file]).files).toEqual([
      { name: 'x.pdf', size: 0, type: 'application/pdf' },
    ]);
  });
});

describe('zipUploads + buildCompleteBody', () => {
  it('pairs files with slots by index and builds the complete payload', () => {
    const files = [pdf('plans.pdf', 100), pdf('measure.pdf', 200)];
    const targets = [target('u1', 'plans.pdf'), target('u2', 'measure.pdf')];
    const pairs = zipUploads(files, targets);
    expect(buildCompleteBody('run-1', pairs)).toEqual({
      paintRunId: 'run-1',
      files: [
        { uploadId: 'u1', name: 'plans.pdf', size: 100, type: 'application/pdf' },
        { uploadId: 'u2', name: 'measure.pdf', size: 200, type: 'application/pdf' },
      ],
    });
  });

  it('throws on a slot-count mismatch instead of uploading to the wrong slot', () => {
    expect(() => zipUploads([pdf('a.pdf'), pdf('b.pdf')], [target('u1', 'a.pdf')])).toThrow(
      /upload slots/,
    );
  });
});

describe('run-id persistence', () => {
  it('round-trips and clears the persisted run id', async () => {
    await persistRunId('run-42');
    expect(await loadPersistedRunId()).toBe('run-42');
    await persistRunId(null);
    expect(await loadPersistedRunId()).toBeNull();
  });

  it('uses the agreed storage key', () => {
    expect(RUN_ID_STORAGE_KEY).toBe('quotemax.cpaint.run-id');
  });
});

describe('commercial-paint pricing authority', () => {
  const matchedBom = { unmatched: [], lines: [{}] } as never;

  it('classifies the two stable server authority codes', () => {
    expect(
      classifyPaintPricingBlock(
        new ApiError('blocked', 422, '/price', { error: 'inspection_required' }),
      ),
    ).toBe('inspection_required');
    expect(
      classifyPaintPricingBlock(
        new ApiError('blocked', 422, '/price', { error: 'tenant_pricing_required' }),
      ),
    ).toBe('tenant_pricing_required');
    expect(classifyPaintPricingBlock(new Error('offline'))).toBeNull();
  });

  it('only enables quote save for a matched, authority-approved BOM', () => {
    expect(canSavePaintQuote(matchedBom, null)).toBe(true);
    expect(canSavePaintQuote(null, null)).toBe(false);
    expect(canSavePaintQuote({ unmatched: [{ surface: 'wall' }] } as never, null)).toBe(false);
    expect(canSavePaintQuote(matchedBom, 'inspection_required')).toBe(false);
    expect(canSavePaintQuote(matchedBom, 'tenant_pricing_required')).toBe(false);
  });
});
