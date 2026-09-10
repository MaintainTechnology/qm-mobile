import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QuoteDetailModal } from './QuoteDetailModal';
import type { DeliveryReceipt } from './delivery-receipt';

const mockApprove = jest.fn(async () => ({ ok: true }));
const mockSend = jest.fn(async () => ({ ok: true }));
const mockRefresh = jest.fn(async () => null);
const mockRetry = jest.fn(async () => null);
const mockBegin = jest.fn(async () => null);
let mockReceipt: DeliveryReceipt | null = null;
let mockLoading = false;
let mockRevision = 'a'.repeat(64);
let mockStatus = 'awaiting_tradie_approval';
let mockReleased: string | null = null;
let mockReady = true;
let mockOnFilePhone = '+61411111111';
let mockOnFileEmail = 'onfile@example.com';
const quote = { id: '11111111-1111-4111-8111-111111111111', created_at: '2026-09-08T00:00:00Z',
  status: 'awaiting_tradie_approval', customer_phone: '+61411111111', customer_full_name: 'Customer', total_inc_gst: 100 };
jest.mock('./owned-quote', () => ({ useOwnedQuote: () => ({
  data: { quote: { ...quote, tenant_id: 'tenant_A', customer_phone: mockOnFilePhone, customer_email: mockOnFileEmail, status: mockStatus, customer_released_at: mockReleased },
    customer_release_revision: mockRevision, processing: { ready: mockReady } }, isError: false,
}) }));
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  useQuoteDelivery: () => ({ key: 'scope', receipt: mockReceipt, isLoading: mockLoading, isPending: false, error: null,
    approve: mockApprove, send: mockSend, refresh: mockRefresh, retry: mockRetry, beginAnother: mockBegin }),
  useSetDisplayMode: () => ({ isPending: false, isSuccess: false, isError: false, mutate: jest.fn() }),
}));
jest.mock('@/lib/useApi', () => ({ useApiQuery: () => ({ data: null }) }));
jest.mock('./QuoteWorkspace', () => ({ QuoteWorkspace: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => true }));
const onClose = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); mockReceipt = null; mockLoading = false; mockRevision = 'a'.repeat(64);
  mockStatus = 'awaiting_tradie_approval'; mockReleased = null; mockReady = true;
  mockOnFilePhone = '+61411111111'; mockOnFileEmail = 'onfile@example.com';
});
const receipt = (state: DeliveryReceipt['state'], channel: 'sms' | 'email' = 'sms'): DeliveryReceipt => ({
  version: 1, requestId: '22222222-2222-4222-8222-222222222222', inputHash: 'a'.repeat(64),
  action: 'send', channel, initial: false, state, approved: true, createdAt: 1, updatedAt: 2,
});
it('requires two taps and sends the actual owned review revision', async () => {
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  await fireEvent.press(ui.getByRole('button', { name: 'Approve and send' }));
  expect(mockApprove).not.toHaveBeenCalled();
  await fireEvent.press(ui.getByRole('button', { name: 'Tap again to confirm' }));
  expect(mockApprove).toHaveBeenCalledWith({ expected_revision: mockRevision, reviewedDestination: '+61411111111' });
});
it('blocks approval without a displayed saved recipient', async () => {
  mockOnFilePhone = '';
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  expect(ui.getByRole('alert')).toHaveTextContent(/No customer mobile is on file/);
  await fireEvent.press(ui.getByRole('button', { name: 'Approve and send' }));
  expect(mockApprove).not.toHaveBeenCalled();
  expect(ui.queryByRole('button', { name: 'Tap again to confirm' })).toBeNull();
});
it('requires a new confirmation after the reviewed revision changes', async () => {
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  await fireEvent.press(ui.getByRole('button', { name: 'Approve and send' }));
  mockRevision = 'b'.repeat(64);
  await ui.rerender(<QuoteDetailModal quote={quote} onClose={onClose} />);
  expect(ui.queryByRole('button', { name: 'Tap again to confirm' })).toBeNull();
  await fireEvent.press(ui.getByRole('button', { name: 'Approve and send' }));
  expect(mockApprove).not.toHaveBeenCalled();
});
it('passes explicit resend evidence and the reviewed email without overriding an unchanged on-file address', async () => {
  mockStatus = 'draft'; mockReleased = '2026-09-08T00:00:00Z';
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  await fireEvent.press(ui.getByRole('radio', { name: 'Email' }));
  await fireEvent.press(ui.getByRole('button', { name: 'Resend to customer' }));
  await fireEvent.press(ui.getByRole('button', { name: 'Tap again to confirm' }));
  expect(mockSend).toHaveBeenCalledWith({ channel: 'email', to: undefined, expected_revision: mockRevision,
    resend: true, reviewedDestination: 'onfile@example.com' });
});
it.each(['sms', 'email'])('requires a new confirmation after the owned on-file %s recipient changes', async channel => {
  mockStatus = 'draft'; mockReleased = '2026-09-08T00:00:00Z';
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  if (channel === 'email') await fireEvent.press(ui.getByRole('radio', { name: 'Email' }));
  await fireEvent.press(ui.getByRole('button', { name: 'Resend to customer' }));
  if (channel === 'email') mockOnFileEmail = 'changed@example.com';
  else mockOnFilePhone = '+61422222222';
  await ui.rerender(<QuoteDetailModal quote={quote} onClose={onClose} />);
  expect(ui.queryByRole('button', { name: 'Tap again to confirm' })).toBeNull();
  await fireEvent.press(ui.getByRole('button', { name: 'Resend to customer' }));
  expect(mockSend).not.toHaveBeenCalled();
  await fireEvent.press(ui.getByRole('button', { name: 'Tap again to confirm' }));
  expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
    reviewedDestination: channel === 'email' ? 'changed@example.com' : '+61422222222',
  }));
});
it('restores unknown delivery as a blocked action with a read-only refresh', async () => {
  mockReceipt = receipt('unknown');
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  expect(ui.queryByRole('button', { name: 'Approve and send' })).toBeNull();
  expect(ui.queryByRole('button', { name: 'Prepare another send' })).toBeNull();
  await fireEvent.press(ui.getByRole('button', { name: 'Refresh delivery status' }));
  expect(mockRefresh).toHaveBeenCalledTimes(1); expect(mockApprove).not.toHaveBeenCalled();
});
it('requires explicit confirmation to retry a failed original message', async () => {
  mockReceipt = receipt('failed');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  await fireEvent.press(ui.getByRole('button', { name: 'Retry original message' }));
  expect(mockRetry).not.toHaveBeenCalled();
  await act(async () => { alert.mock.calls[0]?.[2]?.[1]?.onPress?.(); });
  expect(mockRetry).toHaveBeenCalledTimes(1); expect(mockSend).not.toHaveBeenCalled();
  alert.mockRestore();
});
it('never labels provider acceptance as carrier delivery and keeps unknown email fenced', async () => {
  mockReceipt = receipt('provider_accepted');
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  expect(ui.getByText('The provider accepted the message. Delivery to the customer is not yet confirmed.')).toBeTruthy();
  mockReceipt = receipt('unknown', 'email');
  await ui.rerender(<QuoteDetailModal quote={quote} onClose={onClose} />);
  expect(ui.queryByRole('button', { name: 'Prepare another send' })).toBeNull();
  expect(ui.queryByRole('button', { name: 'Retry original message' })).toBeNull();
});
it.each(['loading', 'processing'])('blocks delivery before %s is resolved', async state => {
  mockLoading = state === 'loading'; mockReady = state !== 'processing';
  const ui = await render(<QuoteDetailModal quote={quote} onClose={onClose} />);
  expect(ui.queryByRole('button', { name: 'Approve and send' })).toBeNull();
});
