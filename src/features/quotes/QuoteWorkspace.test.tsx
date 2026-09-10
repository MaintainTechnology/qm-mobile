import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ApiError } from '@/lib/api';

import { OwnedQuoteSchema, type OwnedQuote } from './owned-quote';
import { QuoteWorkspace, QuoteWorkspaceBody } from './QuoteWorkspace';
import { editableTiers, newManualLine } from './quote-editor';

const mockGetToken = jest.fn(async () => 'owned-token');
const mockOwnedQuery = jest.fn();
jest.mock('./owned-quote', () => ({
  ...jest.requireActual('./owned-quote'),
  useOwnedQuote: (id: string) => mockOwnedQuery(id),
}));
jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ getToken: mockGetToken, userId: 'owner_a', sessionId: 'session_a' }),
}));
jest.mock('./QuoteDocumentPreview', () => ({ QuoteDocumentPreview: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockFlush = jest.fn(async () => {});
const mockRemoveDraft = jest.fn(async () => {});
const mockReplaceDraft = jest.fn(async () => {});
let mockRecovered: import('./quote-draft-storage').QuoteDraftSnapshot | null = null;
jest.mock('./use-quote-draft', () => ({
  useQuoteDraft: (
    _scope: unknown,
    _input: unknown,
    _dirty: boolean,
    restore: (draft: unknown) => void,
  ) => {
    const { useEffect, useRef } = jest.requireActual('react');
    const restoreRef = useRef(restore);
    restoreRef.current = restore;
    useEffect(() => {
      if (mockRecovered) restoreRef.current(mockRecovered);
    }, []);
    return {
      loaded: true,
      saving: false,
      error: null,
      savedAt: null,
      flush: mockFlush,
      remove: mockRemoveDraft,
      replace: mockReplaceDraft,
      retry: jest.fn(),
    };
  },
}));
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://quotemax.test${path}` }));
const initialRevision = 'a'.repeat(64);
const savedRevision = 'b'.repeat(64);
const quoteId = '11111111-1111-4111-8111-111111111111';

function fixture(): OwnedQuote {
  return OwnedQuoteSchema.parse({
    ok: true,
    quote: {
      id: quoteId,
      tenant_id: 'tenant_a',
      created_at: '2026-09-08T04:00:00Z',
      status: 'draft',
      selected_tier: 'better',
      customer_full_name: 'Customer A',
      total_inc_gst: 110.25,
      share_token: 'customer-capability',
      scope_of_works: 'Replace charger',
      assumptions: ['Owner assumption'],
      risk_flags: ['Owner risk'],
      better: {
        label: 'Standard',
        total_inc_gst: 110.25,
        subtotal_ex_gst: 100.23,
        timeframe: 'Two days',
        line_items: [
          {
            description: 'Owned material',
            quantity: 1,
            unit_price_ex_gst: 100.23,
            source: 'owned-catalogue',
            supplied_by: 'customer',
            safety_note: 'Check supply',
          },
        ],
      },
    },
    processing: { ready: true, reason: null },
    edit_revision: initialRevision,
    customer_release_revision: 'c'.repeat(64),
    report_editor_doc: {
      version: 1,
      blocks: [{ type: 'paragraph', content: [{ text: 'Replace charger' }] }, { type: 'pricing' }],
    },
    gst_registered: true,
    intake: null,
    chain: { root: null, parent: null, children: [], next_cursor: null },
    money: {
      currency: 'AUD',
      unit: 'cents',
      source: 'stored_quote_chain',
      job_total_inc_gst_cents: null,
      inspection_credit_cents: null,
      deposit_base_cents: null,
      balance_base_cents: null,
      current_payment_base_cents: null,
      platform_fee_cents: null,
      customer_charge_cents: null,
    },
    capabilities: {
      delete: { allowed: false, reason: 'quote_has_public_link' },
      price_edit: { allowed: true, reason: null },
      document_edit: { allowed: false, reason: 'document_editor_disabled' },
      force_grounding: { allowed: true, reason: null },
    },
    eligibility: {
      issue_final: { allowed: false, reason: 'site_visit_not_paid', existing_quote_id: null },
      request_balance: { allowed: false, reason: 'not_final_quote', existing_quote_id: null },
    },
  });
}
const mockFetch = jest.fn();
it('accepts older owner responses while keeping supplied credit status bound to the final quote', () => {
  const record = fixture();
  expect(OwnedQuoteSchema.safeParse(record).success).toBe(true);
  record.quote.quote_kind = 'final';
  record.credit_settlement = {
    status: 'settled',
    reason: 'credit_covers_deposit',
    quote_id: quoteId,
  };
  expect(OwnedQuoteSchema.parse(record).credit_settlement?.status).toBe('settled');
  record.credit_settlement.quote_id = 'another-quote';
  expect(OwnedQuoteSchema.safeParse(record).success).toBe(false);
  delete record.credit_settlement.quote_id;
  expect(OwnedQuoteSchema.safeParse(record).success).toBe(false);
  record.credit_settlement.status = 'pending';
  expect(OwnedQuoteSchema.safeParse(record).success).toBe(true);
  record.quote.quote_kind = 'initial';
  expect(OwnedQuoteSchema.safeParse(record).success).toBe(false);
});
function reply(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
function shell(
  props: React.ComponentProps<typeof QuoteWorkspaceBody>,
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  return (
    <QueryClientProvider client={client}>
      <QuoteWorkspaceBody {...props} />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
  mockGetToken.mockResolvedValue('owned-token');
  mockRecovered = null;
});

it('sends unsaved tiers for a proposal, applies locally, then explicitly saves without sending', async () => {
  const initial = fixture();
  const saved = fixture();
  saved.edit_revision = savedRevision;
  saved.quote.better!.line_items![0] = { ...saved.quote.better!.line_items![0], quantity: 3 };
  const refresh = jest.fn(async () => saved);
  const screen = await render(shell({ initial, latest: initial, refresh, onClose: jest.fn() }));
  expect(screen.getByText('Risk: Owner risk')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.changeText(screen.getByLabelText('better line 1 quantity'), '2');
  await fireEvent.changeText(screen.getByLabelText('Describe a quote change'), 'Use three');
  mockFetch.mockResolvedValueOnce(
    reply({
      ok: true,
      assistantMessage: 'Three items proposed.',
      proposedTiers: {
        better: {
          label: 'Standard',
          timeframe: 'Two days',
          line_items: [
            { ...initial.quote.better!.line_items![0], original_line_index: 0, quantity: 3 },
          ],
        },
      },
      diff: [
        {
          tier: 'better',
          op: 'change',
          description: 'Owned material',
          grounded: true,
          oldQuantity: 2,
          newQuantity: 3,
        },
      ],
      anyUngrounded: false,
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Prepare change proposal' }));
  await waitFor(() => expect(screen.getByText('Three items proposed.')).toBeTruthy());
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
    expected_revision: initialRevision,
    currentTiers: {
      better: {
        timeframe: 'Two days',
        line_items: [
          {
            quantity: 2,
            source: 'owned-catalogue',
            original_line_index: 0,
            supplied_by: 'customer',
            safety_note: 'Check supply',
          },
        ],
      },
    },
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Apply proposal to working copy' }));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('better line 1 quantity').props.value).toBe('3');
  mockFetch.mockResolvedValueOnce(
    reply({
      ok: true,
      persisted: true,
      edit_revision: savedRevision,
      gst_registered: true,
      notification_requested: false,
      checkout_sync: 'complete',
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save without sending' }));
  await waitFor(() => expect(screen.getByText('Changes saved without sending.')).toBeTruthy());
  expect(mockFetch.mock.calls[1][0]).toContain(`/api/quote/${quoteId}/edit`);
  expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toMatchObject({
    expected_revision: initialRevision,
    notify_customer: false,
    better: { line_items: [{ quantity: 3, original_line_index: 0, supplied_by: 'customer' }] },
  });
  expect(JSON.parse(mockFetch.mock.calls[1][1].body)).not.toHaveProperty('force');
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('preserves a grounding-rejected working copy and requires separate override confirmation', async () => {
  const initial = fixture();
  const screen = await render(
    shell({ initial, latest: initial, refresh: jest.fn(), onClose: jest.fn() }),
  );
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.changeText(screen.getByLabelText('better line 1 price ex GST'), '999.99');
  mockFetch.mockResolvedValueOnce(
    reply(
      {
        error: 'grounding_failed',
        failures: [{ tier: 'better', reason: 'No matching catalogue price' }],
      },
      422,
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save without sending' }));
  await waitFor(() => expect(screen.getByText(/Some prices could not be verified/)).toBeTruthy());
  expect(screen.getByLabelText('better line 1 price ex GST').props.value).toBe('999.99');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await fireEvent.press(screen.getByRole('button', { name: 'Review owner price override' }));
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenCalledWith(
    'Save unverified owner prices?',
    expect.any(String),
    expect.arrayContaining([expect.objectContaining({ text: 'Save owner override' })]),
  );
  alert.mockRestore();
});

it('retains dirty edits on a concurrent revision refresh and protects hardware/back close', async () => {
  const initial = fixture();
  const client = new QueryClient();
  const closeRequest = { current: () => {} };
  const onClose = jest.fn();
  const props = { initial, latest: initial, refresh: jest.fn(), onClose, closeRequest };
  const screen = await render(shell(props, client));
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.changeText(
    screen.getByLabelText('better line 1 description'),
    'Unsaved owner wording',
  );
  const latest = fixture();
  latest.edit_revision = savedRevision;
  await screen.rerender(shell({ ...props, latest }, client));
  expect(screen.getByLabelText('better line 1 description').props.value).toBe(
    'Unsaved owner wording',
  );
  expect(screen.getByRole('button', { name: 'Save without sending' })).toBeDisabled();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(() => closeRequest.current());
  expect(onClose).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith(
    'Unsaved quote changes',
    expect.any(String),
    expect.any(Array),
  );
  alert.mockRestore();
});

it('fences an unknown save and retains the draft when readback is unavailable', async () => {
  const initial = fixture();
  const screen = await render(
    shell({
      initial,
      latest: initial,
      refresh: jest.fn(async () => {
        throw new Error('offline');
      }),
      onClose: jest.fn(),
    }),
  );
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.changeText(screen.getByLabelText('better line 1 quantity'), '4');
  mockFetch.mockRejectedValueOnce(new TypeError('Connection lost'));
  await fireEvent.press(screen.getByRole('button', { name: 'Save without sending' }));
  await waitFor(() => expect(screen.getByText('Save outcome needs checking')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Save without sending' })).toBeDisabled();
  expect(screen.getByLabelText('better line 1 quantity').props.value).toBe('4');
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it('does not dispatch a price mutation if token acquisition finishes after unmount', async () => {
  const initial = fixture();
  const screen = await render(
    shell({ initial, latest: initial, refresh: jest.fn(), onClose: jest.fn() }),
  );
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.changeText(screen.getByLabelText('better line 1 quantity'), '2');
  let tokenReady: (value: string) => void = () => {};
  mockGetToken.mockReturnValueOnce(
    new Promise(resolve => {
      tokenReady = resolve;
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save without sending' }));
  await screen.unmount();
  await act(async () => {
    tokenReady('late-token');
    await Promise.resolve();
  });
  expect(mockFetch).not.toHaveBeenCalled();
});

it.each([404, 503])(
  'reconciles a lost deletion response using owned readback status %i',
  async status => {
    const initial = fixture();
    initial.capabilities.delete = { allowed: true, reason: null };
    const deleted = jest.fn();
    const refresh = jest.fn(async () => {
      throw new ApiError('Owner read failed', status, `/api/quote/${quoteId}`);
    });
    const screen = await render(
      shell({ initial, latest: initial, refresh, onClose: jest.fn(), onDeleted: deleted }),
    );
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await fireEvent.press(screen.getByRole('button', { name: 'Delete this draft' }));
    const confirm = alert.mock.calls[0]![2]!.find(button => button.text === 'Delete draft')!;
    mockFetch.mockRejectedValueOnce(new TypeError('Response lost'));
    await act(async () => {
      confirm.onPress?.();
    });
    await waitFor(() => expect(screen.getByText('Save outcome needs checking')).toBeTruthy());
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      expected_revision: initialRevision,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh saved quote' }));
    if (status === 404) {
      await waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
      expect(mockRemoveDraft).toHaveBeenCalled();
    } else {
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(deleted).not.toHaveBeenCalled();
      expect(mockRemoveDraft).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Delete this draft' })).toBeDisabled();
    }
    alert.mockRestore();
  },
);

it('clears a reverted local draft before a clean Back can close', async () => {
  const initial = fixture();
  const onClose = jest.fn();
  const screen = await render(shell({ initial, latest: initial, refresh: jest.fn(), onClose }));
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.changeText(screen.getByLabelText('better line 1 quantity'), '2');
  await fireEvent.changeText(screen.getByLabelText('better line 1 quantity'), '1');
  let finish: () => void = () => {};
  mockRemoveDraft.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Back to quote' }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText('better line 1 quantity')).toHaveProp('editable', false);
  await act(async () => {
    finish();
  });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it('keeps restored manual lines distinct from newly added lines', async () => {
  const initial = fixture();
  const originalTiers = editableTiers(initial.quote);
  mockRecovered = {
    revision: initialRevision,
    originalTiers,
    workingTiers: {
      better: {
        ...originalTiers.better!,
        lines: [
          ...originalTiers.better!.lines,
          { ...newManualLine('manual:1'), description: 'Restored line' },
        ],
      },
    },
    savedAt: 1,
    expiresAt: 2,
  };
  const screen = await render(
    shell({ initial, latest: initial, refresh: async () => initial, onClose: jest.fn() }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Refresh saved quote' }));
  await waitFor(() => expect(screen.queryByText('Save outcome needs checking')).toBeNull());
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add better line' }));
  await fireEvent.changeText(
    screen.getByLabelText('better line 3 description'),
    'New independent line',
  );
  expect(screen.getByLabelText('better line 2 description').props.value).toBe('Restored line');
  await fireEvent.press(screen.getByRole('button', { name: 'Remove better line 2' }));
  expect(screen.getByLabelText('better line 2 description').props.value).toBe(
    'New independent line',
  );
  expect(screen.getByLabelText('better line 1 description').props.value).toBe('Owned material');
});

it('saves formatted document separately and retains unsaved price edits durably at the new revision', async () => {
  const initial = fixture();
  initial.capabilities.document_edit = { allowed: true, reason: null };
  const saved = fixture();
  saved.edit_revision = savedRevision;
  saved.report_editor_doc = {
    version: 1,
    blocks: [
      { type: 'paragraph', content: [{ text: 'New', marks: ['bold'] }, { text: ' scope' }] },
      { type: 'pricing' },
    ],
  };
  saved.quote.report_style = { fontFamily: 'serif' };
  const screen = await render(
    shell({ initial, latest: initial, refresh: async () => saved, onClose: jest.fn() }),
  );
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  await fireEvent.changeText(screen.getByLabelText('better line 1 quantity'), '2');
  await fireEvent.press(screen.getByRole('radio', { name: 'Edit document' }));
  const input = screen.getByLabelText('Block 1, paragraph');
  await fireEvent.changeText(input, 'New scope');
  await fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start: 0, end: 3 } } });
  await fireEvent.press(screen.getByRole('button', { name: 'bold' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'serif' }));
  expect(screen.queryByRole('button', { name: 'Remove text block 2' })).toBeNull();
  mockFetch.mockResolvedValueOnce(
    reply({ ok: true, persisted: true, edit_revision: savedRevision }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save document without sending' }));
  await waitFor(() => expect(screen.getByText('Document saved without sending.')).toBeTruthy());
  expect(mockFetch.mock.calls[0][0]).toContain(`/api/quote/${quoteId}/document`);
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
    expected_revision: initialRevision,
    report_doc: saved.report_editor_doc,
    report_style: { fontFamily: 'serif' },
  });
  expect(mockReplaceDraft).toHaveBeenCalledWith(
    expect.objectContaining({
      revision: savedRevision,
      workingTiers: expect.objectContaining({
        better: expect.objectContaining({
          lines: expect.arrayContaining([expect.objectContaining({ quantity: '2' })]),
        }),
      }),
      narrative: expect.objectContaining({
        workingDoc: saved.report_editor_doc,
        originalDoc: saved.report_editor_doc,
      }),
    }),
  );
  expect(mockRemoveDraft).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  expect(screen.getByLabelText('better line 1 quantity').props.value).toBe('2');
});

it('retains rejected document text and blocks unsupported document controls', async () => {
  const initial = fixture();
  const client = new QueryClient();
  const props = { initial, latest: initial, refresh: jest.fn(), onClose: jest.fn() };
  const screen = await render(shell(props, client));
  await fireEvent.press(screen.getByRole('radio', { name: 'Edit document' }));
  expect(screen.getByLabelText('Block 1, paragraph')).toHaveProp('editable', false);
  expect(screen.getByRole('radio', { name: 'serif' })).toBeDisabled();
  initial.capabilities.document_edit = { allowed: true, reason: null };
  await screen.rerender(shell({ ...props, latest: { ...initial } }, client));
  await fireEvent.changeText(
    screen.getByLabelText('Block 1, paragraph'),
    'Retain after server rejection',
  );
  mockFetch.mockResolvedValueOnce(reply({ error: 'invalid_document' }, 422));
  await fireEvent.press(screen.getByRole('button', { name: 'Save document without sending' }));
  await waitFor(() => expect(screen.getByText('Action needs attention')).toBeTruthy());
  expect(screen.getByLabelText('Block 1, paragraph').props.value).toBe(
    'Retain after server rejection',
  );
  expect(mockRemoveDraft).not.toHaveBeenCalled();
});

it('preserves an unfinished narrative when prices save, and recovers its new baseline after reopening', async () => {
  const initial = fixture();
  initial.capabilities.document_edit = { allowed: true, reason: null };
  const saved = fixture();
  saved.capabilities.document_edit = { allowed: true, reason: null };
  saved.edit_revision = savedRevision;
  saved.quote.better!.line_items![0]!.quantity = 2;
  const screen = await render(
    shell({ initial, latest: initial, refresh: async () => saved, onClose: jest.fn() }),
  );
  await fireEvent.press(screen.getByRole('radio', { name: 'Edit document' }));
  await fireEvent.changeText(screen.getByLabelText('Block 1, paragraph'), 'Unfinished document');
  await fireEvent.press(screen.getByRole('radio', { name: /Edit prices/i }));
  expect(screen.getByRole('button', { name: 'Save without sending' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('better line 1 quantity'), '2');
  mockFetch.mockResolvedValueOnce(
    reply({
      ok: true,
      persisted: true,
      edit_revision: savedRevision,
      gst_registered: true,
      notification_requested: false,
      checkout_sync: 'complete',
    }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save without sending' }));
  await waitFor(() => expect(screen.getByText('Changes saved without sending.')).toBeTruthy());
  const retained = (
    mockReplaceDraft.mock.calls[0] as unknown as [import('./quote-draft-storage').QuoteDraftInput]
  )[0];
  expect(retained.revision).toBe(savedRevision);
  expect(retained.narrative?.workingDoc?.blocks[0]).toEqual({
    type: 'paragraph',
    content: [{ text: 'Unfinished document' }],
  });
  expect(retained.narrative?.originalDoc).toEqual(initial.report_editor_doc);
  expect(retained.originalTiers.better?.lines[0]?.quantity).toBe('2');
  await screen.unmount();
  mockRecovered = { ...retained, savedAt: 1, expiresAt: 2 };
  const reopened = await render(
    shell({ initial: saved, latest: saved, refresh: async () => saved, onClose: jest.fn() }),
  );
  await fireEvent.press(reopened.getByRole('button', { name: 'Refresh saved quote' }));
  await fireEvent.press(reopened.getByRole('radio', { name: 'Edit document' }));
  expect(reopened.getByLabelText('Block 1, paragraph').props.value).toBe('Unfinished document');
  expect(
    reopened.getByRole('button', { name: 'Save document without sending' }),
  ).not.toBeDisabled();
  await fireEvent.press(reopened.getByRole('radio', { name: /Edit prices/i }));
  expect(reopened.getByLabelText('better line 1 quantity').props.value).toBe('2');
  expect(reopened.getByRole('button', { name: 'Save without sending' })).toBeDisabled();
});

it('opens a linked owned quote and returns to the original record without sending', async () => {
  const initial = fixture();
  initial.quote.estimate_number = 'INITIAL-1';
  const child = fixture();
  child.quote.id = '22222222-2222-4222-8222-222222222222';
  child.quote.quote_kind = 'final';
  child.quote.estimate_number = 'FINAL-1';
  initial.chain.children = [
    { id: child.quote.id, quote_kind: 'final', status: 'draft', total_inc_gst: null },
  ];
  mockOwnedQuery.mockImplementation(id => ({
    data: id === quoteId ? initial : child,
    refetch: jest.fn(),
  }));
  const onClose = jest.fn();
  const screen = await render(
    <QueryClientProvider client={new QueryClient()}>
      <QuoteWorkspace quoteId={quoteId} onClose={onClose} />
    </QueryClientProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Open Final quote · draft' }));
  await waitFor(() => expect(screen.getByText('FINAL-1')).toBeTruthy());
  expect(mockOwnedQuery).toHaveBeenLastCalledWith(child.quote.id);
  await fireEvent.press(screen.getByRole('button', { name: 'Back to quote' }));
  await waitFor(() => expect(screen.getByText('INITIAL-1')).toBeTruthy());
  expect(onClose).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});
