import type { UploadPolicy } from '@/lib/media';

const VIDEO_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Exact single presenter-photo part accepted by the video generate route. */
export const VIDEO_OWNER_PHOTO_POLICY = {
  purpose: 'presenter photo',
  field: 'owner_photo',
  allowedMimeTypes: VIDEO_IMAGE_TYPES,
  allowedTypeLabel: 'a PNG, JPEG or WebP photo',
  maxBytes: 7 * 1024 * 1024,
  maxFiles: 1,
} as const satisfies UploadPolicy<'owner_photo'>;

/** The video generate route consumes at most two repeated `extra_image` parts. */
export const MAX_REFERENCE_IMAGES = 2;
export const VIDEO_REFERENCE_PHOTO_POLICY = {
  purpose: 'reference photo',
  field: 'extra_image',
  allowedMimeTypes: VIDEO_IMAGE_TYPES,
  allowedTypeLabel: 'a PNG, JPEG or WebP photo',
  maxBytes: 7 * 1024 * 1024,
  maxFiles: MAX_REFERENCE_IMAGES,
} as const satisfies UploadPolicy<'extra_image'>;

export function appendReferenceImages<T>(
  current: readonly T[],
  selected: readonly T[],
): { ok: true; files: T[] } | { ok: false; files: T[] } {
  if (current.length + selected.length > MAX_REFERENCE_IMAGES) {
    return { ok: false, files: [...current] };
  }
  return { ok: true, files: [...current, ...selected] };
}
