import { loadOwnerQuoteHtml } from './quote-document';
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://quotemax.test${path}` }));
const mockFetch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
});
function response(
  text = '<html>Saved quote</html>',
  status = 200,
  mime = 'text/html; charset=utf-8',
) {
  return {
    ok: status === 200,
    status,
    headers: new Headers({ 'Content-Type': mime }),
    text: async () => text,
  };
}
it('uses fresh owner credentials and returns only customer-document HTML', async () => {
  mockFetch.mockResolvedValue(response());
  await expect(
    loadOwnerQuoteHtml('held-capability', async () => 'owner', new AbortController().signal),
  ).resolves.toBe('<html>Saved quote</html>');
  expect(mockFetch).toHaveBeenCalledWith(
    'https://quotemax.test/api/q/held-capability/html',
    expect.objectContaining({ headers: { Authorization: 'Bearer owner', Accept: 'text/html' } }),
  );
});
it('bounds an ignored body abort and does not leak the capability in errors', async () => {
  mockFetch.mockResolvedValue({ ...response(), text: () => new Promise(() => {}) });
  await expect(
    loadOwnerQuoteHtml('private-capability', async () => 'owner', new AbortController().signal, 1),
  ).rejects.toMatchObject({ name: 'AbortError' });
  mockFetch.mockResolvedValue(response('', 403));
  await expect(
    loadOwnerQuoteHtml('private-capability', async () => 'owner', new AbortController().signal),
  ).rejects.toMatchObject({ status: 403, path: '/api/q/[token]/html' });
});
it('does not fetch after cancellation during token acquisition', async () => {
  let ready: (value: string) => void = () => {};
  const controller = new AbortController();
  const promise = loadOwnerQuoteHtml(
    'capability',
    () =>
      new Promise(resolve => {
        ready = resolve;
      }),
    controller.signal,
  );
  const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  ready('late-token');
  await rejected;
  expect(mockFetch).not.toHaveBeenCalled();
});
it('rejects unexpected document types and empty or oversized content', async () => {
  for (const result of [
    response('{}', 200, 'application/json'),
    response(''),
    response('x'.repeat(2000001)),
  ]) {
    mockFetch.mockResolvedValue(result);
    await expect(
      loadOwnerQuoteHtml('capability', async () => 'owner', new AbortController().signal),
    ).rejects.toThrow();
  }
});
