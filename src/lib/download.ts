/**
 * Bearer-authed file download → native share sheet.
 *
 * Tenant document bytes (`/api/tenant/files/[id]/download`) require an
 * Authorization header, which `Linking`/the system browser cannot attach — so
 * the file lands in the app's cache first, then hands off to the OS share
 * sheet (Save to Files, Drive, mail, print).
 *
 * SDK 54: `expo-file-system`'s default export is the new File/Directory API;
 * the classic `downloadAsync` with a headers map lives under `/legacy`, which
 * is exactly what a one-shot authed byte fetch needs.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError } from '@/lib/api';
import { apiUrl } from '@/lib/env';

/** Comfortably under every platform's ~255-byte filename cap, share-sheet titles included. */
const MAX_FILENAME = 80;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
let downloadSequence = 0;

export class DownloadUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadUnavailableError';
  }
}

export class DownloadCancelledError extends Error {
  constructor(readonly reason: 'cancelled' | 'timeout') {
    super(reason === 'timeout' ? 'The download timed out.' : 'The download was cancelled.');
    this.name = 'DownloadCancelledError';
  }
}

/**
 * A display_name is tenant-entered text, not a safe path segment. Strip path
 * separators and anything iOS/Android reject (same allowlist the download
 * route uses for Content-Disposition), collapse whitespace, refuse hidden-file
 * leading dots, and cap the length without losing the extension.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    // Whitespace collapses BEFORE the allowlist, so a tab becomes a space, not '_'.
    .replace(/\s+/g, ' ')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/^[. ]+/, '')
    .trim();
  if (!cleaned) return 'document';
  if (cleaned.length <= MAX_FILENAME) return cleaned;
  const dot = cleaned.lastIndexOf('.');
  const ext = dot > 0 ? cleaned.slice(dot) : '';
  return cleaned.slice(0, Math.max(1, MAX_FILENAME - ext.length)).trimEnd() + ext;
}

/** Unique cache path while retaining the extension used by native share sheets. */
export function uniqueCacheFilename(name: string, nonce = Date.now()): string {
  const safeName = sanitizeFilename(name);
  const dot = safeName.lastIndexOf('.');
  const extension = dot > 0 ? safeName.slice(dot) : '';
  const stem = dot > 0 ? safeName.slice(0, dot) : safeName;
  downloadSequence = (downloadSequence + 1) % 1_000_000;
  const suffix = `-${nonce.toString(36)}-${downloadSequence.toString(36)}`;
  const maxStem = Math.max(1, MAX_FILENAME - extension.length - suffix.length);
  return `${stem.slice(0, maxStem).trimEnd()}${suffix}${extension}`;
}

function responseContentType(result: FileSystem.FileSystemDownloadResult): string | null {
  const direct = result.mimeType?.split(';', 1)[0]?.trim().toLowerCase();
  if (direct) return direct;
  const entry = Object.entries(result.headers ?? {}).find(
    ([key]) => key.toLowerCase() === 'content-type',
  );
  return entry?.[1]?.split(';', 1)[0]?.trim().toLowerCase() ?? null;
}

export function isCompatibleDownloadMime(expected: string, actual: string | null): boolean {
  if (!actual) return false;
  const wanted = expected.split(';', 1)[0]?.trim().toLowerCase();
  if (!wanted) return false;
  if (actual === wanted) return true;
  if (actual === 'application/octet-stream') return true;
  return wanted.endsWith('/*') && actual.startsWith(wanted.slice(0, -1));
}

/**
 * Download `path` with the tradie's Bearer token and open the share sheet on
 * the result. Throws `ApiError` on a non-2xx status — the legacy
 * `downloadAsync` happily resolves after writing an error page to disk, so the
 * status must be checked here for callers to get `apiErrorMessage` copy.
 */
export async function downloadAndShare({
  path,
  filename,
  mimeType,
  token,
  signal,
  timeoutMs = DEFAULT_DOWNLOAD_TIMEOUT_MS,
  onProgress,
}: {
  path: string;
  filename: string;
  /** Android share-sheet routing; iOS infers from the extension. */
  mimeType: string;
  token?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (fraction: number | null) => void;
}): Promise<void> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error('No writable cache directory on this device.');
  const safeName = sanitizeFilename(filename);
  const uri = dir + uniqueCacheFilename(safeName);
  const task = FileSystem.createDownloadResumable(
    apiUrl(path),
    uri,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    progress => {
      const total = progress.totalBytesExpectedToWrite;
      onProgress?.(total > 0 ? Math.min(1, progress.totalBytesWritten / total) : null);
    },
  );

  let cancellation: 'cancelled' | 'timeout' | null = null;
  const cancel = (reason: 'cancelled' | 'timeout') => {
    cancellation ??= reason;
    void task.cancelAsync().catch(() => undefined);
  };
  const onAbort = () => cancel('cancelled');
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => cancel('timeout'), timeoutMs);

  try {
    const result = await task.downloadAsync();
    if (cancellation || !result) throw new DownloadCancelledError(cancellation ?? 'cancelled');
    if (result.status < 200 || result.status >= 300) {
      throw new ApiError(`GET ${path} failed`, result.status, path);
    }
    const actualMime = responseContentType(result);
    if (!isCompatibleDownloadMime(mimeType, actualMime)) {
      throw new DownloadUnavailableError(
        `QuoteMax returned ${actualMime ?? 'an unknown file type'} instead of ${mimeType}.`,
      );
    }
    if (!(await Sharing.isAvailableAsync())) {
      throw new DownloadUnavailableError('No native share or save destination is available.');
    }
    await Sharing.shareAsync(result.uri, { mimeType, dialogTitle: safeName });
  } catch (error) {
    if (cancellation && !(error instanceof DownloadCancelledError)) {
      throw new DownloadCancelledError(cancellation);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    // A shared copy belongs to the destination app; the authenticated cache
    // copy is temporary and must not survive account switches or collisions.
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }
}
