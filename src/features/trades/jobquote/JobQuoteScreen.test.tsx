import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { JobQuoteForm } from './JobQuoteScreen';

const mockPush = jest.fn();
const mockDraft = jest.fn();
const mockStatus = jest.fn();
const mockSuggest = jest.fn(async () => ({ ok: true, suggestions: [] }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'dddddddd-1111-4111-8111-dddddddddddd' }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  useJobQuote: () => ({ mutateAsync: mockDraft, reset: jest.fn(), isPending: false }),
  useJobQuoteStatus: () => ({ mutateAsync: mockStatus, isPending: false }),
  useAddressSuggestions: () => ({ mutateAsync: mockSuggest }),
  useJobPhotoUpload: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('../catalogue-api', () => ({
  useCatalogue: () => ({
    data: {
      catalogue: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Wall charger',
          category: 'ev_charger',
          trade: 'electrical',
          brand: 'Example brand',
          range_series: 'Home range',
          unit_price_ex_gst: 850.35,
          active: true,
          unit: 'unit',
          image_path: null,
        },
      ],
    },
  }),
}));
jest.mock('@/lib/tenant', () => ({
  TENANT_ME_KEY: ['tenant', 'me'],
  useTenantMe: () => ({ data: { tenant: { id: 'tenant_a' }, quotes: [] }, refetch: jest.fn() }),
}));

const scope = { userId: 'user_a', tenantId: 'tenant_a' };
let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => stored.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    stored.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => {
    stored.delete(key);
  });
  mockDraft.mockResolvedValue({
    ok: true,
    operationId: 'dddddddd-1111-4111-8111-dddddddddddd',
    status: 'completed',
    pinned: false,
    pinRequested: false,
    intakeId: 'intake1',
    quoteId: 'quote1',
    shareToken: 'share1',
    needsInspection: true,
  });
});

it('recovers an owned operation on remount and opens its exact saved quote without another POST', async () => {
  stored.set(
    'quotemax.jobquote.attempt.v1.user_a.tenant_a',
    JSON.stringify({ status: 'unknown', operationId: 'dddddddd-1111-4111-8111-dddddddddddd' }),
  );
  mockStatus.mockResolvedValue({
    ok: true,
    operationId: 'dddddddd-1111-4111-8111-dddddddddddd',
    status: 'completed',
    quoteId: 'quote1',
    intakeId: 'intake1',
    shareToken: 'secret',
    needsInspection: false,
    pinned: false,
    pinRequested: true,
  });
  const screen = await render(<JobQuoteForm trades={['electrical']} scope={scope} />);
  await waitFor(() => expect(screen.getByLabelText('Review draft')).toBeTruthy());
  expect(screen.getByText('Selected product needs review')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Review draft'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(tabs)/quotes',
    params: { quoteId: 'quote1' },
  });
  expect(mockDraft).not.toHaveBeenCalled();
});

it('clears the charger pin on customer supply and sends all five EV answers, then opens the exact draft', async () => {
  const screen = await render(<JobQuoteForm trades={['electrical']} scope={scope} />);
  await waitFor(() => expect(screen.getByText('Create a quote')).toBeTruthy());
  await fireEvent.press(screen.getByText('EV charger'));
  await fireEvent.press(screen.getByText('we supply the charger'));
  await fireEvent.press(screen.getByText('Wall charger — A$850.35 ex GST'));
  expect(screen.getByText('Example brand · Home range')).toBeTruthy();
  await fireEvent.press(screen.getByText('customer already has the charger'));
  expect(screen.queryByText('Wall charger — A$850.35 ex GST')).toBeNull();
  await fireEvent.press(screen.getByText('Tesla'));
  await fireEvent.changeText(
    screen.getByLabelText('Where is the charger going (garage, carport, external wall)?'),
    'Garage',
  );
  await fireEvent.press(screen.getByText('5–10 m'));
  await fireEvent.press(screen.getByText('three phase (on-site inspection)'));
  await fireEvent.changeText(screen.getByLabelText('Address'), '12 Smith St');
  await fireEvent.changeText(screen.getByLabelText('Suburb'), 'Penrith');
  await fireEvent.press(screen.getByLabelText('Draft the quote'));
  await waitFor(() => expect(screen.getByLabelText('Review draft')).toBeTruthy());
  expect(mockDraft).toHaveBeenCalledTimes(1);
  expect(mockDraft.mock.calls[0]?.[0]).toMatchObject({
    job_type: 'ev_charger',
    address: '12 Smith St',
    suburb: 'Penrith',
    answers: {
      vehicle: 'Tesla',
      charger_supply: 'customer already has the charger',
      room: 'Garage',
      switchboard_distance: '5–10 m',
      phase: 'three phase (on-site inspection)',
    },
  });
  expect(mockDraft.mock.calls[0]?.[0]).not.toHaveProperty('product_id');
  expect(mockDraft.mock.calls[0]?.[0]).not.toHaveProperty('product_name');
  await fireEvent.press(screen.getByLabelText('Review draft'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(tabs)/quotes',
    params: { quoteId: 'quote1' },
  });
});

it('restores an unknown attempt without a draft/retry action', async () => {
  stored.set('quotemax.jobquote.attempt.v1.user_a.tenant_a', JSON.stringify({ status: 'unknown' }));
  const screen = await render(<JobQuoteForm trades={['electrical']} scope={scope} />);
  await waitFor(() => expect(screen.getByText('Draft status unconfirmed')).toBeTruthy());
  expect(screen.queryByLabelText('Draft the quote')).toBeNull();
  expect(screen.queryByText('TRY AGAIN')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Check Quotes'));
  expect(mockDraft).not.toHaveBeenCalled();
});
