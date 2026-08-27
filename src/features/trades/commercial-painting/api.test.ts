/**
 * Pure coverage for the commercial-painting pipeline: the upload/extract
 * state machine (multi-file happy path, failure mid-file, resume from server
 * state), the payload builders that feed sign/complete, and the run-id
 * persistence used to survive an app kill mid-pipeline.
 */
import type { PickedFile } from '@/lib/media';

import {
  buildCompleteBody,
  buildSignBody,
  initialPipeline,
  loadPersistedRunId,
  persistRunId,
  pipelineReducer,
  RUN_ID_STORAGE_KEY,
  zipUploads,
  type PipelineEvent,
  type PipelineState,
  type SignedTarget,
} from './api';

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

  it('marks a failure mid-file as resumable (the run already exists)', () => {
    const state = run([
      { type: 'SIGN_START', fileCount: 2 },
      { type: 'SIGNED', runId: 'run-1' },
      { type: 'FILE_PUT_OK' },
      { type: 'FAILED' },
    ]);
    expect(state).toMatchObject({
      step: 'failed',
      failedStage: 'upload',
      resumable: true,
      runId: 'run-1',
    });
  });

  it('marks a sign failure as NOT resumable (no run yet)', () => {
    const state = run([{ type: 'SIGN_START', fileCount: 2 }, { type: 'FAILED' }]);
    expect(state).toMatchObject({ step: 'failed', failedStage: 'sign', resumable: false });
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

  it('resumes a server-failed run as a resumable extract failure', () => {
    const state = run([{ type: 'RESUME', runId: 'run-9', status: 'failed' }]);
    expect(state).toMatchObject({
      step: 'failed',
      failedStage: 'extract',
      resumable: true,
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
