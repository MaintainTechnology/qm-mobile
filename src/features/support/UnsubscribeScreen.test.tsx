import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { authHeader } from '@/lib/session';
import { themes as mockThemes } from '@/lib/theme';
import { UnsubscribeScreen } from './UnsubscribeScreen';

const TOKEN_A = `eyJ0IjoiZml4dHVyZSIsImUiOiJwcml2YXRlQGV4YW1wbGUudGVzdCJ9.${'a'.repeat(43)}`;
const TOKEN_B = `eyJ0Ijoib3RoZXIiLCJlIjoib3RoZXJAZXhhbXBsZS50ZXN0In0.${'b'.repeat(43)}`;
let mockToken: string | string[] | undefined = TOKEN_A;
let mockUser: string | null = null, mockSession: string | null = null, mockOnline = true, mockCanGoBack = false, mockAuthLoaded = true;
const mockBack = jest.fn(), mockReplace = jest.fn(), mockCapture = jest.fn();
let mockAppState: (state: AppStateStatus) => void;
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ isLoaded: mockAuthLoaded, userId: mockUser, sessionId: mockSession }) }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ token: mockToken }), useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }) }));
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: mockOnline, isInternetReachable: mockOnline }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: mockThemes.dark }) }));
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://api.test${path}` }));
jest.mock('@/lib/query', () => ({ netInfoIsOnline: (network: { isConnected: boolean }) => network.isConnected }));
jest.mock('@/lib/session', () => ({ authHeader: jest.fn(async () => { throw new Error('Guest must not read session storage'); }) }));
jest.mock('@/lib/monitoring', () => ({ captureAppError: (...args: unknown[]) => mockCapture(...args) }));
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
let fetchMock: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks(); mockToken = TOKEN_A; mockUser = null; mockSession = null; mockOnline = true; mockCanGoBack = false; mockAuthLoaded = true;
  fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response({ ok: true, status: 'unsubscribed' }));
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { mockAppState = callback; return { remove: jest.fn() }; });
});
afterEach(() => { jest.restoreAllMocks(); });
it('does no request on guest mount and confirms only an explicit anonymous server response without revealing token identity', async () => {
  await render(<UnsubscribeScreen />);
  expect(fetchMock).not.toHaveBeenCalled(); expect(authHeader).not.toHaveBeenCalled();
  expect(JSON.stringify(screen.toJSON())).not.toContain('private@example.test'); expect(JSON.stringify(screen.toJSON())).not.toContain(TOKEN_A);
  await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' })); await screen.findByText("You're unsubscribed");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(`https://api.test/api/email/unsubscribe/${TOKEN_A}`, expect.objectContaining({ method: 'GET', credentials: 'omit', headers: { Accept: 'application/json' } }));
  expect(authHeader).not.toHaveBeenCalled();
});
it('permits the explicit signed-capability action while Clerk has not loaded', async () => {
  mockAuthLoaded = false; await render(<UnsubscribeScreen />);
  expect(screen.getByRole('button', { name: 'Unsubscribe' })).toBeEnabled(); expect(fetchMock).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' })); await screen.findByText("You're unsubscribed");
  expect(authHeader).not.toHaveBeenCalled(); expect(fetchMock).toHaveBeenCalledTimes(1);
});
it.each([undefined, '', 'bad.token', [TOKEN_A, TOKEN_B], `../${TOKEN_A}`, 'x'.repeat(2048)].map(input => ({ input })))('rejects malformed or ambiguous route input without a request ($input)', async ({ input }) => {
  mockToken = input; await render(<UnsubscribeScreen />);
  expect(screen.getByText('This unsubscribe link is unavailable')).toBeTruthy(); expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Unsubscribe' })).toBeNull();
});
it('serializes duplicate taps before the server reply and prevents another submission after confirmation', async () => {
  const pending = deferred<Response>(); fetchMock.mockReturnValueOnce(pending.promise);
  await render(<UnsubscribeScreen />); const press = screen.getByRole('button', { name: 'Unsubscribe' }).props.onPress;
  await act(() => { press(); press(); }); expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(() => pending.resolve(response({ ok: true, status: 'unsubscribed' })));
  await screen.findByText("You're unsubscribed"); await act(() => press()); expect(fetchMock).toHaveBeenCalledTimes(1);
});
it.each(['transport', 'malformed', 'server'] as const)('retains an unconfirmed %s result and retries the exact idempotent suppression only on another tap', async failure => {
  if (failure === 'transport') fetchMock.mockRejectedValueOnce(new TypeError('connection lost'));
  else fetchMock.mockResolvedValueOnce(response(failure === 'malformed' ? { ok: true } : { ok: false, error: 'unsubscribe_unavailable' }, failure === 'server' ? 500 : 200));
  await render(<UnsubscribeScreen />); await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' }));
  await screen.findByText('Unsubscribe not confirmed'); expect(screen.queryByText("You're unsubscribed")).toBeNull();
  expect(JSON.stringify(mockCapture.mock.calls)).not.toContain(TOKEN_A);
  await fireEvent.press(screen.getByRole('button', { name: 'Try unsubscribe again' })); await screen.findByText("You're unsubscribed");
  expect(fetchMock).toHaveBeenCalledTimes(2); expect(fetchMock.mock.calls[1]![0]).toBe(fetchMock.mock.calls[0]![0]);
});
it('keeps a verified invalid-link rejection terminal until a different link is opened', async () => {
  fetchMock.mockResolvedValueOnce(response({ ok: false, error: 'invalid_link' }, 400));
  await render(<UnsubscribeScreen />); await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' }));
  await screen.findByText('This unsubscribe link is unavailable'); expect(screen.queryByRole('button', { name: 'Try unsubscribe again' })).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('keeps offline action unconfirmed and never sends automatically on reconnect or foreground', async () => {
  mockOnline = false; const ui = await render(<UnsubscribeScreen />); await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' }));
  await screen.findByText('Unsubscribe not confirmed'); expect(fetchMock).not.toHaveBeenCalled();
  mockOnline = true; await ui.rerender(<UnsubscribeScreen />); await act(() => mockAppState('active'));
  expect(fetchMock).not.toHaveBeenCalled(); await fireEvent.press(screen.getByRole('button', { name: 'Try unsubscribe again' })); await screen.findByText("You're unsubscribed");
});
it('aborts and ignores a late old-token reply after another link replaces the screen', async () => {
  const pending = deferred<Response>(); fetchMock.mockReturnValueOnce(pending.promise);
  const ui = await render(<UnsubscribeScreen />); await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' }));
  const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
  mockToken = TOKEN_B; await ui.rerender(<UnsubscribeScreen />); expect(signal.aborted).toBe(true);
  await act(() => pending.resolve(response({ ok: true, status: 'unsubscribed' })));
  expect(screen.queryByText("You're unsubscribed")).toBeNull(); expect(fetchMock).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' })); await screen.findByText("You're unsubscribed");
  expect(fetchMock.mock.calls[1]![0]).toBe(`https://api.test/api/email/unsubscribe/${TOKEN_B}`);
});
it('keeps a background-interrupted body unconfirmed and discards a late acknowledgement', async () => {
  const body = deferred<unknown>(); fetchMock.mockResolvedValueOnce({ ok: true, json: () => body.promise } as Response);
  await render(<UnsubscribeScreen />); await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' }));
  await act(() => mockAppState('background')); await screen.findByText('Unsubscribe not confirmed');
  await act(() => body.resolve({ ok: true, status: 'unsubscribed' })); expect(screen.queryByText("You're unsubscribed")).toBeNull();
});
it('does not revive an old acknowledgement after an account A to B to A transition', async () => {
  mockUser = 'user_A'; mockSession = 'session_A';
  const pending = deferred<Response>(); fetchMock.mockReturnValueOnce(pending.promise);
  const ui = await render(<UnsubscribeScreen />); await fireEvent.press(screen.getByRole('button', { name: 'Unsubscribe' }));
  const signal = fetchMock.mock.calls[0]![1].signal as AbortSignal;
  mockUser = 'user_B'; mockSession = 'session_B'; await ui.rerender(<UnsubscribeScreen />);
  mockUser = 'user_A'; mockSession = 'session_A'; await ui.rerender(<UnsubscribeScreen />);
  await act(() => pending.resolve(response({ ok: true, status: 'unsubscribed' })));
  expect(signal.aborted).toBe(true); expect(screen.queryByText("You're unsubscribed")).toBeNull(); expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Unsubscribe' })).toBeEnabled();
});
it.each([false, true])('provides a safe cold Back destination without requiring sign-in (signedIn=%s)', async signedIn => {
  mockUser = signedIn ? 'user_A' : null; const ui = await render(<UnsubscribeScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Back' })); expect(mockReplace).toHaveBeenCalledWith(signedIn ? '/menu' : '/welcome');
  mockCanGoBack = true; await ui.rerender(<UnsubscribeScreen />); await fireEvent.press(screen.getByRole('button', { name: 'Back' })); expect(mockBack).toHaveBeenCalledTimes(1);
});
