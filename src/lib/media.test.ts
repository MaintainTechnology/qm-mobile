import * as ImagePicker from 'expo-image-picker';

import { appendFile, pickImage, sizeOk, type PickedFile } from '@/lib/media';

// jest-expo ships no native picker; mocking the module keeps pickImage's
// branching testable and the pure helpers importable. babel-jest hoists this
// above the imports.
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const picker = jest.mocked(ImagePicker);

const MAX = 7 * 1024 * 1024;
const file: PickedFile = {
  uri: 'file:///cache/a.jpg',
  name: 'a.jpg',
  type: 'image/jpeg',
  size: 100,
};

beforeEach(() => jest.clearAllMocks());

describe('sizeOk', () => {
  it('passes at exactly the cap', () => {
    expect(sizeOk({ ...file, size: MAX }, MAX)).toBe(true);
  });

  it('fails one byte over', () => {
    expect(sizeOk({ ...file, size: MAX + 1 }, MAX)).toBe(false);
  });

  it('passes an unknown size — the server still enforces its own cap', () => {
    expect(sizeOk({ ...file, size: undefined }, MAX)).toBe(true);
  });
});

describe('appendFile', () => {
  it('appends the RN file descriptor, without the size field', () => {
    const appended: [string, unknown][] = [];
    const form = { append: (fieldName: string, value: unknown) => appended.push([fieldName, value]) };
    appendFile(form as unknown as FormData, 'owner_photo', file);
    expect(appended).toEqual([
      ['owner_photo', { uri: 'file:///cache/a.jpg', name: 'a.jpg', type: 'image/jpeg' }],
    ]);
  });
});

describe('pickImage', () => {
  it('returns null on camera-permission denial, without opening the camera', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    expect(await pickImage('camera')).toBeNull();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns null when the tradie cancels the picker', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    expect(await pickImage('library')).toBeNull();
  });

  it('maps a picked asset to the upload shape', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///p.jpg', fileName: 'p.jpg', mimeType: 'image/png', fileSize: 9 }],
    } as never);
    expect(await pickImage('library')).toEqual({
      uri: 'file:///p.jpg',
      name: 'p.jpg',
      type: 'image/png',
      size: 9,
    });
  });

  it('falls back to a jpeg name and type when the platform omits them', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///x' }],
    } as never);
    const picked = await pickImage('library');
    expect(picked?.type).toBe('image/jpeg');
    expect(picked?.name).toMatch(/\.jpg$/);
    expect(picked?.size).toBeUndefined();
  });
});
