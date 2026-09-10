import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QuoteFinalActions } from './QuoteFinalActions';
import { createFinalQuote, recoverFinalQuote, loadFinalQuoteAttempt } from './final-quote-attempt';
jest.mock('./final-quote-attempt', () => ({
  createFinalQuote: jest.fn(),
  recoverFinalQuote: jest.fn(),
  loadFinalQuoteAttempt: jest.fn(),
}));
const P = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const C = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const scope = { userId: 'user_a', tenantId: 'tenant_a', parentId: P };
const onOpen = jest.fn();
const onRefresh = jest.fn(async () => undefined);
const onBusyChange = jest.fn();
const dispatch = jest.fn();
const readQuote = jest.fn();
function props() {
  return {
    scope,
    disabled: false,
    onOpen,
    onRefresh,
    onBusyChange,
    dispatch,
    readQuote,
    snapshot: {
      edit_revision: 'a'.repeat(64),
      processing: { ready: true, reason: null },
      eligibility: {
        issue_final: { allowed: true, reason: null, existing_quote_id: null as string | null },
        request_balance: { allowed: false, reason: 'not_final', existing_quote_id: null },
      },
    },
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadFinalQuoteAttempt).mockResolvedValue(null);
  jest.mocked(createFinalQuote).mockResolvedValue({ version: 1, state: 'available', quoteId: C });
});
it('prepares only after deliberate confirmation and opens the verified draft separately', async () => {
  const screen = await render(<QuoteFinalActions {...props()} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Prepare final quote' })).toBeEnabled(),
  );
  expect(createFinalQuote).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Prepare final quote' }));
  expect(createFinalQuote).not.toHaveBeenCalled();
  jest
    .mocked(loadFinalQuoteAttempt)
    .mockResolvedValue({ version: 1, state: 'available', quoteId: C });
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm and create final draft' }));
  expect(createFinalQuote).toHaveBeenCalledWith(scope, 'a'.repeat(64), dispatch, readQuote);
  expect(onOpen).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Open saved final quote' }));
  expect(onOpen).toHaveBeenCalledWith(C);
  expect(onRefresh).toHaveBeenCalledTimes(1);
});
it('disarms a changed reviewed revision before any create call', async () => {
  const screen = await render(<QuoteFinalActions {...props()} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Prepare final quote' })).toBeEnabled(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Prepare final quote' }));
  const next = props();
  next.snapshot.edit_revision = 'b'.repeat(64);
  await screen.rerender(<QuoteFinalActions {...next} />);
  expect(screen.queryByRole('button', { name: 'Confirm and create final draft' })).toBeNull();
  expect(createFinalQuote).not.toHaveBeenCalled();
});
it('offers existing final recovery even when a new child is ineligible', async () => {
  const input = props();
  input.snapshot.eligibility.issue_final = { allowed: false, reason: null, existing_quote_id: C };
  const screen = await render(<QuoteFinalActions {...input} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Open saved final quote' })).toBeEnabled(),
  );
  expect(screen.queryByRole('button', { name: 'Prepare final quote' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Open saved final quote' }));
  expect(onOpen).toHaveBeenCalledWith(C);
  expect(createFinalQuote).not.toHaveBeenCalled();
});
it('recovers an unknown attempt on remount using reads only and keeps absence fenced', async () => {
  jest.mocked(loadFinalQuoteAttempt).mockResolvedValue({ version: 1, state: 'unknown' });
  jest.mocked(recoverFinalQuote).mockRejectedValue(new Error('Not yet confirmed'));
  const screen = await render(<QuoteFinalActions {...props()} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Check final draft status' })).toBeEnabled(),
  );
  expect(recoverFinalQuote).toHaveBeenCalledWith(scope, readQuote);
  expect(createFinalQuote).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Prepare final quote' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Check final draft status' }));
  expect(recoverFinalQuote).toHaveBeenCalledTimes(2);
  expect(createFinalQuote).not.toHaveBeenCalled();
});
it('does not show a previous account’s final quote when its request completes late', async () => {
  let finish!: () => void;
  jest.mocked(createFinalQuote).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = () => resolve({ version: 1, state: 'available', quoteId: C });
      }),
  );
  const screen = await render(<QuoteFinalActions {...props()} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Prepare final quote' })).toBeEnabled(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Prepare final quote' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm and create final draft' }));
  const next = props();
  next.scope = { ...scope, userId: 'user_b', tenantId: 'tenant_b' };
  await screen.rerender(<QuoteFinalActions {...next} />);
  await act(async () => finish());
  expect(screen.queryByRole('button', { name: 'Open saved final quote' })).toBeNull();
  expect(onOpen).not.toHaveBeenCalled();
  expect(onRefresh).not.toHaveBeenCalled();
});
