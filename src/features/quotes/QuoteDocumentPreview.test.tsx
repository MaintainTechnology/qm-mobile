import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { downloadAndShare } from '@/lib/download';
import { QuoteDocumentPreview } from './QuoteDocumentPreview';

jest.mock('react-native-webview', () => ({
  WebView: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual('react-native');
    return <View {...props} testID="customer-document-renderer" />;
  },
}));
jest.mock('@/lib/download', () => ({ downloadAndShare: jest.fn() }));
jest.mock('./quote-document', () => ({
  loadOwnerQuoteHtml: jest.fn(async () => '<html><body>Customer quote</body></html>'),
}));
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://quotemax.test${path}` }));
const mockGetToken = jest.fn(async () => 'owner-token');
jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ userId: 'user_a', sessionId: 'session_a', getToken: mockGetToken }),
}));
const download = jest.mocked(downloadAndShare);
const props = { quoteId: 'quote_a', revision: 'a'.repeat(64), token: 'customer-token' };
beforeEach(() => {
  jest.clearAllMocks();
  download.mockResolvedValue(undefined);
  mockGetToken.mockResolvedValue('owner-token');
});
afterEach(() => {
  jest.useRealTimers();
});

it('isolates the customer renderer from scripts, cookies, file access and unrelated navigation', async () => {
  const screen = await render(<QuoteDocumentPreview {...props} />);
  const renderer = await screen.findByTestId('customer-document-renderer');
  expect(renderer.props.javaScriptEnabled).toBe(false);
  expect(renderer.props.domStorageEnabled).toBe(false);
  expect(renderer.props.sharedCookiesEnabled).toBe(false);
  expect(renderer.props.allowFileAccess).toBe(false);
  expect(renderer.props.source).not.toHaveProperty('headers');
  expect(renderer.props.onShouldStartLoadWithRequest({ url: 'about:blank' })).toBe(true);
  expect(renderer.props.onShouldStartLoadWithRequest({ url: 'https://other.test/steal' })).toBe(
    false,
  );
  expect(renderer.props.onShouldStartLoadWithRequest({ url: 'file:///secret' })).toBe(false);
});

it('shows a bounded preview timeout and retains the explicit PDF fallback', async () => {
  jest.useFakeTimers();
  const screen = await render(<QuoteDocumentPreview {...props} />);
  await screen.findByTestId('customer-document-renderer');
  await act(() => screen.getByTestId('customer-document-renderer').props.onLoadStart());
  await act(() => jest.advanceTimersByTime(30000));
  expect(screen.getByText('The preview timed out. The PDF remains available.')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Download or share PDF/i })).toBeTruthy();
});

it('only downloads after an explicit request and aborts that transfer when the quote changes', async () => {
  download.mockImplementation(() => new Promise(() => {}));
  const screen = await render(<QuoteDocumentPreview {...props} />);
  expect(download).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: /Download or share PDF/i }));
  await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
  const args = download.mock.calls[0]![0];
  expect(args).toMatchObject({
    path: '/api/q/customer-token/pdf',
    token: 'owner-token',
    mimeType: 'application/pdf',
  });
  await screen.rerender(<QuoteDocumentPreview {...props} quoteId="quote_b" token="other-token" />);
  expect(args.signal?.aborted).toBe(true);
  expect(download).toHaveBeenCalledTimes(1);
});

it('does not download if credentials settle after the document is closed', async () => {
  let ready: (token: string) => void = () => {};
  mockGetToken.mockReturnValueOnce(
    new Promise(resolve => {
      ready = resolve;
    }),
  );
  const screen = await render(<QuoteDocumentPreview {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: /Download or share PDF/i }));
  await screen.unmount();
  await act(async () => {
    ready('late-owner-token');
    await Promise.resolve();
  });
  expect(download).not.toHaveBeenCalled();
});
