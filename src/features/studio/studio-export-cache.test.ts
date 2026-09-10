import { beginStudioExport, beginStudioRender, clearStudioExportCache, finishStudioExport, StudioExportCleanupError } from './studio-export-cache';
const mockDelete = jest.fn(); const mockConstruct = jest.fn();
let mockExists = true;
jest.mock('expo-file-system', () => ({ Paths: { cache: 'private-cache' }, Directory: function (...args: unknown[]) { mockConstruct(...args); return { get exists() { return mockExists; }, delete: mockDelete }; } }));
beforeEach(async () => { mockDelete.mockReset().mockImplementation(() => { mockExists = false; }); mockExists = false; await clearStudioExportCache(); jest.clearAllMocks(); });
it('revokes every in-flight export synchronously and deletes only the constant Studio directory', async () => {
  mockExists = true; const first = beginStudioExport(), second = beginStudioRender();
  const purge = clearStudioExportCache(); expect(first.signal.aborted).toBe(true); expect(second.signal.aborted).toBe(true); await purge;
  expect(mockConstruct).toHaveBeenCalledWith('private-cache', 'quotemax-studio'); expect(mockDelete).toHaveBeenCalledTimes(1);
});
it('fails closed when cache deletion fails and resumes only after a successful retry', async () => {
  mockExists = true; mockDelete.mockImplementation(() => { throw new Error('disk failed'); });
  const controller = beginStudioExport(); await expect(clearStudioExportCache()).rejects.toThrow('disk failed'); expect(controller.signal.aborted).toBe(true);
  expect(() => beginStudioExport()).toThrow(StudioExportCleanupError); mockDelete.mockImplementation(() => { mockExists = false; }); await clearStudioExportCache(); expect(() => beginStudioExport()).not.toThrow();
});
it('does not report cleanup complete when deletion returns but the private directory remains', async () => {
  mockExists = true; mockDelete.mockImplementation(() => {});
  await expect(clearStudioExportCache()).rejects.toBeInstanceOf(StudioExportCleanupError);
  expect(() => beginStudioExport()).toThrow(StudioExportCleanupError);
  mockDelete.mockImplementation(() => { mockExists = false; });
  await clearStudioExportCache(); expect(() => beginStudioExport()).not.toThrow();
});
it('handles a fresh install without files and releases completed export controllers', async () => {
  const controller = beginStudioExport(); finishStudioExport(controller); await clearStudioExportCache();
  expect(controller.signal.aborted).toBe(false); expect(mockDelete).not.toHaveBeenCalled();
});
