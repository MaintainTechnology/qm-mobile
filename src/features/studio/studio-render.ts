import { fetch as expoFetch } from 'expo/fetch';
import { apiUrl } from '@/lib/env';
import { assertStudioPng, STUDIO_PNG_BYTES, studioRenderBody, type StudioSlide } from './studio-contract';

export type StudioToken = () => Promise<string | null>;
export async function renderStudioPng(slide: StudioSlide, getToken: StudioToken, signal?: AbortSignal,
  transport: typeof fetch = expoFetch as typeof fetch): Promise<Uint8Array> {
  const body = studioRenderBody(slide);
  const controller = new AbortController();
  let rejectAbort: (error: Error) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => { controller.abort(); rejectAbort(new Error('Studio rendering was interrupted. Your edits are still here.')); };
  const timer = setTimeout(onAbort, 30_000);
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) onAbort();
  async function perform() {
    if (controller.signal.aborted) throw new Error('Studio rendering was interrupted.');
    const token = await getToken();
    if (controller.signal.aborted) throw new Error('Studio rendering was interrupted.');
    if (!token) throw new Error('Sign in again to use Brand Studio. Your edits are still here.');
    const response = await transport(apiUrl('/api/studio/render'), {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body, signal: controller.signal,
    });
    if (controller.signal.aborted) {
      void response.body?.cancel().catch(() => undefined);
      throw new Error('Studio rendering was interrupted.');
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Brand Studio is unavailable for this account. Sign in again or refresh your account.');
      if (response.status === 400 || response.status === 413) throw new Error('Review this slide’s text and photo. Your edits are still here.');
      throw new Error('Studio could not render this slide. Your edits are still here; try again.');
    }
    if (response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'image/png') throw new Error('Studio returned an unexpected file. Your edits are still here.');
    const length = response.headers.get('content-length');
    if (length != null && (!/^\d+$/.test(length) || Number(length) > STUDIO_PNG_BYTES)) throw new Error('Studio returned an oversized image.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('This device could not read the Studio image. Try again.');
    const chunks: Uint8Array[] = []; let size = 0;
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (controller.signal.aborted) throw new Error('Studio rendering was interrupted.');
        if (done) break;
        size += value.byteLength;
        if (size > STUDIO_PNG_BYTES) { await reader.cancel(); throw new Error('Studio returned an oversized image.'); }
        chunks.push(value);
      }
    } finally { controller.signal.removeEventListener('abort', cancel); reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    assertStudioPng(bytes);
    return bytes;
  }
  try { return await Promise.race([perform(), aborted]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
}
