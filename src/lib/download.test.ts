import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError } from '@/lib/api';
import {
  DownloadCancelledError,
  DownloadUnavailableError,
  downloadAndShare,
  isCompatibleDownloadMime,
  sanitizeFilename,
  uniqueCacheFilename,
} from '@/lib/download';

// The download helper is exercised pure: the expo modules are mocked (no
// native FS in jest) and apiUrl is pinned so URL assertions don't depend on
// .env.local. babel-jest hoists these above the imports.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  createDownloadResumable: jest.fn(),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://quotemax.test${path}` }));

const createDownloadResumable = jest.mocked(FileSystem.createDownloadResumable);
const deleteAsync = jest.mocked(FileSystem.deleteAsync);
const isAvailableAsync = jest.mocked(Sharing.isAvailableAsync);
const shareAsync = jest.mocked(Sharing.shareAsync);

function ok(uri: string) {
  return { uri, status: 200, headers: { 'content-type': 'application/pdf' }, mimeType: 'application/pdf' };
}

const cancelAsync = jest.fn().mockResolvedValue(undefined);
const downloadAsync = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  isAvailableAsync.mockResolvedValue(true);
  createDownloadResumable.mockReturnValue({ downloadAsync, cancelAsync } as never);
});

describe('sanitizeFilename', () => {
  it('strips path separators and traversal, never yielding a hidden file', () => {
    const name = sanitizeFilename('../../etc/passwd');
    expect(name).not.toMatch(/[\\/]/);
    expect(name.startsWith('.')).toBe(false);
    expect(name).toContain('passwd');
  });

  it('replaces characters illegal on iOS/Android', () => {
    expect(sanitizeFilename('inv:oi*ce?.pdf')).toBe('inv_oi_ce_.pdf');
  });

  it('collapses whitespace', () => {
    expect(sanitizeFilename('my   quote \t final.pdf')).toBe('my quote final.pdf');
  });

  it('leaves a plain extension-less name alone', () => {
    expect(sanitizeFilename('quote 42')).toBe('quote 42');
  });

  it('falls back when nothing survives', () => {
    expect(sanitizeFilename('...')).toBe('document');
    expect(sanitizeFilename('   ')).toBe('document');
  });

  it('caps long names without losing the extension', () => {
    const name = sanitizeFilename(`${'a'.repeat(120)}.pdf`);
    expect(name.length).toBeLessThanOrEqual(80);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});

describe('downloadAndShare', () => {
  const args = {
    path: '/api/tenant/files/abc/download',
    filename: 'Quote 42.pdf',
    mimeType: 'application/pdf',
    token: 'tok-1',
  };

  it('downloads from the API base with the Bearer header, then shares', async () => {
    downloadAsync.mockResolvedValue(ok('file:///cache/Quote 42.pdf'));
    await downloadAndShare(args);
    expect(createDownloadResumable).toHaveBeenCalledWith(
      'https://quotemax.test/api/tenant/files/abc/download',
      expect.stringMatching(/^file:\/\/\/cache\/Quote 42-[a-z0-9-]+\.pdf$/),
      { headers: { Authorization: 'Bearer tok-1' } },
      expect.any(Function),
    );
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/Quote 42.pdf', {
      mimeType: 'application/pdf',
      dialogTitle: 'Quote 42.pdf',
    });
  });

  it('sanitizes the filename before it becomes a cache path', async () => {
    downloadAsync.mockResolvedValue(ok('file:///cache/bad_.._name.pdf'));
    await downloadAndShare({ ...args, filename: 'bad/../name.pdf' });
    expect(createDownloadResumable).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^file:\/\/\/cache\/bad_\.\._name-[a-z0-9-]+\.pdf$/),
      expect.anything(),
      expect.any(Function),
    );
  });

  it('sends no Authorization header without a token', async () => {
    downloadAsync.mockResolvedValue(ok('file:///cache/Quote 42.pdf'));
    await downloadAndShare({ ...args, token: undefined });
    expect(createDownloadResumable).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { headers: {} },
      expect.any(Function),
    );
  });

  it('throws ApiError on a non-2xx status and bins the error body, never sharing it', async () => {
    downloadAsync.mockResolvedValue({ ...ok('file:///cache/Quote 42.pdf'), status: 404 });
    await expect(downloadAndShare(args)).rejects.toMatchObject({ status: 404 });
    await expect(downloadAndShare(args)).rejects.toBeInstanceOf(ApiError);
    expect(deleteAsync).toHaveBeenCalledWith(expect.stringContaining('file:///cache/Quote 42-'), {
      idempotent: true,
    });
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it('rejects an HTML or JSON error body even when the status is 200', async () => {
    downloadAsync.mockResolvedValue({
      ...ok('file:///cache/Quote.pdf'),
      mimeType: 'text/html',
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    await expect(downloadAndShare(args)).rejects.toBeInstanceOf(DownloadUnavailableError);
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it('fails honestly when the device has no share or save destination', async () => {
    downloadAsync.mockResolvedValue(ok('file:///cache/Quote.pdf'));
    isAvailableAsync.mockResolvedValue(false);
    await expect(downloadAndShare(args)).rejects.toBeInstanceOf(DownloadUnavailableError);
  });

  it('cancels a stalled download at the timeout and removes the partial file', async () => {
    downloadAsync.mockImplementation(
      () => new Promise((_resolve, reject) => cancelAsync.mockImplementation(() => {
        reject(new Error('cancelled'));
        return Promise.resolve();
      })),
    );
    await expect(downloadAndShare({ ...args, timeoutMs: 1 })).rejects.toEqual(
      new DownloadCancelledError('timeout'),
    );
    expect(cancelAsync).toHaveBeenCalled();
    expect(deleteAsync).toHaveBeenCalled();
  });

  it('uses collision-safe cache names without losing the extension', () => {
    const first = uniqueCacheFilename('Quote.pdf', 123);
    const second = uniqueCacheFilename('Quote.pdf', 123);
    expect(first).not.toBe(second);
    expect(first.endsWith('.pdf')).toBe(true);
    expect(second.length).toBeLessThanOrEqual(80);
  });
});

describe('download MIME validation', () => {
  it('accepts exact, wildcard and explicit binary response types only', () => {
    expect(isCompatibleDownloadMime('application/pdf', 'application/pdf')).toBe(true);
    expect(isCompatibleDownloadMime('image/*', 'image/png')).toBe(true);
    expect(isCompatibleDownloadMime('application/pdf', 'application/octet-stream')).toBe(true);
    expect(isCompatibleDownloadMime('application/pdf', 'text/html')).toBe(false);
    expect(isCompatibleDownloadMime('application/pdf', null)).toBe(false);
  });
});
