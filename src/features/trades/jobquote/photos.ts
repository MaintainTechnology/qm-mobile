import type { PickedFile } from '@/lib/media';

export type JobPhoto = {
  id: number;
  file: PickedFile;
  status: 'uploading' | 'uploaded' | 'failed';
  path?: string;
  url?: string;
  uploadedAt?: number;
  error?: string;
};

/** The operation endpoint re-signs durable owned paths; local URL expiry cannot
 * require re-uploading a photo or alter the identity of an existing attempt. */
export function jobPhotoPayload(photos: readonly JobPhoto[]) {
  if (photos.some(photo => photo.status !== 'uploaded')) {
    throw new Error('Finish uploading or remove the unfinished photos before drafting.');
  }
  if (photos.some(photo => !photo.path)) {
    throw new Error('A photo upload could not be confirmed. Remove and add that photo again.');
  }
  if (photos.length === 0) return {};
  if (photos.length > 3) throw new Error('Add no more than three job photos.');
  return {
    photo_paths: photos.map(photo => photo.path!),
  };
}
