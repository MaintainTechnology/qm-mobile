import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { ApiError } from '@/lib/api';
import {
  appendFile,
  appendUploadFiles,
  pickDocumentForUpload,
  pickImageForUpload,
  sizeOk,
  uploadFailureNotice,
  uploadSelectionNote,
  validateUploadFile,
  type PickedFile,
  type UploadPolicy,
  UploadTransferError,
} from '@/lib/media';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  getMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const documentPicker = jest.mocked(DocumentPicker);
const imagePicker = jest.mocked(ImagePicker);

const MAX = 7 * 1024 * 1024;
const policy = {
  purpose: 'reference photo',
  field: 'extra_image',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedTypeLabel: 'a PNG, JPEG or WebP photo',
  maxBytes: MAX,
  maxFiles: 2,
} as const satisfies UploadPolicy<'extra_image'>;
const file: PickedFile = {
  uri: 'file:///cache/a.jpg',
  name: 'a.jpg',
  type: 'image/jpeg',
  size: 100,
};

beforeEach(() => {
  jest.clearAllMocks();
  imagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
    granted: true,
    accessPrivileges: 'all',
  } as never);
});

describe('upload policy validation', () => {
  it('normalises declared MIME parameters and accepts an unknown size for server verification', () => {
    expect(validateUploadFile({ ...file, type: ' IMAGE/WEBP; charset=binary ' }, policy)).toEqual({
      ok: true,
      sizeKnown: true,
    });
    expect(validateUploadFile({ ...file, size: undefined }, policy)).toEqual({
      ok: true,
      sizeKnown: false,
    });
  });

  it.each([
    [{ ...file, uri: '' }, 'corrupt'],
    [{ ...file, size: 0 }, 'corrupt'],
    [{ ...file, size: Number.NaN }, 'corrupt'],
    [{ ...file, width: 0, height: 1200 }, 'corrupt'],
    [{ ...file, type: '' }, 'unsupported_type'],
    [{ ...file, type: 'image/heic' }, 'unsupported_type'],
    [{ ...file, size: MAX + 1 }, 'too_large'],
  ] as const)('rejects invalid selection metadata (%s)', (candidate, code) => {
    const result = validateUploadFile(candidate, policy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem.code).toBe(code);
  });

  it('preserves the exact repeated multipart field and never partially appends an invalid set', () => {
    const appended: [string, unknown][] = [];
    const form = {
      append: (fieldName: string, value: unknown) => appended.push([fieldName, value]),
    };
    expect(
      appendUploadFiles(form as unknown as FormData, policy, [file, { ...file, name: 'b.png' }]),
    ).toEqual({ ok: true, unknownSizeCount: 0 });
    expect(appended.map(([fieldName]) => fieldName)).toEqual(['extra_image', 'extra_image']);

    appended.length = 0;
    const rejected = appendUploadFiles(form as unknown as FormData, policy, [
      file,
      { ...file, name: 'bad.heic', type: 'image/heic' },
    ]);
    expect(rejected).toMatchObject({ ok: false, problem: { code: 'unsupported_type' } });
    expect(appended).toEqual([]);
  });

  it('rejects selections over the server multiplicity cap', () => {
    expect(appendUploadFiles(new FormData(), policy, [file, file, file])).toMatchObject({
      ok: false,
      problem: { code: 'too_many' },
    });
  });
});

describe('image picker outcomes', () => {
  it('distinguishes camera denial from cancellation and does not open the camera', async () => {
    imagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as never);
    await expect(pickImageForUpload('camera', policy)).resolves.toMatchObject({
      kind: 'denied',
      canAskAgain: false,
    });
    expect(imagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns a plain cancelled outcome without permission copy', async () => {
    imagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    } as never);
    await expect(pickImageForUpload('library', policy)).resolves.toEqual({ kind: 'cancelled' });
  });

  it('reports a blocked library separately when the system picker cannot open', async () => {
    imagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
      accessPrivileges: 'none',
    } as never);
    imagePicker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('permission blocked'));
    await expect(pickImageForUpload('library', policy)).resolves.toMatchObject({
      kind: 'denied',
      canAskAgain: false,
    });
  });

  it('retains limited-library and unknown-size state for truthful UI copy', async () => {
    imagePicker.getMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
      accessPrivileges: 'limited',
    } as never);
    imagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///p.jpg', fileName: 'p.jpg', mimeType: 'image/jpeg', fileSize: null }],
    } as never);

    const result = await pickImageForUpload('library', policy);
    expect(result).toMatchObject({
      kind: 'selected',
      libraryAccess: 'limited',
      hasUnknownSize: true,
    });
    expect(uploadSelectionNote(result)).toContain('access is limited');
    expect(uploadSelectionNote(result)).toContain('verify the file size');
  });

  it('asks the SDK 54 library picker for no more than the policy cap', async () => {
    imagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg', fileSize: 1 }],
    } as never);
    await pickImageForUpload('library', policy);
    expect(imagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 2 }),
    );
  });

  it('rejects missing MIME instead of relabelling unknown bytes as JPEG', async () => {
    imagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///unknown', fileName: null, mimeType: null, fileSize: 1 }],
    } as never);
    await expect(pickImageForUpload('library', policy)).resolves.toMatchObject({
      kind: 'rejected',
      problem: { code: 'unsupported_type' },
    });
  });
});

describe('document picker outcomes', () => {
  it('copies selected documents to cache and preserves the policy MIME/cap/multiplicity', async () => {
    documentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/plan.pdf', name: 'plan.pdf', mimeType: 'image/png' }],
    } as never);
    const result = await pickDocumentForUpload(policy);
    expect(result).toMatchObject({ kind: 'selected', hasUnknownSize: true });
    expect(documentPicker.getDocumentAsync).toHaveBeenCalledWith({
      type: [...policy.allowedMimeTypes],
      copyToCacheDirectory: true,
      multiple: true,
      base64: false,
    });
  });

  it('keeps document cancellation distinct from picker failure', async () => {
    documentPicker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    await expect(pickDocumentForUpload(policy)).resolves.toEqual({ kind: 'cancelled' });
    documentPicker.getDocumentAsync.mockRejectedValueOnce(new Error('native unavailable'));
    await expect(pickDocumentForUpload(policy)).resolves.toMatchObject({ kind: 'failed' });
  });
});

describe('upload failure semantics', () => {
  it('marks an aborted request as unknown rather than failed or resumable', () => {
    const aborted = new Error('timed out');
    aborted.name = 'AbortError';
    expect(uploadFailureNotice(aborted, 'photo')).toMatchObject({
      kind: 'unknown_outcome',
      retry: 'check_first',
      message: expect.stringContaining('cannot resume'),
    });
  });

  it('keeps a network loss ambiguous and marks signed-target expiry as a refresh', () => {
    expect(uploadFailureNotice(new TypeError('Network request failed'), 'photo')).toMatchObject({
      kind: 'network',
      retry: 'check_first',
    });
    const expired = new ApiError('expired', 403, '/upload', {
      error: 'signed_upload_target_expired',
    });
    expect(uploadFailureNotice(expired, 'photo')).toMatchObject({
      kind: 'signed_target_expired',
      retry: 'refresh_target',
    });
  });

  it('says when an ambiguous destination is actively reconcilable', () => {
    const aborted = new Error('timed out');
    aborted.name = 'AbortError';
    expect(uploadFailureNotice(aborted, 'video', { canReconcile: true }).message).toContain(
      'app is checking its destination',
    );
  });

  it('maps direct signed-transfer discriminators without guessing from prose', () => {
    expect(
      uploadFailureNotice(
        new UploadTransferError(
          'signed_target_expired',
          'The secure target rejected the file.',
          403,
        ),
        'document',
      ),
    ).toMatchObject({ kind: 'signed_target_expired', retry: 'refresh_target' });
    expect(
      uploadFailureNotice(
        new UploadTransferError('rejected', 'The storage service rejected plan.pdf.', 415),
        'document',
      ),
    ).toEqual({
      kind: 'rejected',
      retry: 'restart',
      message: 'The storage service rejected plan.pdf.',
    });
  });

  it('retains a server rejection message without claiming upload success', () => {
    const rejected = new ApiError('rejected', 413, '/upload', {
      message: 'Photo exceeds the 7 MB limit.',
    });
    expect(uploadFailureNotice(rejected, 'photo')).toEqual({
      kind: 'rejected',
      retry: 'restart',
      message: 'Photo exceeds the 7 MB limit.',
    });
  });
});

describe('legacy multipart helpers', () => {
  it('appends the RN descriptor without the size field', () => {
    const appended: [string, unknown][] = [];
    const form = {
      append: (fieldName: string, value: unknown) => appended.push([fieldName, value]),
    };
    appendFile(form as unknown as FormData, 'owner_photo', file);
    expect(appended).toEqual([
      ['owner_photo', { uri: 'file:///cache/a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
    ]);
  });

  it('keeps the pre-migration unknown-size rule for existing document consumers', () => {
    expect(sizeOk({ ...file, size: undefined }, MAX)).toBe(true);
    expect(sizeOk({ ...file, size: MAX + 1 }, MAX)).toBe(false);
  });
});
