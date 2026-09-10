import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { authHeader } from '@/lib/session';
import { themes as mockThemes } from '@/lib/theme';
import { BusinessAddressField } from './BusinessAddressField';
import { activationBearerToken } from './activation-session';

let mockUser = 'user_A', mockSession = 'session_A';
const mockToken = jest.fn<Promise<string | null>, []>();
const mockChange = jest.fn();
const mockCapture = jest.fn();
let mockAppState: (state: AppStateStatus) => void;
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ userId: mockUser, sessionId: mockSession, getToken: mockToken }) }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: mockThemes.dark }) }));
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://api.test${path}` }));
jest.mock('@/lib/session', () => ({ authHeader: jest.fn(async () => { throw new Error('No legacy fallback'); }) }));
jest.mock('@/lib/monitoring', () => ({ captureAppError: (...args: unknown[]) => mockCapture(...args) }));

const ADDRESS = '12 Example Street, Sydney NSW 2000';
const row = { id: 'address-1', address: ADDRESS, state: 'NSW', postcode: '2000' };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const field = (props: Partial<ComponentProps<typeof BusinessAddressField>> = {}) => <BusinessAddressField value="12 Example" onChange={mockChange} {...props} />;
let request: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks(); mockUser = 'user_A'; mockSession = 'session_A'; mockToken.mockReset().mockResolvedValue('fresh-A');
  request = jest.spyOn(global, 'fetch').mockResolvedValue(response({ ok: true, suggestions: [row] }));
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { mockAppState = callback; return { remove: jest.fn() }; });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('does no lookup on mount or typing; an explicit lookup uses the fresh owned token and selection only edits the form', async () => {
  const ui = await render(field()); expect(request).not.toHaveBeenCalled(); expect(mockToken).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Business address'), '  12 Example Street  ');
  expect(mockChange).toHaveBeenCalledWith('  12 Example Street  '); await ui.rerender(field({ value: '  12 Example Street  ' }));
  expect(request).not.toHaveBeenCalled(); mockChange.mockClear();
  await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  await screen.findByRole('button', { name: `Use business address ${ADDRESS}` });
  expect(request).toHaveBeenCalledWith('https://api.test/api/roofing/suggest-address', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ query: '12 Example Street' }), headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer fresh-A' },
  }));
  expect(authHeader).not.toHaveBeenCalled(); expect(mockChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: `Use business address ${ADDRESS}` }));
  expect(mockChange).toHaveBeenCalledWith(ADDRESS); expect(request).toHaveBeenCalledTimes(1);
});

it('uses the exact pending activation-session getter instead of the unrelated active account', async () => {
  const pendingToken = jest.fn(async () => 'pending-session-token'); const otherActiveToken = jest.fn(async () => 'wrong-active-token');
  const getAccessToken = () => activationBearerToken({ sessionId: 'pending_session', activeSessionId: 'other_active_session',
    sessions: [{ id: 'pending_session', getToken: pendingToken }], getActiveToken: otherActiveToken });
  await render(field({ scopeKey: 'pending_user:pending_session', getAccessToken }));
  await fireEvent.press(screen.getByRole('button', { name: 'Find address' })); await screen.findByRole('button', { name: `Use business address ${ADDRESS}` });
  expect(pendingToken).toHaveBeenCalledTimes(1); expect(otherActiveToken).not.toHaveBeenCalled(); expect(mockToken).not.toHaveBeenCalled(); expect(authHeader).not.toHaveBeenCalled();
  expect(request.mock.calls[0]![1].headers.Authorization).toBe('Bearer pending-session-token');
});
it('keeps pending-session lookup unavailable when its exact session is missing rather than borrowing another active bearer', async () => {
  const otherActiveToken = jest.fn(async () => 'wrong-active-token');
  const getAccessToken = () => activationBearerToken({ sessionId: 'missing_pending_session', activeSessionId: 'other_active_session', sessions: [], getActiveToken: otherActiveToken });
  await render(field({ scopeKey: 'pending_user:missing_pending_session', getAccessToken }));
  await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  await screen.findByText('Address suggestions are unavailable. You can enter your address manually.');
  expect(otherActiveToken).not.toHaveBeenCalled(); expect(mockToken).not.toHaveBeenCalled(); expect(authHeader).not.toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
});

it.each([null, undefined, ''])('does not use anonymous or legacy authentication when the exact supplied token is missing (%s)', async token => {
  await render(field({ getAccessToken: async () => token, scopeKey: 'pending_user:missing_session' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  await screen.findByText('Address suggestions are unavailable. You can enter your address manually.');
  expect(request).not.toHaveBeenCalled(); expect(authHeader).not.toHaveBeenCalled(); expect(mockToken).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Business address').props.value).toBe('12 Example');
});

it.each(['network', 'returned', 'invalid-json'] as const)('retains manual input after a %s failure without fabricating suggestions', async failure => {
  if (failure === 'network') request.mockRejectedValueOnce(new TypeError('private request details'));
  else if (failure === 'returned') request.mockResolvedValueOnce(response({ ok: false, code: 'provider_unavailable', detail: 'private provider configuration' }));
  else {
    const invalid = response({});
    jest.spyOn(invalid, 'json').mockRejectedValueOnce(new SyntaxError('private response'));
    request.mockResolvedValueOnce(invalid);
  }
  await render(field({ value: 'My manually entered address' })); await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  await screen.findByText('Address suggestions are unavailable. You can enter your address manually.');
  expect(screen.getByLabelText('Business address').props.value).toBe('My manually entered address'); expect(mockChange).not.toHaveBeenCalled();
  expect(screen.queryByText('private response')).toBeNull(); expect(screen.queryByText('private request details')).toBeNull();
  expect(screen.queryByText('private provider configuration')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Business address'), 'My updated manual address'); expect(mockChange).toHaveBeenCalledWith('My updated manual address');
});

it('distinguishes an empty matching result from provider failure and keeps the manual address', async () => {
  request.mockResolvedValueOnce(response({ ok: true, suggestions: [] })); await render(field());
  await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  await screen.findByText('No matching addresses were found. You can enter your address manually.'); expect(mockChange).not.toHaveBeenCalled();
});

it('enforces the 3-to-200 character lookup range and native input length without truncating a request', async () => {
  const ui = await render(field({ value: 'ab' })); expect(screen.getByLabelText('Business address').props.maxLength).toBe(200);
  expect(screen.getByRole('button', { name: 'Find address' })).toBeDisabled();
  await ui.rerender(field({ value: 'x'.repeat(201) })); expect(screen.getByRole('button', { name: 'Find address' })).toBeDisabled();
  expect(request).not.toHaveBeenCalled(); await ui.rerender(field({ value: 'x'.repeat(200) }));
  await fireEvent.press(screen.getByRole('button', { name: 'Find address' })); await screen.findByRole('button', { name: `Use business address ${ADDRESS}` });
  expect(JSON.parse(request.mock.calls[0]![1].body)).toEqual({ query: 'x'.repeat(200) });
});

it.each([
  { label: 'too many rows', value: { ok: true, suggestions: Array.from({ length: 21 }, (_, i) => ({ ...row, id: String(i) })) } },
  { label: 'overlong address', value: { ok: true, suggestions: [{ ...row, address: 'x'.repeat(201) }] } },
  { label: 'overlong ID', value: { ok: true, suggestions: [{ ...row, id: 'x'.repeat(257) }] } },
  { label: 'blank address', value: { ok: true, suggestions: [{ ...row, address: '   ' }] } },
  { label: 'incorrect shape', value: { ok: true, suggestions: [{ id: 'id', address: ADDRESS }] } },
])('rejects $label before showing any selectable result', async ({ value }) => {
  request.mockResolvedValueOnce(response(value)); await render(field()); await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  await screen.findByText('Address suggestions are unavailable. You can enter your address manually.');
  expect(screen.queryAllByRole('button').filter(button => String(button.props.accessibilityLabel).startsWith('Use business address'))).toHaveLength(0);
  expect(mockChange).not.toHaveBeenCalled();
});

it('accepts 20 results with a complete 200-character address and 256-character ID at the declared boundaries', async () => {
  request.mockResolvedValueOnce(response({ ok: true, suggestions: [
    { ...row, id: 'i'.repeat(256), address: 'x'.repeat(200) },
    ...Array.from({ length: 19 }, (_, index) => ({ ...row, id: `other-${index}`, address: `${index} Other Road` })),
  ] }));
  await render(field()); await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  const choice = await screen.findByRole('button', { name: `Use business address ${'x'.repeat(200)}` });
  expect(screen.getAllByRole('button').filter(button => String(button.props.accessibilityLabel).startsWith('Use business address'))).toHaveLength(20);
  await fireEvent.press(choice);
  expect(mockChange).toHaveBeenCalledWith('x'.repeat(200));
});

it('bounds token acquisition and ignores a token that resolves after its five-second budget', async () => {
  jest.useFakeTimers(); const pending = deferred<string>(); mockToken.mockReturnValueOnce(pending.promise);
  await render(field()); await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  await act(() => jest.advanceTimersByTimeAsync(5001)); await screen.findByText('Address suggestions are unavailable. You can enter your address manually.');
  await act(() => pending.resolve('late-token')); expect(request).not.toHaveBeenCalled(); expect(authHeader).not.toHaveBeenCalled();
});

it('serializes duplicate lookup taps before token acquisition finishes', async () => {
  const pending = deferred<string>(); mockToken.mockReturnValueOnce(pending.promise); await render(field());
  const press = screen.getByRole('button', { name: 'Find address' }).props.onPress;
  await act(() => { press(); press(); }); expect(mockToken).toHaveBeenCalledTimes(1);
  await act(() => pending.resolve('one-token')); await screen.findByRole('button', { name: `Use business address ${ADDRESS}` }); expect(request).toHaveBeenCalledTimes(1);
});

it.each(['value', 'disabled', 'scope', 'account-aba', 'unmount'] as const)('prevents an old token from dispatching after %s changes', async boundary => {
  const pending = deferred<string>(); mockToken.mockReturnValueOnce(pending.promise); const ui = await render(field());
  await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  if (boundary === 'unmount') await ui.unmount();
  else if (boundary === 'account-aba') {
    mockUser = 'user_B'; mockSession = 'session_B'; await ui.rerender(field());
    mockUser = 'user_A'; mockSession = 'session_A'; await ui.rerender(field());
  } else await ui.rerender(field(boundary === 'value' ? { value: 'Different query' } : boundary === 'disabled' ? { disabled: true } : { scopeKey: 'other_pending_session' }));
  await act(() => pending.resolve('stale-token')); expect(request).not.toHaveBeenCalled(); expect(mockChange).not.toHaveBeenCalled();
});

it.each(['value', 'disabled', 'scope', 'account-aba', 'unmount'] as const)('aborts an in-flight body and suppresses late suggestions after %s changes', async boundary => {
  const body = deferred<unknown>(); request.mockResolvedValueOnce({ ok: true, json: () => body.promise } as Response);
  const ui = await render(field()); await fireEvent.press(screen.getByRole('button', { name: 'Find address' })); await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  const signal = request.mock.calls[0]![1].signal as AbortSignal;
  if (boundary === 'unmount') await ui.unmount();
  else if (boundary === 'account-aba') {
    mockUser = 'user_B'; mockSession = 'session_B'; await ui.rerender(field());
    mockUser = 'user_A'; mockSession = 'session_A'; await ui.rerender(field());
  } else await ui.rerender(field(boundary === 'value' ? { value: 'Different query' } : boundary === 'disabled' ? { disabled: true } : { scopeKey: 'other_pending_session' }));
  expect(signal.aborted).toBe(true); await act(() => body.resolve({ ok: true, suggestions: [row] }));
  expect(mockChange).not.toHaveBeenCalled(); if (boundary !== 'unmount') expect(screen.queryByRole('button', { name: `Use business address ${ADDRESS}` })).toBeNull();
});

it('aborts a background lookup and requires another explicit tap on return', async () => {
  const body = deferred<unknown>(); request.mockResolvedValueOnce({ ok: true, json: () => body.promise } as Response);
  await render(field()); await fireEvent.press(screen.getByRole('button', { name: 'Find address' })); await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await act(() => mockAppState('background')); await screen.findByText('Address suggestions are unavailable. You can enter your address manually.');
  await act(() => { mockAppState('active'); body.resolve({ ok: true, suggestions: [row] }); });
  expect(screen.queryByRole('button', { name: `Use business address ${ADDRESS}` })).toBeNull(); expect(request).toHaveBeenCalledTimes(1);
});

it.each(['input', 'account-aba', 'disabled', 'new-search'] as const)('ignores an already captured suggestion callback after %s invalidates it', async boundary => {
  const ui = await render(field()); await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  const press = (await screen.findByRole('button', { name: `Use business address ${ADDRESS}` })).props.onPress;
  let next: ReturnType<typeof deferred<Response>> | undefined;
  if (boundary === 'new-search') {
    next = deferred<Response>(); request.mockReturnValueOnce(next.promise); await fireEvent.press(screen.getByRole('button', { name: 'Find address' }));
  } else if (boundary === 'account-aba') {
    mockUser = 'user_B'; mockSession = 'session_B'; await ui.rerender(field());
    mockUser = 'user_A'; mockSession = 'session_A'; await ui.rerender(field());
  } else await ui.rerender(field(boundary === 'input' ? { value: 'Manual replacement' } : { disabled: true }));
  await act(() => press()); expect(mockChange).not.toHaveBeenCalled();
  if (next) {
    expect((request.mock.calls[1]![1].signal as AbortSignal).aborted).toBe(false);
    await act(() => next!.resolve(response({ ok: true, suggestions: [{ ...row, address: 'Fresh address' }] })));
    await screen.findByRole('button', { name: 'Use business address Fresh address' });
  }
});
