import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { validateUploadFile, type PickedFile } from '@/lib/media';
import { BUSINESS_MEDIA_MAX_BYTES, BUSINESS_MEDIA_POLICY, type BusinessMediaMime } from './business-media-policy';
import { assertBusinessMediaImage } from './business-media-image-info';
export type BusinessMediaSelection = Readonly<{
  sourceMime: BusinessMediaMime; sourceSha256: string; dataBase64: string; previewUri: string;
}>;
export class MediaInputError extends Error {}

/** Encode one immutable byte snapshot, without requiring Node Buffer on Hermes. */
export function businessMediaBase64(bytes: Uint8Array): string {
  if (!bytes.byteLength || bytes.byteLength > BUSINESS_MEDIA_MAX_BYTES) throw new MediaInputError('Choose an image up to 2 MB.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  let block = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!, b = bytes[index + 1], c = bytes[index + 2];
    block += alphabet[a >> 2]! + alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)]!
      + (b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]!)
      + (c === undefined ? '=' : alphabet[c & 63]!);
    if (block.length >= 8192) { chunks.push(block); block = ''; }
  }
  if (block) chunks.push(block);
  return chunks.join('');
}

/** Read the selected local file once. Hash, upload body and preview use those
 * exact bytes. No additional plaintext copy or image content is persisted. */
export async function readBusinessMediaFile(picked: PickedFile): Promise<BusinessMediaSelection> {
  const check = validateUploadFile(picked, BUSINESS_MEDIA_POLICY);
  if (!check.ok) throw new MediaInputError(check.problem.message);
  if (!/^file:\/\//i.test(picked.uri)) throw new MediaInputError('Choose a readable image from this device.');
  const sourceMime = picked.type.split(';')[0]!.trim().toLowerCase() as BusinessMediaMime;
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    const file = new File(picked.uri);
    const size = file.size;
    if (!file.exists || !Number.isSafeInteger(size) || size <= 0 || size > BUSINESS_MEDIA_MAX_BYTES)
      throw new Error('Unreadable or oversized image');
    const handle = file.open();
    try {
      bytes = handle.readBytes(BUSINESS_MEDIA_MAX_BYTES + 1);
      // SDK54 Android may return a padded allocation after a short native
      // read. Verify the actual handle position before accepting these bytes.
      if (handle.offset !== bytes.length || bytes.length !== size || file.size !== size)
        throw new Error('The image changed or was not fully read');
    }
    finally { handle.close(); }
  } catch { throw new MediaInputError('This image could not be read within the 2 MB limit. Choose a smaller file again.'); }
  if (!bytes.length || bytes.length > BUSINESS_MEDIA_MAX_BYTES) throw new MediaInputError('Choose an image up to 2 MB.');
  try { assertBusinessMediaImage(bytes, sourceMime, picked); }
  catch { throw new MediaInputError('Choose a valid PNG, JPG or WebP image up to 8192 pixels on each side and 16 megapixels.'); }
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const sourceSha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const dataBase64 = businessMediaBase64(bytes);
  return { sourceMime, sourceSha256, dataBase64, previewUri: `data:${sourceMime};base64,${dataBase64}` };
}
