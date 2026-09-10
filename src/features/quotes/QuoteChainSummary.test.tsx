import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { QuoteChainSummary, type QuoteChainSnapshot } from './QuoteChainSummary';

jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://quotemax.test${path}` }));

function fixture(): QuoteChainSnapshot {
  return {
    quote: { id: 'final', tenant_id: 'owner' },
    edit_revision: 'a'.repeat(64),
    chain: {
      root: { id: 'initial', quote_kind: 'initial', status: 'paid', total_inc_gst: 99 },
      parent: { id: 'initial', quote_kind: 'initial', status: 'paid', total_inc_gst: 99 },
      children: [],
      next_cursor: null,
    },
    money: {
      currency: 'AUD',
      unit: 'cents',
      source: 'stored_quote_chain',
      job_total_inc_gst_cents: 150055,
      inspection_credit_cents: 9900,
      deposit_base_cents: 35116,
      balance_base_cents: 105039,
      current_payment_base_cents: 0,
      platform_fee_cents: null,
      customer_charge_cents: null,
    },
  };
}

it('shows server cents without calculating a replacement and distinguishes zero from unavailable', async () => {
  const onOpen = jest.fn();
  const screen = await render(
    <QuoteChainSummary
      snapshot={fixture()}
      disabled={false}
      onOpen={onOpen}
      loadPage={jest.fn()}
    />,
  );
  expect(screen.getByText('Job total: A$1,500.55')).toBeTruthy();
  expect(screen.getByText('Remaining balance: A$1,050.39')).toBeTruthy();
  expect(screen.getByText('This payment before fee: A$0.00')).toBeTruthy();
  expect(screen.getByText('Fee for this payment: Unavailable')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Open Initial quote · paid' })).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Open Initial quote · paid' }));
  expect(onOpen).toHaveBeenCalledWith('initial');
});

it.each(['pending', 'review_required'] as const)(
  'shows %s credit separately from message acceptance without inventing paid status',
  async status => {
    const snapshot = fixture();
    snapshot.credit_settlement = { status, reason: 'private_accounting_reason' };
    const screen = await render(
      <QuoteChainSummary
        snapshot={snapshot}
        disabled={false}
        onOpen={jest.fn()}
        loadPage={jest.fn()}
      />,
    );
    expect(
      screen.getByText(
        status === 'pending' ? 'Deposit credit pending' : 'Deposit credit needs review',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Message acceptance does not confirm/)).toBeTruthy();
    expect(screen.queryByText(/private_accounting_reason/)).toBeNull();
    expect(screen.queryByText(/Paid in full/i)).toBeNull();
  },
);

it('describes settled credit as a deposit credit and retains the server remaining balance', async () => {
  const snapshot = fixture();
  snapshot.credit_settlement = {
    status: 'settled',
    reason: 'credit_covers_deposit',
    quote_id: 'final',
  };
  const screen = await render(
    <QuoteChainSummary
      snapshot={snapshot}
      disabled={false}
      onOpen={jest.fn()}
      loadPage={jest.fn()}
    />,
  );
  expect(screen.getByText(/Site visit credit has been applied to the deposit/)).toBeTruthy();
  expect(screen.getByText('Remaining balance: A$1,050.39')).toBeTruthy();
  expect(screen.queryByText(/Paid in full/i)).toBeNull();
});

it('keeps existing links on page failure and merges the retry by record id', async () => {
  const snapshot = fixture();
  snapshot.chain.next_cursor = 'opaque_cursor';
  const next = fixture();
  next.chain.children = [
    { id: 'balance', quote_kind: 'balance', status: 'draft', total_inc_gst: 1050.39 },
  ];
  const load = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(next);
  const screen = await render(
    <QuoteChainSummary snapshot={snapshot} disabled={false} onOpen={jest.fn()} loadPage={load} />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Load more linked quotes' }));
  await waitFor(() => expect(screen.getByText('Linked quotes need attention')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Open Initial quote · paid' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Load more linked quotes' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Open Balance · draft' })).toBeTruthy(),
  );
  expect(load).toHaveBeenNthCalledWith(2, 'opaque_cursor');
  expect(screen.queryByRole('button', { name: 'Load more linked quotes' })).toBeNull();
});

it('rejects a page from a different tenant and blocks navigation while edits are pending', async () => {
  const snapshot = fixture();
  snapshot.chain.next_cursor = 'cursor';
  const next = fixture();
  next.quote.tenant_id = 'another';
  next.chain.children = [
    { id: 'foreign', quote_kind: 'balance', status: 'sent', total_inc_gst: 1 },
  ];
  const open = jest.fn();
  const screen = await render(
    <QuoteChainSummary
      snapshot={snapshot}
      disabled={false}
      onOpen={open}
      loadPage={async () => next}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Load more linked quotes' }));
  await waitFor(() => expect(screen.getByText('Linked quotes need attention')).toBeTruthy());
  expect(screen.queryByRole('button', { name: 'Open Balance · sent' })).toBeNull();
  await screen.rerender(
    <QuoteChainSummary snapshot={snapshot} disabled onOpen={open} loadPage={async () => next} />,
  );
  expect(screen.getByRole('button', { name: 'Open Initial quote · paid' })).toBeDisabled();
  expect(open).not.toHaveBeenCalled();
});

it('ignores a linked-record page after navigation unmounts its owner view', async () => {
  const snapshot = fixture();
  snapshot.chain.next_cursor = 'cursor';
  let finish: (value: QuoteChainSnapshot) => void = () => {};
  const loadPage = () =>
    new Promise<QuoteChainSnapshot>(resolve => {
      finish = resolve;
    });
  const screen = await render(
    <QuoteChainSummary
      snapshot={snapshot}
      disabled={false}
      onOpen={jest.fn()}
      loadPage={loadPage}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Load more linked quotes' }));
  await screen.unmount();
  await act(async () => {
    finish(fixture());
  });
});
