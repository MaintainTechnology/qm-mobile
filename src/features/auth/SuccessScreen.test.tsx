import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { apiRequest } from '@/lib/api';
import { SuccessScreen } from './SuccessScreen';
import { loadAcquisitionEnvelope } from './acquisition-envelope';
import type { PhoneReadiness } from './provisioning';
const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  O = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const mockActiveToken = jest.fn(async () => 'token_B'),
  mockPendingToken = jest.fn(async () => 'token_A'),
  mockSetActive = jest.fn(async () => {}),
  mockReplace = jest.fn();
let mockParams: Record<string, string> = {
  session: 'session_A',
  phone: '+61411111111',
  ready: '1',
};
let mockAuth = { userId: 'user_B', sessionId: 'session_B' };
let mockSessions = [{ id: 'session_A', user: { id: 'user_A' }, getToken: mockPendingToken }];
jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ ...mockAuth, getToken: mockActiveToken }),
  useSessionList: () => ({ sessions: mockSessions }),
}));
jest.mock('@clerk/expo/legacy', () => ({
  useSignUp: () => ({ setActive: mockSetActive, isLoaded: true }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock('expo-linking', () => ({
  canOpenURL: jest.fn(async () => true),
  openURL: jest.fn(async () => {}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));
jest.mock('./acquisition-envelope', () => ({
  ...jest.requireActual('./acquisition-envelope'),
  loadAcquisitionEnvelope: jest.fn(async () => null),
}));
let client: QueryClient, current: PhoneReadiness;
const request = jest.mocked(apiRequest);
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  mockParams = { session: 'session_A', phone: '+61411111111', ready: '1' };
  mockAuth = { userId: 'user_B', sessionId: 'session_B' };
  mockSessions = [{ id: 'session_A', user: { id: 'user_A' }, getToken: mockPendingToken }];
  mockPendingToken.mockResolvedValue('token_A');
  current = {
    version: 1,
    tenantId: A,
    operationId: O,
    state: 'stub',
    setupComplete: false,
    retryable: false,
    phoneNumber: '+61482012345',
    smsReady: false,
    voiceReady: false,
    provisioningMode: { twilio: 'stub', vapi: 'stub' },
    message: 'This is a test phone setup.',
  };
  request.mockImplementation(async () => ({ ok: true, tenantId: A, phoneReadiness: current }));
});
afterEach(() => client.clear());
const ui = () => (
  <QueryClientProvider client={client}>
    <SuccessScreen />
  </QueryClientProvider>
);
it('uses the exact pending session and keeps a test number unavailable despite forged success hints', async () => {
  const screen = await render(ui());
  await screen.findByText('This is a test phone setup.');
  expect(mockActiveToken).not.toHaveBeenCalled();
  expect(mockPendingToken).toHaveBeenCalled();
  expect(loadAcquisitionEnvelope).toHaveBeenCalledWith({ clerkUserId: 'user_A' });
  expect(screen.queryByText('Send yourself a test text →')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Check phone setup' }));
  expect(request.mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(true);
});
it('opens the pending account when another account is already active', async () => {
  const screen = await render(ui());
  await screen.findByText('This is a test phone setup.');
  await fireEvent.press(screen.getByRole('button', { name: 'Open my dashboard' }));
  await waitFor(() => expect(mockSetActive).toHaveBeenCalledWith({ session: 'session_A' }));
  expect(mockReplace).toHaveBeenCalled();
});
it('does not fall back to another active account when the pending session disappeared', async () => {
  mockSessions = [];
  const screen = await render(ui());
  await screen.findByText('STATUS UNAVAILABLE');
  expect(request).not.toHaveBeenCalled();
  expect(mockActiveToken).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Open my dashboard' }));
  expect(mockSetActive).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});
it.each(['route', 'active'])(
  'does not open an old phone after a %s account switch while checking the SMS app',
  async change => {
    current = {
      ...current,
      state: 'ready',
      setupComplete: true,
      smsReady: true,
      voiceReady: true,
      provisioningMode: { twilio: 'real', vapi: 'real' },
    };
    const screen = await render(ui());
    await screen.findByText('Send yourself a test text →');
    let resolve!: (allowed: boolean) => void;
    jest.mocked(Linking.canOpenURL).mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        }),
    );
    await fireEvent.press(screen.getByText('Send yourself a test text →'));
    if (change === 'route') mockParams = {};
    else mockAuth = { userId: 'user_C', sessionId: 'session_C' };
    await screen.rerender(ui());
    await act(async () => {
      resolve(true);
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
  },
);
