/**
 * Aircon recommender data layer — the three web calls at mobile scope:
 *
 * - POST /api/aircon/recommend  (JSON — form-only sizing)
 * - POST /api/aircon/plan       (multipart — floor-plan file + same JSON fields)
 * - POST /api/aircon/pdf        (JSON in, PDF bytes out → cache + share sheet)
 *
 * All three take the same Clerk bearer as /api/tenant/*. The PDF can't ride
 * downloadAndShare (that's GET-only via FileSystem.downloadAsync), so it
 * fetches the bytes, writes them to cache as base64, and opens the share
 * sheet — same landing as the Files tab's downloads.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { ApiError } from '@/lib/api';
import { apiUrl } from '@/lib/env';
import { appendFile, type PickedFile } from '@/lib/media';
import { useApiMutation } from '@/lib/useApi';

import {
  buildAirconPdfRequest,
  RecommendResponseSchema,
  type AirconResult,
  type RecommendRequest,
} from './schema';

/** The recommend route geocodes + reads Google Weather/Solar — well past the
 *  15s default on a slow day, and a client-side abort would retry a call that
 *  was about to succeed (jobquote precedent). */
const RECOMMEND_TIMEOUT_MS = 90000;
/** The plan route's vision read runs minutes (route maxDuration = 300). */
const PLAN_TIMEOUT_MS = 300000;
/** PDF route maxDuration = 60. */
const PDF_TIMEOUT_MS = 60000;

export function useAirconRecommend() {
  return useApiMutation<RecommendRequest, AirconResult>(
    '/api/aircon/recommend',
    RecommendResponseSchema,
    { timeoutMs: RECOMMEND_TIMEOUT_MS },
  );
}

export function useAirconPlan() {
  return useApiMutation<FormData, AirconResult>('/api/aircon/plan', RecommendResponseSchema, {
    timeoutMs: PLAN_TIMEOUT_MS,
  });
}

/** The plan route's multipart shape: `plan` file + `address`/`inputs` JSON. */
export function buildPlanForm(body: RecommendRequest, file: PickedFile): FormData {
  const form = new FormData();
  appendFile(form, 'plan', file);
  form.append('address', JSON.stringify(body.address));
  form.append('inputs', JSON.stringify(body.inputs));
  if (body.request_id) form.append('request_id', body.request_id);
  return form;
}

const PDF_PATH = '/api/aircon/pdf';
const PDF_FILENAME = 'aircon-recommendation.pdf';

/**
 * POST the server-owned recommendation id to /api/aircon/pdf and hand the
 * returned document to the OS share sheet. The server reloads tenant-owned
 * priced money; the caller never sends recommendation totals.
 * Throws ApiError on a non-2xx so callers get apiErrorMessage copy.
 */
export async function downloadAirconPdf({
  recommendationId,
  token,
}: {
  recommendationId: string;
  token?: string;
}): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);
  try {
    const response = await fetch(apiUrl(PDF_PATH), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(buildAirconPdfRequest(recommendationId)),
    });
    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => undefined);
      throw new ApiError(`POST ${PDF_PATH} failed`, response.status, PDF_PATH, errorBody);
    }
    const blob = await response.blob();

    // Blob → base64 via FileReader (RN's supported blob read path).
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Could not read the PDF data.'));
      reader.readAsDataURL(blob);
    });
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    if (!base64) throw new Error('The PDF came back empty. Try again.');

    const dir = FileSystem.cacheDirectory;
    if (!dir) throw new Error('No writable cache directory on this device.');
    const uri = dir + PDF_FILENAME;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: PDF_FILENAME });
  } finally {
    // Post-fetch the abort is a no-op, so the one clear point covers all paths.
    clearTimeout(timer);
  }
}
