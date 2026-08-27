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
}: {
  path: string;
  filename: string;
  /** Android share-sheet routing; iOS infers from the extension. */
  mimeType: string;
  token?: string;
}): Promise<void> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error('No writable cache directory on this device.');
  const safeName = sanitizeFilename(filename);
  const result = await FileSystem.downloadAsync(apiUrl(path), dir + safeName, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status < 200 || result.status >= 300) {
    // The body on disk is a JSON error envelope, not the document — bin it.
    await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => undefined);
    throw new ApiError(`GET ${path} failed`, result.status, path);
  }
  await Sharing.shareAsync(result.uri, { mimeType, dialogTitle: safeName });
}
