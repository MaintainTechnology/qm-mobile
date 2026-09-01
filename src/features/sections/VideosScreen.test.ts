import {
  MAX_REFERENCE_IMAGES,
  VIDEO_OWNER_PHOTO_POLICY,
  VIDEO_REFERENCE_PHOTO_POLICY,
  appendReferenceImages,
} from './video-reference-images';

describe('video reference image limit', () => {
  it('matches the two-image server contract', () => {
    expect(MAX_REFERENCE_IMAGES).toBe(2);
    expect(VIDEO_OWNER_PHOTO_POLICY).toMatchObject({
      field: 'owner_photo',
      maxFiles: 1,
      maxBytes: 7 * 1024 * 1024,
    });
    expect(VIDEO_REFERENCE_PHOTO_POLICY).toMatchObject({
      field: 'extra_image',
      maxFiles: 2,
      maxBytes: 7 * 1024 * 1024,
    });
    expect(appendReferenceImages([], ['one'])).toEqual({ ok: true, files: ['one'] });
    expect(appendReferenceImages(['one'], ['two'])).toEqual({
      ok: true,
      files: ['one', 'two'],
    });
    expect(appendReferenceImages(['one', 'two'], ['third'])).toEqual({
      ok: false,
      files: ['one', 'two'],
    });
  });

  it('keeps the backend image allowlist explicit', () => {
    expect(VIDEO_REFERENCE_PHOTO_POLICY.allowedMimeTypes).toEqual([
      'image/png',
      'image/jpeg',
      'image/webp',
    ]);
  });
});
