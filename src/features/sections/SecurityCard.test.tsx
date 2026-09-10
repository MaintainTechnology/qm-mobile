import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SecurityCard } from './SecurityCard';
import { authenticate, isLockAvailable, isLockEnabled, setLockEnabled } from '@/lib/lock';

jest.mock('@/lib/lock', () => ({ authenticate: jest.fn(), isLockAvailable: jest.fn(), isLockEnabled: jest.fn(), setLockEnabled: jest.fn() }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: jest.requireActual('@/lib/theme').darkColors }) }));
jest.mock('@/components/ThemedSwitch', () => {
  const { View } = jest.requireActual('react-native');
  return { ThemedSwitch: (props: import('react-native').SwitchProps) => <View {...props} accessibilityRole="switch" accessibilityState={{ disabled: props.disabled, checked: props.value }} /> };
});
jest.mock('@/features/menu/CardChrome', () => {
  const { Text, View, Button } = jest.requireActual('react-native');
  return { CardBox: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    CardHint: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    RetryLine: ({ message, onRetry }: { message: string; onRetry: () => void }) => <View><Text>{message}</Text><Button title="Retry" onPress={onRetry} /></View> };
});
const available = jest.mocked(isLockAvailable); const read = jest.mocked(isLockEnabled);
const authenticateMock = jest.mocked(authenticate); const write = jest.mocked(setLockEnabled);
beforeEach(() => {
  jest.resetAllMocks(); available.mockResolvedValue(true); read.mockResolvedValue(false);
  authenticateMock.mockResolvedValue(true); write.mockResolvedValue(undefined);
});
async function setup() {
  const screen = await render(<SecurityCard />);
  await waitFor(() => expect(screen.getByLabelText('Biometric lock')).toBeEnabled());
  return screen;
}
it('shows unreadable preferences with retry and never enables a write until storage is read', async () => {
  read.mockRejectedValueOnce(new Error('Device storage locked')).mockResolvedValue(true);
  const screen = await render(<SecurityCard />);
  await screen.findByText('Could not read the lock setting on this device. Check it again.');
  expect(screen.getByLabelText('Biometric lock')).toBeDisabled();
  await fireEvent.press(screen.getByText('Retry'));
  await waitFor(() => expect(screen.getByLabelText('Biometric lock').props.value).toBe(true));
  expect(write).not.toHaveBeenCalled();
});
it('serializes rapid toggles and verifies the stored result', async () => {
  const screen = await setup(); let resolve!: (value: boolean) => void;
  authenticateMock.mockReturnValue(new Promise(done => { resolve = done; }));
  const onToggle = screen.getByLabelText('Biometric lock').props.onValueChange as (next: boolean) => void;
  await act(() => { onToggle(true); onToggle(true); });
  read.mockResolvedValue(true);
  await act(async () => { resolve(true); });
  await waitFor(() => expect(screen.getByLabelText('Biometric lock').props.value).toBe(true));
  expect(authenticateMock).toHaveBeenCalledTimes(1); expect(write).toHaveBeenCalledTimes(1);
});
it('canceling the prompt keeps the current preference without writing', async () => {
  const screen = await setup(); authenticateMock.mockResolvedValue(false);
  await fireEvent(screen.getByLabelText('Biometric lock'), 'valueChange', true);
  await waitFor(() => expect(screen.getByLabelText('Biometric lock')).toBeEnabled());
  expect(write).not.toHaveBeenCalled(); expect(screen.getByLabelText('Biometric lock').props.value).toBe(false);
});
it('does not treat failed write acknowledgement as a confirmed setting and retry only reads', async () => {
  const screen = await setup(); write.mockRejectedValueOnce(new Error('Lost acknowledgement'));
  await fireEvent(screen.getByLabelText('Biometric lock'), 'valueChange', true);
  await screen.findByText('The saved lock setting could not be confirmed on this device. Check it again.'); expect(screen.getByLabelText('Biometric lock')).toBeDisabled();
  read.mockResolvedValue(true); await fireEvent.press(screen.getByText('Retry'));
  await waitFor(() => expect(screen.getByLabelText('Biometric lock').props.value).toBe(true));
  expect(write).toHaveBeenCalledTimes(1);
});
it('allows turning off an existing preference after biometric enrolment is removed', async () => {
  available.mockResolvedValue(false); read.mockResolvedValueOnce(true).mockResolvedValue(false);
  const screen = await setup();
  await fireEvent(screen.getByLabelText('Biometric lock'), 'valueChange', false);
  await waitFor(() => expect(screen.getByLabelText('Biometric lock').props.value).toBe(false));
  expect(write).toHaveBeenCalledWith(false); expect(authenticateMock).not.toHaveBeenCalled();
});
it('refuses to enable after enrolment disappears during the prompt', async () => {
  const screen = await setup(); available.mockResolvedValueOnce(true).mockResolvedValue(false);
  await fireEvent(screen.getByLabelText('Biometric lock'), 'valueChange', true);
  await screen.findByText('Biometric enrolment changed. Check device settings and try again.');
  expect(write).not.toHaveBeenCalled();
});
it('does not write a preference from a late prompt after leaving Account', async () => {
  const screen = await setup(); let resolve!: (value: boolean) => void;
  authenticateMock.mockReturnValue(new Promise(done => { resolve = done; }));
  await fireEvent(screen.getByLabelText('Biometric lock'), 'valueChange', true);
  await screen.unmount(); await act(async () => { resolve(true); });
  expect(write).not.toHaveBeenCalled();
});
it('keeps a mismatched readback unknown until the user explicitly checks storage again', async () => {
  const screen = await setup();
  await fireEvent(screen.getByLabelText('Biometric lock'), 'valueChange', true);
  await screen.findByText('The saved lock preference could not be confirmed. Check its status before trying again.');
  expect(screen.getByLabelText('Biometric lock')).toBeDisabled(); expect(write).toHaveBeenCalledTimes(1);
});
