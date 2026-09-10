import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { themes as mockThemes } from '@/lib/theme';
import { MEDIA_TENANT, mediaWire, mockMediaPicker, mockMediaPrevent, resetMediaHarness, setMediaRevision } from './business-media-test-harness';
import { BusinessMediaEditor } from './BusinessMediaEditor';

jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: mockThemes.dark }) }));
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').Image }));
let alert: jest.SpyInstance;
beforeEach(() => { resetMediaHarness(); alert = jest.spyOn(Alert,'alert').mockImplementation(() => {}); });
afterEach(() => alert.mockRestore());
async function mount() {
  const view = await render(<BusinessMediaEditor tenantId={MEDIA_TENANT} />);
  await waitFor(() => expect(screen.getByRole('button',{ name: 'Choose logo' })).toBeEnabled()); return view;
}
it('shows bounded logo/photo pick, selected preview and explicit Save while preserving current image until acknowledgement', async () => {
  await mount(); expect(screen.getByText(/PNG, JPG or WebP image up to 2 MB/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button',{ name: 'Choose logo' }));
  await screen.findByLabelText('Selected business image preview'); expect(mediaWire.posts).toHaveLength(0);
  expect(mockMediaPrevent.mock.calls.at(-1)?.[0]).toBe(true);
  await fireEvent.press(screen.getByRole('button',{ name: 'Save selected image' }));
  await screen.findByLabelText('Current business logo preview'); expect(mediaWire.commits).toBe(1);
  expect(screen.queryByLabelText('Selected business image preview')).toBeNull(); expect(mockMediaPrevent.mock.calls.at(-1)?.[0]).toBe(false);
});
it('preserves the visible selection on cancelled/failed picker and offers preview failure retry', async () => {
  await mount(); await fireEvent.press(screen.getByRole('button',{ name: 'Choose logo' }));
  const before = screen.getByLabelText('Selected business image preview').props.source;
  mockMediaPicker.mockResolvedValueOnce({ kind: 'cancelled' }); await fireEvent.press(screen.getByRole('button',{ name: 'Choose photo' }));
  expect(screen.getByLabelText('Selected business image preview').props.source).toEqual(before);
  mockMediaPicker.mockResolvedValueOnce({ kind: 'failed',message: 'Picker failed' }); await fireEvent.press(screen.getByRole('button',{ name: 'Choose photo' }));
  await screen.findByText('Image change needs attention'); expect(screen.getByLabelText('Selected business image preview').props.source).toEqual(before);
  await fireEvent(screen.getByLabelText('Selected business image preview'),'error'); await screen.findByText('This image preview could not be loaded.');
  await fireEvent.press(screen.getByRole('button',{ name: 'Retry image preview' })); await screen.findByLabelText('Selected business image preview');
});
it('gates new picks while unknown, uses exact retry label, and allows absent-operation cancellation without retained bytes', async () => {
  const first = await mount(); await fireEvent.press(screen.getByRole('button',{ name: 'Choose logo' }));
  mediaWire.failBeforeClaim = true; await fireEvent.press(screen.getByRole('button',{ name: 'Save selected image' }));
  await screen.findByText('Check the previous image change'); expect(screen.getByRole('button',{ name: 'Choose photo' })).toBeDisabled();
  expect(screen.getByRole('button',{ name: 'Retry the exact image change' })).toBeEnabled(); await first.unmount();
  await render(<BusinessMediaEditor tenantId={MEDIA_TENANT} />); await screen.findByText('Check the previous image change');
  expect(screen.queryByLabelText('Selected business image preview')).toBeNull(); expect(mediaWire.posts).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button',{ name: 'Cancel original image change' }));
  const confirm = alert.mock.calls.at(-1)?.[2]?.find((button: { text: string }) => button.text === 'Cancel image change');
  expect(confirm).toBeTruthy(); await act(() => confirm?.onPress?.());
  await screen.findByText('The original image change is cancelled. It cannot apply later.');
  expect(mediaWire.cancellations).toHaveLength(1); expect(mediaWire.commits).toBe(0);
});
it('requires explicit current-version review before replacing remotely changed branding', async () => {
  await mount(); await fireEvent.press(screen.getByRole('button',{ name: 'Choose photo' }));
  setMediaRevision(); await fireEvent.press(screen.getByRole('button',{ name: 'Check saved business images' }));
  await screen.findByText('Your saved business images changed'); expect(screen.getByRole('button',{ name: 'Save selected image' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button',{ name: 'Use this selection with the current version' }));
  expect(screen.getByRole('button',{ name: 'Save selected image' })).toBeEnabled(); expect(mediaWire.posts).toHaveLength(0);
});
it('does not let a stale discard confirmation remove a newer selection', async () => {
  await mount(); await fireEvent.press(screen.getByRole('button',{ name: 'Choose logo' }));
  await fireEvent.press(screen.getByRole('button',{ name: 'Discard selected image' }));
  const confirm = alert.mock.calls.at(-1)?.[2]?.find((button: { text: string }) => button.text === 'Discard');
  await fireEvent.press(screen.getByRole('button',{ name: 'Choose photo' }));
  await act(() => confirm?.onPress?.()); expect(screen.getByText('Selected photo')).toBeTruthy(); expect(mediaWire.posts).toHaveLength(0);
});
