import { Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const active = new Set<AbortController>();
let cleanupFailed = false;
export class StudioExportCleanupError extends Error {
  constructor() { super('The export may already have been saved or shared, but its temporary device copy could not be removed. Clear temporary exports before exporting again.'); }
}
export function studioExportCleanupFailed() { cleanupFailed = true; }
export function assertStudioExportReady() {
  if (cleanupFailed) throw new StudioExportCleanupError();
}
export const studioExportDirectory = () => new Directory(Paths.cache, 'quotemax-studio');
/** Private preview/render requests also stop at the synchronous identity boundary. */
export function beginStudioRender(): AbortController {
  const controller = new AbortController();
  active.add(controller);
  return controller;
}

export function beginStudioExport(): AbortController {
  assertStudioExportReady();
  return beginStudioRender();
}
export function finishStudioExport(controller: AbortController) { active.delete(controller); }

/** Identity purge revokes pending renders synchronously before touching disk.
 * Delete only the dedicated, constant cache directory; never a caller path.
 */
export async function clearStudioExportCache(): Promise<void> {
  for (const controller of active) controller.abort();
  active.clear();
  cleanupFailed = true;
  if (Platform.OS === 'web') { cleanupFailed = false; return; }
  const directory = studioExportDirectory();
  if (directory.exists) directory.delete();
  if (directory.exists) throw new StudioExportCleanupError();
  cleanupFailed = false;
}
