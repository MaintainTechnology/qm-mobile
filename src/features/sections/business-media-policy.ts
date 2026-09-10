import type { UploadPolicy } from '@/lib/media';

export const BUSINESS_MEDIA_MAX_BYTES = 2 * 1024 * 1024;
export const BUSINESS_MEDIA_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type BusinessMediaMime = typeof BUSINESS_MEDIA_MIMES[number];
export const BUSINESS_MEDIA_POLICY: UploadPolicy<'file'> = {
  purpose: 'business image', field: 'file', allowedMimeTypes: BUSINESS_MEDIA_MIMES,
  allowedTypeLabel: 'a PNG, JPG or WebP image', maxBytes: BUSINESS_MEDIA_MAX_BYTES, maxFiles: 1,
};
