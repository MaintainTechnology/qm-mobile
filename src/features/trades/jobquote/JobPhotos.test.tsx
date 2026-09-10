import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { pickImageForUpload } from '@/lib/media';

import { JobPhotos } from './JobPhotos';
import type { JobPhoto } from './photos';

const mockUpload = jest.fn();
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  useJobPhotoUpload: () => ({ mutateAsync: mockUpload }),
}));
jest.mock('@/lib/media', () => ({
  ...jest.requireActual('@/lib/media'),
  pickImageForUpload: jest.fn(),
}));

const file = { uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg', size: 1234 };
function Photos() {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  return <JobPhotos photos={photos} setPhotos={setPhotos} disabled={false} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(pickImageForUpload).mockResolvedValue({
    kind: 'selected',
    files: [file],
    libraryAccess: 'limited',
    hasUnknownSize: false,
  });
});

it('shows confirmed photo success and preserves limited-library guidance', async () => {
  mockUpload.mockResolvedValue({
    ok: true,
    count: 1,
    paths: ['owned/photo.jpg'],
    urls: ['https://storage.test/photo'],
  });
  const screen = await render(<Photos />);
  await fireEvent.press(screen.getByLabelText('Choose job photos'));
  await waitFor(() => expect(screen.getByText('Photo added')).toBeTruthy());
  expect(screen.getByText('Photo access is limited to the items you selected.')).toBeTruthy();
  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(mockUpload.mock.calls[0]?.[0].form).toBeInstanceOf(FormData);
});

it('aborts a removed photo and does not restore it from a late upload response', async () => {
  let complete!: (value: unknown) => void;
  mockUpload.mockImplementation(
    () =>
      new Promise(resolve => {
        complete = resolve;
      }),
  );
  const screen = await render(<Photos />);
  await fireEvent.press(screen.getByLabelText('Choose job photos'));
  await waitFor(() => expect(screen.getByText('Uploading photo…')).toBeTruthy());
  const signal = mockUpload.mock.calls[0]?.[0].signal as AbortSignal;
  await fireEvent.press(screen.getByLabelText('Remove photo 1'));
  expect(signal.aborted).toBe(true);
  complete({
    ok: true,
    count: 1,
    paths: ['owned/photo.jpg'],
    urls: ['https://storage.test/photo'],
  });
  await waitFor(() => expect(screen.queryByText('Uploading photo…')).toBeNull());
  expect(screen.queryByText('Photo added')).toBeNull();
});

it('cancelling the system picker does not upload or show a failure', async () => {
  jest.mocked(pickImageForUpload).mockResolvedValue({ kind: 'cancelled' });
  const screen = await render(<Photos />);
  await fireEvent.press(screen.getByLabelText('Choose job photos'));
  expect(mockUpload).not.toHaveBeenCalled();
  expect(screen.queryByText('Photo added')).toBeNull();
});
