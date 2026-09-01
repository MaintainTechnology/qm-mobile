/**
 * Shared native intake boundary for multipart uploads.
 *
 * A policy keeps the server contract (purpose, multipart field, MIME allowlist,
 * byte cap and multiplicity) next to every picker. Picker outcomes stay
 * discriminated so a cancelled system sheet is never reported as a denied
 * permission or a successful upload. The server remains authoritative for
 * content validation and size checks, especially when a platform omits size.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { ApiError, apiErrorMessage } from '@/lib/api';

export type PickedFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  /** Image metadata only; portrait/rotated dimensions remain valid. */
  width?: number;
  height?: number;
};

export type UploadPolicy<Field extends string = string> = Readonly<{
  purpose: string;
  field: Field;
  allowedMimeTypes: readonly string[];
  allowedTypeLabel: string;
  maxBytes: number;
  maxFiles: number;
}>;

export type UploadFileProblem = Readonly<{
  code: 'no_file' | 'too_many' | 'corrupt' | 'unsupported_type' | 'too_large';
  message: string;
  fileName?: string;
}>;

export type UploadFileCheck =
  Readonly<{ ok: true; sizeKnown: boolean }> | Readonly<{ ok: false; problem: UploadFileProblem }>;

function normaliseMime(type: string): string {
  return type.split(';')[0]?.trim().toLowerCase() ?? '';
}

function megabytes(bytes: number): string {
  return `${Math.max(1, Math.floor(bytes / (1024 * 1024)))} MB`;
}

/**
 * Fast client guard only. A URI and declared MIME are not proof of valid image
 * bytes, so every endpoint must repeat these checks and inspect content.
 */
export function validateUploadFile(file: PickedFile, policy: UploadPolicy): UploadFileCheck {
  const name = file.name.trim();
  if (!file.uri.trim() || !name) {
    return {
      ok: false,
      problem: {
        code: 'corrupt',
        message: `That ${policy.purpose} could not be read. Choose the original file again.`,
        fileName: name || undefined,
      },
    };
  }

  const mime = normaliseMime(file.type);
  const allowed = policy.allowedMimeTypes.some(type => normaliseMime(type) === mime);
  if (!mime || !allowed) {
    return {
      ok: false,
      problem: {
        code: 'unsupported_type',
        message: `${name} is not a supported ${policy.purpose}. Choose ${policy.allowedTypeLabel}.`,
        fileName: name,
      },
    };
  }

  if (file.size !== undefined && (!Number.isFinite(file.size) || file.size <= 0)) {
    return {
      ok: false,
      problem: {
        code: 'corrupt',
        message: `${name} appears empty or unreadable. Choose the original file again.`,
        fileName: name,
      },
    };
  }

  if (
    (file.width !== undefined && (!Number.isFinite(file.width) || file.width <= 0)) ||
    (file.height !== undefined && (!Number.isFinite(file.height) || file.height <= 0))
  ) {
    return {
      ok: false,
      problem: {
        code: 'corrupt',
        message: `${name} has invalid image dimensions. Choose the original file again.`,
        fileName: name,
      },
    };
  }

  if (file.size !== undefined && file.size > policy.maxBytes) {
    return {
      ok: false,
      problem: {
        code: 'too_large',
        message: `${name} is larger than the ${megabytes(policy.maxBytes)} limit. Choose a smaller file.`,
        fileName: name,
      },
    };
  }

  return { ok: true, sizeKnown: file.size !== undefined };
}

/** Keep RN's non-DOM multipart descriptor cast in one shared boundary. */
export function appendFile(form: FormData, field: string, file: PickedFile): void {
  form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
}

export type AppendUploadResult =
  | Readonly<{ ok: true; unknownSizeCount: number }>
  | Readonly<{ ok: false; problem: UploadFileProblem }>;

/** Validate the complete selection before appending any part. */
export function appendUploadFiles(
  form: FormData,
  policy: UploadPolicy,
  files: readonly PickedFile[],
): AppendUploadResult {
  if (files.length === 0) {
    return {
      ok: false,
      problem: { code: 'no_file', message: `Choose a ${policy.purpose} first.` },
    };
  }
  if (files.length > policy.maxFiles) {
    return {
      ok: false,
      problem: {
        code: 'too_many',
        message: `Choose no more than ${policy.maxFiles} ${policy.purpose}${policy.maxFiles === 1 ? '' : 's'}.`,
      },
    };
  }

  let unknownSizeCount = 0;
  for (const file of files) {
    const check = validateUploadFile(file, policy);
    if (!check.ok) return check;
    if (!check.sizeKnown) unknownSizeCount += 1;
  }
  for (const file of files) appendFile(form, policy.field, file);
  return { ok: true, unknownSizeCount };
}

export type PhotoLibraryAccess = 'all' | 'limited' | 'none' | 'unknown';

export type UploadPickResult =
  | Readonly<{
      kind: 'selected';
      files: readonly [PickedFile, ...PickedFile[]];
      libraryAccess: PhotoLibraryAccess;
      hasUnknownSize: boolean;
    }>
  | Readonly<{ kind: 'cancelled' }>
  | Readonly<{ kind: 'denied'; canAskAgain: boolean; message: string }>
  | Readonly<{ kind: 'rejected'; problem: UploadFileProblem }>
  | Readonly<{ kind: 'failed'; message: string }>;

function imageName(asset: ImagePicker.ImagePickerAsset, index: number): string {
  const supplied = asset.fileName?.trim();
  if (supplied) return supplied;
  const uriName = asset.uri.split(/[\\/]/).pop()?.split('?')[0]?.trim();
  return uriName || `photo-${Date.now()}-${index + 1}`;
}

function imageFile(asset: ImagePicker.ImagePickerAsset, index: number): PickedFile {
  return {
    uri: asset.uri,
    name: imageName(asset, index),
    // Missing MIME stays unknown. Guessing JPEG can relabel HEIC/other bytes.
    type: asset.mimeType ?? '',
    size: asset.fileSize ?? undefined,
    width: asset.width,
    height: asset.height,
  };
}

function documentFile(asset: DocumentPicker.DocumentPickerAsset): PickedFile {
  return {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType ?? '',
    size: asset.size,
  };
}

function checkedSelection(
  files: readonly PickedFile[],
  policy: UploadPolicy,
  libraryAccess: PhotoLibraryAccess,
): UploadPickResult {
  if (files.length === 0) {
    return {
      kind: 'rejected',
      problem: {
        code: 'corrupt',
        message: `That ${policy.purpose} could not be read. Choose it again.`,
      },
    };
  }
  if (files.length > policy.maxFiles) {
    return {
      kind: 'rejected',
      problem: {
        code: 'too_many',
        message: `Choose no more than ${policy.maxFiles} ${policy.purpose}${policy.maxFiles === 1 ? '' : 's'}.`,
      },
    };
  }
  let hasUnknownSize = false;
  for (const file of files) {
    const check = validateUploadFile(file, policy);
    if (!check.ok) return { kind: 'rejected', problem: check.problem };
    if (!check.sizeKnown) hasUnknownSize = true;
  }
  return {
    kind: 'selected',
    files: files as [PickedFile, ...PickedFile[]],
    libraryAccess,
    hasUnknownSize,
  };
}

async function currentLibraryAccess(): Promise<PhotoLibraryAccess> {
  try {
    const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (permission.accessPrivileges) return permission.accessPrivileges;
    return permission.granted ? 'all' : 'none';
  } catch {
    // The SDK 54 system library picker can still be opened without broad
    // library permission, so a failed permission probe must not block it.
    return 'unknown';
  }
}

/** Pick one or more images and retain cancel/permission/validation outcomes. */
export async function pickImageForUpload(
  source: 'camera' | 'library',
  policy: UploadPolicy,
): Promise<UploadPickResult> {
  let libraryAccess: PhotoLibraryAccess = 'unknown';
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return {
          kind: 'denied',
          canAskAgain: permission.canAskAgain,
          message: permission.canAskAgain
            ? 'Camera access was not allowed. You can choose a photo instead.'
            : 'Camera access is off. Allow it in Settings, or choose a photo instead.',
        };
      }
    } else {
      libraryAccess = await currentLibraryAccess();
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      ...(source === 'library' && policy.maxFiles > 1
        ? { allowsMultipleSelection: true, selectionLimit: policy.maxFiles }
        : {}),
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return { kind: 'cancelled' };
    return checkedSelection(result.assets.map(imageFile), policy, libraryAccess);
  } catch {
    if (source === 'library' && libraryAccess === 'none') {
      return {
        kind: 'denied',
        canAskAgain: false,
        message: 'Photo access is off. Allow it in Settings, or take a new photo instead.',
      };
    }
    return {
      kind: 'failed',
      message: `The ${source === 'camera' ? 'camera' : 'photo picker'} did not open. Try again.`,
    };
  }
}

/** Pick documents with SDK 54's cache copy so FormData can read them immediately. */
export async function pickDocumentForUpload(policy: UploadPolicy): Promise<UploadPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...policy.allowedMimeTypes],
      copyToCacheDirectory: true,
      multiple: policy.maxFiles > 1,
      base64: false,
    });
    if (result.canceled) return { kind: 'cancelled' };
    return checkedSelection(result.assets.map(documentFile), policy, 'unknown');
  } catch {
    return { kind: 'failed', message: 'The file picker did not open. Try again.' };
  }
}

export function uploadSelectionNote(result: UploadPickResult): string | null {
  if (result.kind !== 'selected') return null;
  const notes: string[] = [];
  if (result.libraryAccess === 'limited') {
    notes.push('Photo access is limited to the items you selected.');
  }
  if (result.hasUnknownSize) {
    notes.push('QuoteMax will verify the file size before accepting the upload.');
  }
  return notes.length > 0 ? notes.join(' ') : null;
}

export type UploadFailureNotice = Readonly<{
  kind: 'network' | 'unknown_outcome' | 'signed_target_expired' | 'rejected' | 'auth' | 'server';
  message: string;
  retry: 'restart' | 'check_first' | 'refresh_target';
}>;

type UploadFailureOptions = Readonly<{ canReconcile?: boolean }>;

/** Structured failure from a direct/signed upload transport. */
export class UploadTransferError extends Error {
  constructor(
    readonly kind: 'network' | 'unknown_outcome' | 'signed_target_expired' | 'rejected',
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UploadTransferError';
  }
}

function apiErrorCode(error: ApiError): string {
  const body = (error.body ?? {}) as { error?: unknown; code?: unknown };
  const value = typeof body.error === 'string' ? body.error : body.code;
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Map upload failures without claiming resumability or replay safety. Abort is
 * an unknown outcome: the server may have accepted bytes before the app timed
 * out, so the caller should reconcile before a new attempt.
 */
export function uploadFailureNotice(
  error: unknown,
  purpose: string,
  options: UploadFailureOptions = {},
): UploadFailureNotice {
  const unknownMessage = (canReconcile: boolean) =>
    canReconcile
      ? `QuoteMax did not confirm the ${purpose} upload. The app is checking its destination before another attempt. Uploads cannot resume; retry starts a new upload.`
      : `QuoteMax did not confirm the ${purpose} upload, and this screen cannot verify whether it was stored. Uploads cannot resume; retry starts a new upload.`;
  if (error instanceof UploadTransferError) {
    if (error.kind === 'signed_target_expired') {
      return {
        kind: 'signed_target_expired',
        message: `${error.message} Request a new target; this upload cannot resume.`,
        retry: 'refresh_target',
      };
    }
    if (error.kind === 'rejected') {
      return { kind: 'rejected', message: error.message, retry: 'restart' };
    }
    return {
      kind: error.kind,
      message: unknownMessage(options.canReconcile === true),
      retry: 'check_first',
    };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      kind: 'unknown_outcome',
      message: unknownMessage(options.canReconcile === true),
      retry: 'check_first',
    };
  }
  if (error instanceof TypeError) {
    return {
      kind: 'network',
      message: unknownMessage(options.canReconcile === true),
      retry: 'check_first',
    };
  }
  if (error instanceof ApiError) {
    const code = apiErrorCode(error);
    if (
      (code.includes('expired') || code.includes('invalid')) &&
      (code.includes('signed') || code.includes('upload_url') || code.includes('upload_target'))
    ) {
      return {
        kind: 'signed_target_expired',
        message: `The secure ${purpose} upload target expired. Request a new target; this upload cannot resume.`,
        retry: 'refresh_target',
      };
    }
    if (error.status === 408 || error.status === 504 || code.includes('timeout')) {
      return {
        kind: 'unknown_outcome',
        message: unknownMessage(options.canReconcile === true),
        retry: 'check_first',
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        kind: 'auth',
        message: `Your access changed before the ${purpose} upload completed. Sign in again, then restart the upload.`,
        retry: 'restart',
      };
    }
    if ([400, 413, 415, 422].includes(error.status)) {
      return {
        kind: 'rejected',
        message: apiErrorMessage(error, `QuoteMax rejected the ${purpose}. Choose another file.`),
        retry: 'restart',
      };
    }
  }
  return {
    kind: 'server',
    message: `${apiErrorMessage(error, `QuoteMax could not confirm the ${purpose}.`)} Uploads cannot resume; check its destination before starting a new upload.`,
    retry: 'check_first',
  };
}

/** Client-side mirror of a server upload cap. Unknown size passes — the server still enforces. */
export function sizeOk(file: PickedFile, maxBytes: number): boolean {
  return file.size === undefined || file.size <= maxBytes;
}
