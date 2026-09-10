import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { assertStudioExportReady, StudioExportCleanupError, studioExportCleanupFailed, studioExportDirectory } from './studio-export-cache';
import { assertStudioActive } from './studio-contract';

export async function shareStudioBytes(bytes: Uint8Array, kind: 'png' | 'pdf', signal?: AbortSignal): Promise<void> {
  assertStudioActive(signal);
  assertStudioExportReady();
  let rejectWait: (error: Error) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => { rejectWait = reject; });
  const cancelWait = () => rejectWait(new Error('Studio export was interrupted. Your edits are still here.'));
  const timer = setTimeout(cancelWait, 10_000);
  signal?.addEventListener('abort', cancelWait, { once: true });
  try {
    if (!(await Promise.race([Sharing.isAvailableAsync(), interrupted]))) throw new Error('No native share or save destination is available. Your edits are still here.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancelWait); }
  assertStudioActive(signal);
  assertStudioExportReady();
  const directory = studioExportDirectory();
  directory.create({ idempotent: true });
  const file = new File(directory, `quotemax-studio-${randomUUID()}.${kind}`);
  const remove = () => {
    try { if (file.exists) file.delete(); if (file.exists) throw new Error('Temporary export remains'); }
    catch { studioExportCleanupFailed(); throw new StudioExportCleanupError(); }
  };
  const onAbort = () => { try { remove(); } catch { /* Final cleanup reports the typed failure. */ } };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    file.create(); file.write(bytes);
    if (file.size !== bytes.length) throw new Error('The Studio export could not be written completely.');
    assertStudioActive(signal);
    await Sharing.shareAsync(file.uri, { mimeType: kind === 'png' ? 'image/png' : 'application/pdf',
      UTI: kind === 'png' ? 'public.png' : 'com.adobe.pdf', dialogTitle: kind === 'png' ? 'Save or share this slide' : 'Save or share the carousel' });
  } finally { signal?.removeEventListener('abort', onAbort); remove(); }
}
