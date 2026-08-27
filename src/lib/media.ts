/**
 * Photo intake for multipart uploads (the Videos owner/reference images, spec
 * tradie-trust-video-generation). Thin on purpose: the pickers return the RN
 * `{uri, name, type}` file shape FormData understands, and the server re-checks
 * size and MIME regardless of the client-side guard.
 */
import * as ImagePicker from 'expo-image-picker';

export type PickedFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

/** quality re-encodes to JPEG, keeping a modern phone camera's multi-MB shot inside upload caps. */
const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };

/**
 * Take or choose one photo. Returns null when the tradie cancels — and on a
 * camera-permission denial, where the caller should hint at Settings. The two
 * are indistinguishable to the caller by design (one nullable return, no error
 * path), so the hint copy must read as a nudge, not an accusation.
 */
export async function pickImage(source: 'camera' | 'library'): Promise<PickedFile | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    // Android's camera often reports no file name; the server only needs an extension.
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize ?? undefined,
  };
}

/**
 * RN's fetch accepts `{uri, name, type}` descriptors in FormData; the DOM lib
 * types don't know that shape, hence the one cast — kept here so screens never
 * cast files themselves.
 */
export function appendFile(form: FormData, field: string, file: PickedFile): void {
  form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
}

/** Client-side mirror of a server upload cap. Unknown size passes — the server still enforces. */
export function sizeOk(file: PickedFile, maxBytes: number): boolean {
  return file.size === undefined || file.size <= maxBytes;
}
