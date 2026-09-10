import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AppState, type AppStateStatus } from 'react-native';
import { apiRequest } from '@/lib/api';
import { clearAllWorkingDrafts } from '@/lib/working-draft-storage';
import { createContactDraftStore } from './contact-draft';
import { loadContactReceipt } from './contact-receipt';
import { EMPTY_CONTACT_DRAFT } from './contact-contract';
import { SupportScreen } from './SupportScreen';

let mockUser: string | null = 'user_A';
let mockSession = 'session_A';
let mockOnline = true;
const mockPush = jest.fn();
const mockPreventRemove = jest.fn();
let mockSendPress: () => void;
let mockAppState: (state: AppStateStatus) => void;
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ isLoaded: true, userId: mockUser, sessionId: mockSession }) }));
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: mockOnline, isInternetReachable: mockOnline }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockPush }) }));
jest.mock('@/lib/query', () => ({ netInfoIsOnline: (network: { isConnected: boolean }) => network.isConnected }));
jest.mock('@/lib/api', () => ({ apiRequest: jest.fn(), apiErrorMessage: (_error: unknown, fallback: string) => fallback, ApiError: class extends Error {} }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../sections/SectionScreen', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { SectionScreen: ({ children }: { children: unknown }) => React.createElement(View, null, children) };
});
jest.mock('@/features/auth/ui', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text, TextInput } = jest.requireActual('react-native');
  return {
    Field: ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) => React.createElement(TextInput, { accessibilityLabel: label, value, onChangeText }),
    PrimaryCta: ({ label, disabled, loading, onPress }: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }) => {
      if (label === 'Send message') mockSendPress = onPress;
      return React.createElement(Pressable, {
        accessibilityRole: 'button', accessibilityLabel: label, disabled: disabled || loading, onPress,
      }, React.createElement(Text, null, label));
    },
  };
});
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_: string, s: string) => crypto.createHash('sha256').update(s).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true), getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const get = jest.mocked(SecureStore.getItemAsync), set = jest.mocked(SecureStore.setItemAsync), remove = jest.mocked(SecureStore.deleteItemAsync);
const scope = { userId: 'user_A' };
const input = { ...EMPTY_CONTACT_DRAFT, name: 'Alex', email: 'private@example.invalid', message: 'Private support request' };
beforeEach(async () => {
  mockUser = 'user_A'; mockSession = 'session_A'; mockOnline = true;
  get.mockImplementation(async key => storage.get(key) ?? null);
  set.mockImplementation(async (key, value) => { storage.set(key, value); });
  remove.mockImplementation(async key => { storage.delete(key); });
  storage.clear(); await clearAllWorkingDrafts(); jest.clearAllMocks();
  jest.mocked(apiRequest).mockReset().mockResolvedValue({ ok: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    mockAppState = callback;
    return { remove: jest.fn() };
  });
});
type UI = Awaited<ReturnType<typeof render>>;
async function ready(ui: UI) { await waitFor(() => expect(ui.getByRole('button', { name: 'Send message' })).toBeEnabled()); }
async function filled() {
  const ui = await render(<SupportScreen />); await ready(ui);
  await fireEvent.changeText(ui.getByLabelText('Name'), input.name);
  await fireEvent.changeText(ui.getByLabelText('Email'), input.email);
  await fireEvent.changeText(ui.getByLabelText('Message'), input.message);
  await ready(ui); return ui;
}
it('stores the exact input before a public send and clears only the acknowledged working copy', async () => {
  const ui = await filled();
  jest.mocked(apiRequest).mockImplementationOnce(async (_path, _schema, options) => {
    expect(options?.body).toEqual(input);
    expect((await createContactDraftStore(scope).load())?.value).toEqual(input);
    expect((await loadContactReceipt(scope))?.status).toBe('unknown');
    return { ok: true };
  });
  await fireEvent.press(ui.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(ui.getByText('Message sent')).toBeTruthy());
  await waitFor(async () => expect(await createContactDraftStore(scope).load()).toBeNull());
  expect(apiRequest).toHaveBeenCalledTimes(1);
});
it('preserves an offline draft and does not start a receipt or provider request', async () => {
  mockOnline = false; const ui = await filled();
  await fireEvent.press(ui.getByRole('button', { name: 'Send message' }));
  expect(ui.getByText(/You are offline/)).toBeTruthy();
  expect(apiRequest).not.toHaveBeenCalled(); expect(await loadContactReceipt(scope)).toBeNull();
  expect((await createContactDraftStore(scope).load())?.value).toEqual(input);
});
it('survives a lost acknowledgement and remount without exposing any retry/new-send action', async () => {
  const ui = await filled(); jest.mocked(apiRequest).mockRejectedValueOnce(new TypeError('Lost response'));
  await fireEvent.press(ui.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(ui.getByText('Send outcome unknown')).toBeTruthy());
  const receipt = await loadContactReceipt(scope);
  await ui.unmount();
  const reopened = await render(<SupportScreen />);
  await waitFor(() => expect(reopened.getByText('Send outcome unknown')).toBeTruthy());
  expect(reopened.getByRole('button', { name: 'Send message' })).toBeDisabled();
  expect(reopened.queryByRole('button', { name: 'Write another message' })).toBeNull();
  await fireEvent.press(reopened.getByRole('button', { name: 'Send message' }));
  expect(apiRequest).toHaveBeenCalledTimes(1); expect(await loadContactReceipt(scope)).toEqual(receipt);
});
it('ignores a late old-account response and does not erase the new account working copy', async () => {
  const ui = await filled(); let finish!: (value: unknown) => void;
  jest.mocked(apiRequest).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await fireEvent.press(ui.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  mockUser = 'user_B'; mockSession = 'session_B'; await ui.rerender(<SupportScreen />); await ready(ui);
  expect(ui.getByLabelText('Email').props.value).toBe('');
  await fireEvent.changeText(ui.getByLabelText('Name'), 'B working draft'); await ready(ui);
  await act(async () => { finish({ ok: true }); });
  expect(ui.queryByText('Message sent')).toBeNull();
  expect((await createContactDraftStore({ userId: 'user_B' }).load())?.value.name).toBe('B working draft');
  expect((await loadContactReceipt(scope))?.status).toBe('unknown');
});
it('cannot reactivate a prior callback after A to B to A with the same original session', async () => {
  const ui = await filled(); let finish!: (value: unknown) => void;
  jest.mocked(apiRequest).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await fireEvent.press(ui.getByRole('button', { name: 'Send message' })); await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  mockUser = 'user_B'; mockSession = 'session_B'; await ui.rerender(<SupportScreen />); await ready(ui);
  mockUser = 'user_A'; mockSession = 'session_A'; await ui.rerender(<SupportScreen />);
  await waitFor(() => expect(ui.getByText('Send outcome unknown')).toBeTruthy());
  await act(async () => { finish({ ok: true }); });
  expect(ui.queryByText('Message sent')).toBeNull();
  expect((await createContactDraftStore(scope).load())?.value).toEqual(input);
  expect((await loadContactReceipt(scope))?.status).toBe('unknown');
});
it('blocks edits and duplicate taps while awaiting an acknowledgement', async () => {
  const ui = await filled(); let finish!: (value: unknown) => void;
  jest.mocked(apiRequest).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const press = mockSendPress;
  await act(async () => { press(); press(); });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  await fireEvent.changeText(ui.getByLabelText('Name'), 'Later edit');
  expect(ui.getByLabelText('Name').props.value).toBe(input.name);
  await act(async () => { finish({ ok: true }); });
  await waitFor(() => expect(ui.getByText('Message sent')).toBeTruthy());
  expect(apiRequest).toHaveBeenCalledTimes(1);
});
it('keeps unread data intact and requires a successful storage retry before accepting input', async () => {
  await createContactDraftStore(scope).save(input);
  get.mockImplementation(async key => { if (key.endsWith('.manifest')) throw new Error('Unreadable'); return storage.get(key) ?? null; });
  const ui = await render(<SupportScreen />);
  await waitFor(() => expect(ui.getByRole('button', { name: 'Retry local storage' })).toBeTruthy());
  await fireEvent.changeText(ui.getByLabelText('Name'), 'Overwrite');
  expect(ui.getByRole('button', { name: 'Send message' })).toBeDisabled();
  get.mockImplementation(async key => storage.get(key) ?? null);
  await fireEvent.press(ui.getByRole('button', { name: 'Retry local storage' })); await ready(ui);
  expect(ui.getByLabelText('Name').props.value).toBe(input.name);
  expect(apiRequest).not.toHaveBeenCalled();
});
it('guards Back after failed input persistence and offers public Help after it recovers', async () => {
  const ui = await filled();
  set.mockRejectedValueOnce(new Error('Disk full'));
  await fireEvent.changeText(ui.getByLabelText('Name'), 'New name');
  await waitFor(() => expect(ui.getByRole('button', { name: 'Retry local storage' })).toBeTruthy());
  expect(mockPreventRemove.mock.calls.at(-1)?.[0]).toBe(true);
  expect(ui.getByRole('button', { name: 'Browse Help & guides' })).toBeDisabled();
  await fireEvent.press(ui.getByRole('button', { name: 'Retry local storage' })); await ready(ui);
  await fireEvent.press(ui.getByRole('button', { name: 'Browse Help & guides' }));
  expect(mockPush).toHaveBeenCalledWith('/sections/help');
  expect((await createContactDraftStore(scope).load())?.value.name).toBe('New name');
});
it('does not extend an unchanged encrypted draft retention window on background', async () => {
  await filled();
  const before = [...storage.entries()];
  const writesBefore = set.mock.calls.length;
  await act(() => mockAppState('background'));
  expect(set).toHaveBeenCalledTimes(writesBefore);
  expect([...storage.entries()]).toEqual(before);
});
it('keeps a confirmed send cleanup failure visible on background until explicit reconciliation succeeds', async () => {
  const ui = await filled();
  remove.mockImplementation(async key => {
    if (key.startsWith('quotemax.working-draft.')) throw new Error('Confirmed draft removal failed');
    storage.delete(key);
  });
  await fireEvent.press(ui.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(ui.getByText('Message sent')).toBeTruthy());
  await waitFor(() => expect(ui.getByRole('button', { name: 'Retry local storage' })).toBeTruthy());
  expect(ui.getByRole('button', { name: 'Write another message' })).toBeDisabled();
  await act(() => mockAppState('background'));
  expect(ui.getByRole('button', { name: 'Retry local storage' })).toBeTruthy();
  expect(ui.getByRole('button', { name: 'Write another message' })).toBeDisabled();
  expect(apiRequest).toHaveBeenCalledTimes(1);
  remove.mockImplementation(async key => { storage.delete(key); });
  await fireEvent.press(ui.getByRole('button', { name: 'Retry local storage' }));
  await waitFor(() => expect(ui.getByRole('button', { name: 'Write another message' })).toBeEnabled());
  expect(await createContactDraftStore(scope).load()).toBeNull();
  expect((await loadContactReceipt(scope))?.status).toBe('confirmed');
  expect(apiRequest).toHaveBeenCalledTimes(1);
});
it('keeps Back guarded for rapid A to B to A edits until both serialized writes finish', async () => {
  const ui = await filled();
  let finish!: () => void;
  set.mockImplementationOnce((key, value) => new Promise<void>(resolve => {
    finish = () => { storage.set(key, value); resolve(); };
  }));
  await fireEvent.changeText(ui.getByLabelText('Name'), 'Temporary B');
  await waitFor(() => expect(finish).toBeDefined());
  await fireEvent.changeText(ui.getByLabelText('Name'), input.name);
  expect(ui.getByRole('button', { name: 'Send message' })).toBeDisabled();
  expect(mockPreventRemove.mock.calls.at(-1)?.[0]).toBe(true);
  await act(async () => { finish(); });
  await ready(ui);
  expect((await createContactDraftStore(scope).load())?.value.name).toBe(input.name);
});
