import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CAROUSEL } from './studio-presets';
import { STUDIO_PNG_BYTES } from './studio-contract';
import { renderStudioPng } from './studio-render';
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://fixture.invalid${path}` }));
const bytes = new Uint8Array(readFileSync(join(process.cwd(), 'specs/audits/evidence/studio-c24/slide-1-stat.png')));
function response(chunks: Uint8Array[] = [bytes], status = 200, mime = 'image/png', length: string | null = null) {
  let cursor = 0;
  const reader = { read: jest.fn(async () => cursor < chunks.length ? { done: false, value: chunks[cursor++] } : { done: true }), cancel: jest.fn(async () => {}), releaseLock: jest.fn() };
  const body = { getReader: () => reader, cancel: jest.fn(async () => {}) };
  return { reply: { ok: status === 200, status, headers: { get: (name: string) => name === 'content-type' ? mime : length }, body } as unknown as Response, reader, body };
}
const deferred = <T,>() => { let resolve!:(value:T)=>void; const promise = new Promise<T>(done => { resolve=done; }); return { promise, resolve }; };
it('POSTs private copy with a fresh Bearer header and consumes the bounded actual PNG stream', async () => {
  const sample = response([bytes.slice(0, 100), bytes.slice(100)]); const transport = jest.fn(async () => sample.reply); const token = jest.fn(async () => 'owner-token');
  expect(await renderStudioPng(DEFAULT_CAROUSEL[0]!, token, undefined, transport)).toEqual(bytes);
  expect(transport).toHaveBeenCalledWith('https://fixture.invalid/api/studio/render', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer owner-token', 'Content-Type': 'application/json' } }));
  expect(token).toHaveBeenCalledTimes(1); expect(sample.reader.releaseLock).toHaveBeenCalled();
});
it('rejects invalid text before authentication or server work', async () => {
  const token = jest.fn(); const transport = jest.fn();
  await expect(renderStudioPng({ kind: 'quote', quote: '中文', attrib: [] }, token, undefined, transport)).rejects.toThrow(/character/);
  expect(token).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
});
it.each([401, 403, 503])('never consumes or presents an error response as an image (%s)', async status => {
  const sample = response([], status); await expect(renderStudioPng(DEFAULT_CAROUSEL[0]!, async () => 'token', undefined, jest.fn(async () => sample.reply))).rejects.toThrow();
  expect(sample.reader.read).not.toHaveBeenCalled();
});
it('rejects misleading MIME and announced or streamed oversized bodies', async () => {
  for (const sample of [response([], 200, 'text/html'), response([], 200, 'image/png', String(STUDIO_PNG_BYTES + 1)), response([new Uint8Array(STUDIO_PNG_BYTES + 1)])])
    await expect(renderStudioPng(DEFAULT_CAROUSEL[0]!, async () => 'token', undefined, jest.fn(async () => sample.reply))).rejects.toThrow();
});
it('cancels a stalled body and does not wait indefinitely for an aborted reader', async () => {
  const sample = response(); sample.reader.read.mockImplementation(() => new Promise(() => {}));
  const controller = new AbortController(); const task = renderStudioPng(DEFAULT_CAROUSEL[0]!, async () => 'token', controller.signal, jest.fn(async () => sample.reply));
  await Promise.resolve(); await Promise.resolve(); controller.abort();
  await expect(task).rejects.toThrow(/interrupted/); expect(sample.reader.cancel).toHaveBeenCalled();
});
it('cancels a late response body after account/lifetime interruption', async () => {
  const pending = deferred<Response>(); const sample = response(); const controller = new AbortController();
  const task = renderStudioPng(DEFAULT_CAROUSEL[0]!, async () => 'token', controller.signal, jest.fn(() => pending.promise));
  await Promise.resolve(); controller.abort(); await expect(task).rejects.toThrow(/interrupted/);
  pending.resolve(sample.reply); await Promise.resolve(); await Promise.resolve();
  expect(sample.body.cancel).toHaveBeenCalled(); expect(sample.reader.read).not.toHaveBeenCalled();
});
it('times out a stalled token without later starting a request', async () => {
  jest.useFakeTimers(); const pending = deferred<string>(); const transport = jest.fn();
  try {
    const task = renderStudioPng(DEFAULT_CAROUSEL[0]!, () => pending.promise, undefined, transport);
    const result = expect(task).rejects.toThrow(/interrupted/); jest.advanceTimersByTime(30_000); await result;
    pending.resolve('late-token'); await Promise.resolve(); expect(transport).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
