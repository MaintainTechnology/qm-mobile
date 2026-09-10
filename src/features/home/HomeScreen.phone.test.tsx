import { fireEvent, render } from '@testing-library/react-native';
import { Share } from 'react-native';
import { HomeScreen } from './HomeScreen';
import type { PhoneReadiness } from '@/features/auth/provisioning';
const mockPhone = jest.fn();
const mockRefresh = jest.fn();
const mockStart = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => false }));
jest.mock('@/features/auth/use-phone-readiness', () => ({ usePhoneReadiness: () => mockPhone() }));
jest.mock('@/features/home/ActivityAnalytics', () => ({ ActivityAnalytics: () => null }));
jest.mock('@/features/chats/chats-api', () => ({
  useChats: () => ({ data: { chats: [] }, refetch: jest.fn() }),
}));
jest.mock('@/features/quotes/UnifiedQuoteQueue', () => ({
  SavedJobQueueRow: () => null,
  useQuoteQueueSources: () => ({
    entries: [],
    jobs: { refetch: jest.fn() },
    me: {
      data: {
        tenant: {
          id: 'tenant_A',
          status: 'active',
          business_name: 'Test business',
          owner_first_name: 'Owner',
          twilio_sms_number: '+61482012345',
          twilio_voice_number: '+61482012345',
        },
        quotes: [],
        services: [],
      },
      refetch: jest.fn(),
    },
  }),
}));
const state = (name: PhoneReadiness['state']): PhoneReadiness => ({
  version: 1,
  tenantId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  operationId: name === 'not_started' ? null : 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  state: name,
  setupComplete: name === 'ready',
  retryable: name === 'not_started',
  phoneNumber: '+61482012345',
  smsReady: name === 'ready',
  voiceReady: name === 'ready',
  provisioningMode: { twilio: name === 'stub' ? 'stub' : 'real', vapi: 'real' },
  message: name,
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
});
afterEach(() => jest.restoreAllMocks());
it.each(['stub', 'unknown', 'incomplete', 'processing'] as const)(
  'does not advertise/share an active tenant number while %s',
  async name => {
    mockPhone.mockReturnValue({
      data: state(name),
      busy: false,
      error: null,
      refresh: mockRefresh,
      start: mockStart,
    });
    const screen = await render(<HomeScreen />);
    expect(screen.queryByText('PHONE SETUP READY')).toBeNull();
    expect(screen.getByText('SMS OFF')).toBeTruthy();
    expect(screen.getByText('VOICE OFF')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Share number' }));
    expect(Share.share).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Check phone setup' }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Start phone setup' })).toBeNull();
  },
);
it('shares only the proven owned number even when its digits resemble a stub', async () => {
  mockPhone.mockReturnValue({
    data: state('ready'),
    busy: false,
    error: null,
    refresh: mockRefresh,
    start: mockStart,
  });
  const screen = await render(<HomeScreen />);
  expect(screen.getByText('PHONE SETUP READY')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Share number' }));
  expect(Share.share).toHaveBeenCalledWith({ message: '+61482012345' });
});
it('requires an explicit start after an authoritative no-attempt result', async () => {
  mockPhone.mockReturnValue({
    data: state('not_started'),
    busy: false,
    error: null,
    refresh: mockRefresh,
    start: mockStart,
  });
  const screen = await render(<HomeScreen />);
  expect(mockStart).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Start phone setup' }));
  expect(mockStart).toHaveBeenCalledTimes(1);
});
