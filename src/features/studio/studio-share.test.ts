import { shareStudioBytes } from './studio-share';
import { beginStudioExport, clearStudioExportCache, StudioExportCleanupError } from './studio-export-cache';
const mockAvailable = jest.fn(async () => true), mockShare = jest.fn(async () => {});
const mockFile = { uri: 'file:///private/cache/studio.png', exists: false, size: 0,
  create: jest.fn(() => { mockFile.exists = true; }), write: jest.fn((bytes: Uint8Array) => { mockFile.size = bytes.length; }),
  delete: jest.fn(() => { mockFile.exists = false; }) };
const mockConstruct = jest.fn();
const mockDirectory = { exists: false, create: jest.fn(() => { mockDirectory.exists = true; }), uri: 'private-cache/quotemax-studio',
  delete: jest.fn(() => { mockDirectory.exists = false; mockFile.exists = false; }) };
jest.mock('expo-crypto', () => ({ randomUUID: () => 'opaque-fixture-id' }));
jest.mock('expo-file-system', () => ({ Paths: { cache: 'private-cache' }, Directory: function () { return mockDirectory; }, File: function (...args: unknown[]) { mockConstruct(...args); return mockFile; } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: () => mockAvailable(), shareAsync: (...args: unknown[]) => mockShare(...args as []) }));
beforeEach(async () => { await clearStudioExportCache(); jest.clearAllMocks(); mockFile.exists = false; mockFile.size = 0; mockAvailable.mockResolvedValue(true); mockShare.mockResolvedValue(undefined); mockFile.write.mockImplementation(bytes => { mockFile.size = bytes.length; }); mockFile.delete.mockImplementation(() => { mockFile.exists = false; }); });
it.each(['png', 'pdf'] as const)('shares only a complete local %s with native MIME/UTI and removes the private temporary file', async kind => {
  await shareStudioBytes(new Uint8Array([1, 2, 3]), kind);
  expect(mockConstruct).toHaveBeenCalledWith(mockDirectory, `quotemax-studio-opaque-fixture-id.${kind}`);
  expect(mockShare).toHaveBeenCalledWith(mockFile.uri, expect.objectContaining({ mimeType: kind === 'png' ? 'image/png' : 'application/pdf', UTI: kind === 'png' ? 'public.png' : 'com.adobe.pdf' }));
  expect(mockFile.exists).toBe(false);
});
it('does not create a file when sharing is unavailable or cancelled while availability resolves', async () => {
  mockAvailable.mockResolvedValue(false); await expect(shareStudioBytes(new Uint8Array([1]), 'png')).rejects.toThrow(/destination/); expect(mockFile.create).not.toHaveBeenCalled();
  const controller = new AbortController(); mockAvailable.mockImplementation(async () => { controller.abort(); return true; });
  await expect(shareStudioBytes(new Uint8Array([1]), 'png', controller.signal)).rejects.toThrow(); expect(mockShare).not.toHaveBeenCalled();
});
it('cleans failed/incomplete writes and failed native share sheets without reporting success', async () => {
  mockFile.write.mockImplementation(() => { mockFile.size = 0; });
  await expect(shareStudioBytes(new Uint8Array([1]), 'png')).rejects.toThrow(/completely/); expect(mockFile.exists).toBe(false); expect(mockShare).not.toHaveBeenCalled();
  mockFile.write.mockImplementation(bytes => { mockFile.size = bytes.length; }); mockShare.mockRejectedValue(new Error('native failed'));
  await expect(shareStudioBytes(new Uint8Array([1]), 'pdf')).rejects.toThrow('native failed'); expect(mockFile.exists).toBe(false);
});
it('removes sensitive temporary bytes immediately on identity/lifetime cancellation during the share sheet', async () => {
  let finish!: () => void; mockShare.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const controller = new AbortController(); const pending = shareStudioBytes(new Uint8Array([1]), 'png', controller.signal);
  for (let count = 0; count < 10 && !mockFile.exists; count++) await Promise.resolve(); expect(mockFile.exists).toBe(true);
  controller.abort(); expect(mockFile.exists).toBe(false); finish(); await pending;
});
it('bounds a stalled availability check and cancels it without creating a late file', async () => {
  jest.useFakeTimers(); let finish!:(value:boolean)=>void;
  mockAvailable.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  try {
    const task = shareStudioBytes(new Uint8Array([1]), 'png');
    const rejected = expect(task).rejects.toThrow(/interrupted/); jest.advanceTimersByTime(10_000); await rejected;
    finish(true); await Promise.resolve(); expect(mockFile.create).not.toHaveBeenCalled(); expect(mockShare).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
it('rejects failed final deletion and blocks every new export until explicit directory cleanup', async () => {
  mockFile.delete.mockImplementation(() => { throw new Error('locked file'); });
  await expect(shareStudioBytes(new Uint8Array([1]), 'png')).rejects.toBeInstanceOf(StudioExportCleanupError);
  expect(mockShare).toHaveBeenCalledTimes(1); expect(mockFile.exists).toBe(true);
  expect(() => beginStudioExport()).toThrow(StudioExportCleanupError);
  await expect(shareStudioBytes(new Uint8Array([2]), 'png')).rejects.toBeInstanceOf(StudioExportCleanupError);
  expect(mockShare).toHaveBeenCalledTimes(1);
  await clearStudioExportCache(); expect(mockFile.exists).toBe(false); expect(() => beginStudioExport()).not.toThrow();
});
it('supports the native AbortSignal runtime without throwIfAborted', async () => {
  const controller = new AbortController(); Object.defineProperty(controller.signal, 'throwIfAborted', { value: undefined });
  await expect(shareStudioBytes(new Uint8Array([1]), 'png', controller.signal)).resolves.toBeUndefined();
});
