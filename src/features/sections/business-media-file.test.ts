import { createHash } from 'node:crypto';
import * as Crypto from 'expo-crypto';
import { businessMediaBase64, readBusinessMediaFile } from './business-media-file';
import { BUSINESS_MEDIA_MAX_BYTES } from './business-media-policy';
import { mediaBytes } from './business-media-test-fixture';
import type { PickedFile } from '@/lib/media';

const mockRead = jest.fn(), mockClose = jest.fn(), mockOpen = jest.fn();
let mockExists = true, mockSize = mediaBytes.length, mockOffset = mediaBytes.length;
jest.mock('expo-file-system', () => ({ File: class {
  get exists() { return mockExists; } get size() { return mockSize; }
  open() { mockOpen(); return { readBytes: mockRead,close: mockClose,get offset() { return mockOffset; } }; }
} }));
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' },digest: jest.fn(async (_: string,bytes: Uint8Array) => {
    const hash = crypto.createHash('sha256').update(bytes).digest(); return hash.buffer.slice(hash.byteOffset,hash.byteOffset + hash.byteLength);
  }) };
});
const picked: PickedFile = { uri: 'file:///private/logo.png',name: 'logo.png',type: 'image/png',size: mediaBytes.length,width: 1,height: 1 };
beforeEach(() => { jest.clearAllMocks(); mockExists = true; mockSize = mediaBytes.length; mockOffset = mediaBytes.length; mockRead.mockReset().mockReturnValue(mediaBytes); });
it.each([1,2,3,4,8191,8192,8193,BUSINESS_MEDIA_MAX_BYTES])('base64 encodes exactly %i bytes without Node Buffer in runtime', length => {
  const bytes = Uint8Array.from({ length },(_, i) => i % 256);
  expect(businessMediaBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
});
it('rejects empty and over-cap snapshots', () => {
  expect(() => businessMediaBase64(new Uint8Array())).toThrow('2 MB');
  expect(() => businessMediaBase64(new Uint8Array(BUSINESS_MEDIA_MAX_BYTES + 1))).toThrow('2 MB');
});
it('reads once within the cap and binds hash/body/preview to those exact bytes', async () => {
  const selected = await readBusinessMediaFile(picked);
  expect(mockOpen).toHaveBeenCalledTimes(1); expect(mockRead).toHaveBeenCalledTimes(1);
  expect(mockRead).toHaveBeenCalledWith(BUSINESS_MEDIA_MAX_BYTES + 1); expect(mockClose).toHaveBeenCalledTimes(1);
  expect(Crypto.digest).toHaveBeenCalledTimes(1); expect(Crypto.digest).toHaveBeenCalledWith('SHA-256',mediaBytes);
  expect(selected).toEqual({ sourceMime: 'image/png',sourceSha256: createHash('sha256').update(mediaBytes).digest('hex'),
    dataBase64: Buffer.from(mediaBytes).toString('base64'),previewUri: 'data:image/png;base64,' + Buffer.from(mediaBytes).toString('base64') });
});
it.each([false,0,-1,BUSINESS_MEDIA_MAX_BYTES + 1,1.5])('refuses unavailable or unbounded actual size %s before opening bytes', async bad => {
  if (bad === false) mockExists = false; else if (typeof bad === 'number') mockSize = bad;
  await expect(readBusinessMediaFile(picked)).rejects.toThrow('2 MB'); expect(mockRead).not.toHaveBeenCalled();
});
it('closes the handle on read failure and rejects a lying size or empty content', async () => {
  mockRead.mockImplementationOnce(() => { throw new Error('Unreadable'); });
  await expect(readBusinessMediaFile(picked)).rejects.toThrow('could not be read'); expect(mockClose).toHaveBeenCalledTimes(1);
  mockRead.mockReturnValueOnce(new Uint8Array(BUSINESS_MEDIA_MAX_BYTES + 1)); await expect(readBusinessMediaFile(picked)).rejects.toThrow('2 MB');
  mockRead.mockReturnValueOnce(new Uint8Array()); await expect(readBusinessMediaFile(picked)).rejects.toThrow('2 MB');
});
it.each([{ uri: 'https://foreign.example/logo.png' },{ uri: 'content://media/external/image/1' },{ type: 'image/svg+xml',name: 'logo.svg' },{ size: BUSINESS_MEDIA_MAX_BYTES + 1 }])('rejects unsupported selection %j before reading', async patch => {
  await expect(readBusinessMediaFile({ ...picked,...patch })).rejects.toThrow(); expect(mockOpen).not.toHaveBeenCalled();
});
it('rejects a padded short native read even if its allocation matches the original size', async () => {
  mockOffset = mediaBytes.length - 1;
  mockRead.mockReturnValueOnce(Uint8Array.from([...mediaBytes.slice(0,-1),0]));
  await expect(readBusinessMediaFile(picked)).rejects.toThrow('could not be read');
  expect(mockClose).toHaveBeenCalledTimes(1); expect(Crypto.digest).not.toHaveBeenCalled();
});
it('rejects a file which changes size while its captured bytes are being read', async () => {
  mockRead.mockImplementationOnce(() => { mockSize += 1; return mediaBytes; });
  await expect(readBusinessMediaFile(picked)).rejects.toThrow('could not be read');
  expect(mockClose).toHaveBeenCalledTimes(1); expect(Crypto.digest).not.toHaveBeenCalled();
});
it('rejects missing or mismatched dimensions and false MIME before creating a hash or preview', async () => {
  for (const patch of [{ width: undefined },{ width: 2 },{ width: 1.5 },{ width: 8193 },{ type: 'image/jpeg',name: 'logo.jpg' }]) {
    await expect(readBusinessMediaFile({ ...picked,...patch })).rejects.toThrow('Choose a valid');
  }
  expect(Crypto.digest).not.toHaveBeenCalled(); expect(mockClose).toHaveBeenCalledTimes(5);
});
it('rejects known invalid picker dimensions before opening the file', async () => {
  await expect(readBusinessMediaFile({ ...picked,width: 0 })).rejects.toThrow('invalid image dimensions');
  expect(mockOpen).not.toHaveBeenCalled(); expect(Crypto.digest).not.toHaveBeenCalled();
});
it('rejects corrupt image bytes despite safe metadata before creating a hash or preview', async () => {
  mockRead.mockReturnValueOnce(new Uint8Array(mediaBytes.length));
  await expect(readBusinessMediaFile(picked)).rejects.toThrow('Choose a valid');
  expect(Crypto.digest).not.toHaveBeenCalled(); expect(mockClose).toHaveBeenCalledTimes(1);
});
