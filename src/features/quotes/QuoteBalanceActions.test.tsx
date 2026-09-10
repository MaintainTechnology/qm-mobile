import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QuoteBalanceActions, type BalanceSnapshot } from './QuoteBalanceActions';
import type { DeliveryReceipt } from './delivery-receipt';

const mockDelivery = {
  receipt: null as DeliveryReceipt | null,
  isLoading: false,
  isPending: false,
  error: null as unknown,
  requestBalance: jest.fn(async (_input: unknown) => ({})),
  refresh: jest.fn(async () => undefined),
  retry: jest.fn(async () => undefined),
  beginAnother: jest.fn(async () => undefined),
};
jest.mock('./use-quote-delivery', () => ({ useQuoteDelivery: () => mockDelivery }));
const Q = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
function fixture(): BalanceSnapshot {
  return {
    quote: { id: Q, tenant_id: 'tenant_a', customer_phone: '+61411222333' },
    customer_release_revision: 'a'.repeat(64),
    processing: { ready: true, reason: null },
    eligibility: {
      issue_final: { allowed: false, reason: 'not_initial', existing_quote_id: null },
      request_balance: { allowed: true, reason: null, existing_quote_id: B },
    },
    money: {
      currency: 'AUD',
      unit: 'cents',
      source: 'stored_quote_chain',
      job_total_inc_gst_cents: 100001,
      inspection_credit_cents: 5000,
      deposit_base_cents: 30000,
      balance_base_cents: 65001,
      current_payment_base_cents: 30000,
      platform_fee_cents: 900,
      customer_charge_cents: 30900,
    },
  };
}
const onBusyChange = jest.fn();
const onRefresh = jest.fn(async () => undefined);
const onOpen = jest.fn();
const props = () => ({ snapshot: fixture(), disabled: false, onBusyChange, onRefresh, onOpen });
beforeEach(() => {
  jest.clearAllMocks();
  mockDelivery.receipt = null;
  mockDelivery.error = null;
  mockDelivery.isPending = false;
  mockDelivery.isLoading = false;
});
it('reviews the exact saved balance and mobile number before dispatch and opens the saved child without sending', async () => {
  const screen = await render(<QuoteBalanceActions {...props()} />);
  expect(mockDelivery.requestBalance).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Open saved balance quote' }));
  expect(onOpen).toHaveBeenCalledWith(B);
  await fireEvent.press(screen.getByRole('button', { name: 'Request balance payment' }));
  expect(screen.getByText(/Text \+61411222333.*\$650\.01/)).toBeTruthy();
  expect(mockDelivery.requestBalance).not.toHaveBeenCalled();
  expect(screen.queryByText(/\$309\.00/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm and text balance request' }));
  await waitFor(() =>
    expect(mockDelivery.requestBalance).toHaveBeenCalledWith({
      expected_revision: 'a'.repeat(64),
      reviewedDestination: '+61411222333',
      resend: false,
    }),
  );
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
});
it.each(['recipient', 'revision', 'balance', 'disabled'])(
  'disarms confirmation when %s changes',
  async change => {
    const initial = props();
    const screen = await render(<QuoteBalanceActions {...initial} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Request balance payment' }));
    const next = props();
    if (change === 'recipient') next.snapshot.quote.customer_phone = '+61499888777';
    if (change === 'revision') next.snapshot.customer_release_revision = 'b'.repeat(64);
    if (change === 'balance') next.snapshot.money.balance_base_cents = 70001;
    if (change === 'disabled') next.disabled = true;
    await screen.rerender(<QuoteBalanceActions {...next} />);
    expect(screen.queryByRole('button', { name: 'Confirm and text balance request' })).toBeNull();
    expect(mockDelivery.requestBalance).not.toHaveBeenCalled();
  },
);
function receipt(state: DeliveryReceipt['state']): DeliveryReceipt {
  return {
    version: 1,
    requestId: B,
    inputHash: 'a'.repeat(64),
    action: 'request-final-payment',
    channel: 'sms',
    initial: true,
    state,
    approved: true,
    createdAt: 1,
    updatedAt: 1,
  };
}
it('keeps unknown outcomes fenced and offers only an explicit read refresh', async () => {
  mockDelivery.receipt = receipt('unknown');
  const screen = await render(<QuoteBalanceActions {...props()} />);
  expect(screen.queryByRole('button', { name: 'Request balance payment' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Retry original balance message' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Refresh balance delivery status' }));
  expect(mockDelivery.refresh).toHaveBeenCalledTimes(1);
  expect(mockDelivery.requestBalance).not.toHaveBeenCalled();
});
it('requires a separate resend review after acknowledging a terminal message', async () => {
  mockDelivery.receipt = receipt('provider_accepted');
  const screen = await render(<QuoteBalanceActions {...props()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Review another balance message' }));
  expect(mockDelivery.beginAnother).toHaveBeenCalledTimes(1);
  mockDelivery.receipt = null;
  await screen.rerender(<QuoteBalanceActions {...props()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Review balance resend' }));
  expect(mockDelivery.requestBalance).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm and text balance request' }));
  expect(mockDelivery.requestBalance).toHaveBeenCalledWith(
    expect.objectContaining({ resend: true }),
  );
});
it('blocks sends and original-message retries after the server confirms balance payment', async () => {
  mockDelivery.receipt = receipt('balance_paid');
  const screen = await render(<QuoteBalanceActions {...props()} />);
  expect(screen.getByText(/saved balance payment is confirmed/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Review another balance message' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Retry original balance message' })).toBeNull();
  expect(mockDelivery.requestBalance).not.toHaveBeenCalled();
});
it('prevents a second submission while the first request is unresolved', async () => {
  let finish!: () => void;
  mockDelivery.requestBalance.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = () => resolve({});
      }),
  );
  const screen = await render(<QuoteBalanceActions {...props()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Request balance payment' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm and text balance request' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Request balance payment' }));
  expect(mockDelivery.requestBalance).toHaveBeenCalledTimes(1);
  await act(async () => finish());
});
