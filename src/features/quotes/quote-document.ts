import { ApiError } from '@/lib/api';
import { requireClerkToken } from '@/lib/auth-token';
import { apiUrl } from '@/lib/env';

/** Bearer ownership permits held-document preview without releasing its public link. */
export async function loadOwnerQuoteHtml(
  shareToken: string,
  getToken: () => Promise<string | null>,
  signal: AbortSignal,
  timeoutMs = 30000,
): Promise<string> {
  const controller = new AbortController();
  const fail = () =>
    Object.assign(new Error('The saved document could not be loaded in time.'), {
      name: 'AbortError',
    });
  let rejectAbort: (error: Error) => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => {
    controller.abort();
    rejectAbort(fail());
  };
  const timer = setTimeout(onAbort, timeoutMs);
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });
  const check = () => {
    if (controller.signal.aborted) throw fail();
  };
  const operation = async () => {
    check();
    const bearer = requireClerkToken(await getToken());
    check();
    const response = await fetch(apiUrl(`/api/q/${encodeURIComponent(shareToken)}/html`), {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${bearer}`, Accept: 'text/html' },
    });
    check();
    if (!response.ok)
      throw new ApiError(
        'The saved document is unavailable.',
        response.status,
        '/api/q/[token]/html',
      );
    if (
      response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'text/html'
    )
      throw new Error('The server did not return a quote document.');
    const html = await response.text();
    check();
    if (!html.trim() || html.length > 2000000)
      throw new Error('The quote document is empty or too large to preview. Use the PDF download.');
    return html;
  };
  try {
    return await Promise.race([operation(), aborted]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}
