import { validateUploadFile } from '@/lib/media';

import { JOB_PHOTO_POLICY, JobPhotoResponseSchema } from './api';
import { jobPhotoPayload, type JobPhoto } from './photos';

const file = {
  uri: 'file:///image.jpg',
  name: 'image.jpg',
  type: 'image/jpeg',
  size: 8 * 1024 * 1024,
};
const photo: JobPhoto = {
  id: 1,
  file,
  status: 'uploaded',
  path: 'jobquote-owned/photo.jpg',
  url: 'https://storage.example/signed/photo.jpg',
  uploadedAt: 100,
};

it('accepts the exact photo cap and supported MIME; rejects oversized and HEIC files', () => {
  expect(validateUploadFile(file, JOB_PHOTO_POLICY).ok).toBe(true);
  expect(validateUploadFile({ ...file, size: file.size + 1 }, JOB_PHOTO_POLICY).ok).toBe(false);
  expect(validateUploadFile({ ...file, type: 'image/heic' }, JOB_PHOTO_POLICY).ok).toBe(false);
});

it('submits durable paths for server re-signing even when local signed URLs have expired', () => {
  expect(jobPhotoPayload([photo])).toEqual({
    photo_paths: [photo.path],
  });
  expect(jobPhotoPayload([])).toEqual({});
  expect(jobPhotoPayload([{ ...photo, uploadedAt: 0, url: undefined }])).toEqual({
    photo_paths: [photo.path],
  });
  expect(() => jobPhotoPayload([{ ...photo, path: undefined }])).toThrow(/could not be confirmed/);
  expect(() => jobPhotoPayload([{ ...photo, status: 'failed' }])).toThrow(/unfinished/);
  expect(() => jobPhotoPayload(Array(4).fill(photo))).toThrow(/three/);
});

it('requires one attributable uploaded result instead of silently mapping a partial batch to wrong photos', () => {
  expect(
    JobPhotoResponseSchema.safeParse({
      ok: true,
      count: 1,
      paths: ['path'],
      urls: ['https://storage.example/photo'],
    }).success,
  ).toBe(true);
  expect(
    JobPhotoResponseSchema.safeParse({ ok: true, count: 1, paths: ['path'], urls: [] }).success,
  ).toBe(false);
  expect(
    JobPhotoResponseSchema.safeParse({
      ok: true,
      count: 2,
      paths: ['a', 'b'],
      urls: ['https://a.test', 'https://b.test'],
    }).success,
  ).toBe(false);
});
