import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError } from '@/lib/api';
import { downloadAndShare, sanitizeFilename } from '@/lib/download';

// The download helper is exercised pure: the expo modules are mocked (no
// native FS in jest) and apiUrl is pinned so URL assertions don't depend on
// .env.local. babel-jest hoists these above the imports.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://quotemax.test${path}` }));

const downloadAsync = jest.mocked(FileSystem.downloadAsync);
const deleteAsync = jest.mocked(FileSystem.deleteAsync);
const shareAsync = jest.mocked(Sharing.shareAsync);

function ok(uri: string) {
  return { uri, status: 200, headers: {}, mimeType: null };
}

beforeEach(() => {
  jest.clearAllMocks();
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
    expect(downloadAsync).toHaveBeenCalledWith(
      'https://quotemax.test/api/tenant/files/abc/download',
      'file:///cache/Quote 42.pdf',
      { headers: { Authorization: 'Bearer tok-1' } },
    );
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/Quote 42.pdf', {
      mimeType: 'application/pdf',
      dialogTitle: 'Quote 42.pdf',
    });
  });

  it('sanitizes the filename before it becomes a cache path', async () => {
    downloadAsync.mockResolvedValue(ok('file:///cache/bad_.._name.pdf'));
    await downloadAndShare({ ...args, filename: 'bad/../name.pdf' });
    expect(downloadAsync).toHaveBeenCalledWith(
      expect.any(String),
      'file:///cache/bad_.._name.pdf',
      expect.anything(),
    );
  });

  it('sends no Authorization header without a token', async () => {
    downloadAsync.mockResolvedValue(ok('file:///cache/Quote 42.pdf'));
    await downloadAndShare({ ...args, token: undefined });
    expect(downloadAsync).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      headers: {},
    });
  });

  it('throws ApiError on a non-2xx status and bins the error body, never sharing it', async () => {
    downloadAsync.mockResolvedValue({ ...ok('file:///cache/Quote 42.pdf'), status: 404 });
    await expect(downloadAndShare(args)).rejects.toMatchObject({ status: 404 });
    await expect(downloadAndShare(args)).rejects.toBeInstanceOf(ApiError);
    expect(deleteAsync).toHaveBeenCalledWith('file:///cache/Quote 42.pdf', { idempotent: true });
    expect(shareAsync).not.toHaveBeenCalled();
  });
});
