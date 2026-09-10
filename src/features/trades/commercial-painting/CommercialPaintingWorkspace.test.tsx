import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { themes as mockThemes } from '@/lib/theme';
import { CommercialPaintingScreen, CommercialPaintingWorkspace } from './CommercialPaintingScreen';
import type { RunDetail } from './api';
import type { PaintReceipt } from './save-receipt';
import { paintInputKey } from './pricing-contract';

const scope = { userId: 'user_a', tenantId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' };
const runId = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', extractionId = 'cccccccc-1111-4111-8111-cccccccccccc';
const proof = { pricingProof: 'a'.repeat(64), pricedAt: '2026-09-09T00:00:00.123456Z' };
const revision = 'c'.repeat(64);
const bom = { lines: [{ surface: 'walls', quantity: 10, labourExGst: 80, materialExGst: 20, lineExGst: 100 }], unmatched: [], excluded: [],
  labour: { hours: 1, ratePerHr: 80, costExGst: 80 }, materials: [], materialsExGst: 20, equipment: [], equipmentExGst: 0,
  subtotalExGst: 100, gst: 10, totalIncGst: 110, gstRegistered: true, assumptions: [], exclusions: [] };
let mockData: RunDetail;
let mockReceipt: PaintReceipt | null = null, mockReceiptLoaded = true;
const mockPrice = jest.fn(), mockExtract = jest.fn(), mockSign = jest.fn(), mockComplete = jest.fn(), mockDoc = jest.fn(), mockRemove = jest.fn(), mockSave = jest.fn(), mockRefresh = jest.fn(), mockPush = jest.fn();
const mockDraftSave = jest.fn(async (_value: unknown) => undefined), mockDraftLoad = jest.fn(async () => null as unknown);
const mockResumeLoad = jest.fn(async () => runId as string | null), mockResumeSave = jest.fn(async (_id: string | null) => undefined);
const mockPreventRemove = jest.fn(), mockTenantRetry = jest.fn();
let mockMonitorReview = false;
const mockReviewRender = jest.fn();
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ userId: 'user_a', sessionId: 'session_a' }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: mockThemes.dark }) }));
jest.mock('../ui', () => {
  const actual = jest.requireActual('../ui') as typeof import('../ui');
  const React = jest.requireActual('react') as typeof import('react');
  return { ...actual, Notice: (props: import('react').ComponentProps<typeof actual.Notice>) => {
    if (mockMonitorReview && props.label === 'Exact server pricing reviewed') mockReviewRender();
    return React.createElement(actual.Notice, props);
  } };
});
jest.mock('@/lib/tenant', () => ({ useTenantMe: () => ({ isError: true, error: new Error('offline'), refetch: mockTenantRetry }) }));
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_: string, text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('@/lib/working-draft-storage', () => ({ createWorkingDraftStore: () => ({ load: mockDraftLoad, save: mockDraftSave, remove: jest.fn() }) }));
jest.mock('./run-resume', () => ({ createPaintRunResume: () => ({ load: mockResumeLoad, save: mockResumeSave }) }));
jest.mock('./use-paint-save', () => ({ usePaintSave: () => ({ loaded: mockReceiptLoaded, busy: false, receipt: mockReceipt, saved: null, error: null, save: mockSave, refresh: mockRefresh }) }));
jest.mock('./api', () => ({ ...jest.requireActual('./api'),
  useRun: (id: string | null) => ({ data: id ? mockData : undefined, refetch: async () => ({ data: mockData }) }),
  useRuns: () => ({ data: { runs: [{ id: 'eeeeeeee-1111-4111-8111-eeeeeeeeeeee', status: 'priced', job_name: 'Another run' }] } }),
  useSignUploads: () => ({ mutateAsync: mockSign }), useCompleteUploads: () => ({ mutateAsync: mockComplete }),
  useExtract: () => ({ mutateAsync: mockExtract }), usePrice: () => ({ mutateAsync: mockPrice }),
  useSetDocType: () => ({ mutate: mockDoc }), useRemoveUpload: () => ({ mutate: mockRemove }),
}));
beforeEach(() => {
  jest.clearAllMocks(); mockReceipt = null; mockReceiptLoaded = true; mockMonitorReview = false;
  mockData = { ok: true, run: { id: runId, status: 'priced', job_name: 'Saved job', site_address: 'Saved address' }, uploads: [],
    edit_review_state: 'matched', edit_snapshot: { runId, extractionId, revision, job_name: 'Saved job', site_address: 'Saved address', items: [{ surface: 'walls', quantity: 10 }], corrected_items: null, released: false },
    extraction: { id: extractionId, items: [{ surface: 'walls', quantity: 10 }], priced_bom: bom, priced_at: proof.pricedAt, pricing_review: proof } } as RunDetail;
  mockDraftLoad.mockReset().mockResolvedValue(null); mockDraftSave.mockReset().mockResolvedValue(undefined);
  mockResumeLoad.mockReset().mockResolvedValue(runId); mockResumeSave.mockReset().mockResolvedValue(undefined);
  mockPrice.mockReset().mockResolvedValue({ ok: true, bom, ...proof, gst_registered: true, usesSeedDefaults: false, rateRows: 3, labourBasis: { mode: 'tenant', ratePerHr: null } });
});
const mount = async () => { const view = await render(<CommercialPaintingWorkspace scope={scope} />); await screen.findByText('04 · Priced summary'); await waitFor(() => expect(screen.getByLabelText('Customer name (optional)').props.editable).toBe(true)); return view; };
function retainUnknown() {
  const original = { paintRunId: runId, extractionId, ...proof, customerName: 'Original Contact', customerPhone: '0412345678' };
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  mockReceipt = { version: 1, pass: { paintRunId: runId, extractionId, ...proof }, inputHash: crypto.createHash('sha256').update(paintInputKey(original)).digest('hex'), quoteId: null };
  return original;
}

it('shows persisted prices as previews until an exact server review, keeping release Save closed', async () => {
  await mount(); expect(screen.queryByText('Exact server pricing reviewed')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Re-price this takeoff' }));
  await screen.findByText('Exact server pricing reviewed'); expect(mockPrice).toHaveBeenCalledWith({ paintRunId: runId, extractionId, expectedRevision: revision });
  await fireEvent.press(screen.getByRole('button', { name: 'Save as quote' })); expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByText('Mobile Save is awaiting release checks')).toBeTruthy();
  expect(screen.getByLabelText('Job name').props.editable).toBe(false);
});
it('stores partial labour text without coercion, then requests and verifies an explicit override', async () => {
  await mount(); const field = screen.getByLabelText('Labour rate per hour (optional)');
  await fireEvent.changeText(field, '1.'); await waitFor(() => expect(mockDraftSave).toHaveBeenLastCalledWith(expect.objectContaining({ labour: '1.' })));
  await fireEvent.press(screen.getByRole('button', { name: 'Re-price this takeoff' })); expect(mockPrice).not.toHaveBeenCalled();
  await fireEvent.changeText(field, '95.25'); await waitFor(() => expect(mockDraftSave).toHaveBeenLastCalledWith(expect.objectContaining({ labour: '95.25' })));
  const overrideBom = { ...bom, labour: { ...bom.labour, ratePerHr: 95.25 } };
  mockData = { ...mockData, extraction: { ...mockData.extraction!, priced_bom: overrideBom } };
  mockPrice.mockResolvedValue({ ok: true, bom: overrideBom, ...proof, gst_registered: true, usesSeedDefaults: false, rateRows: 3, labourBasis: { mode: 'override', ratePerHr: 95.25 } });
  await fireEvent.press(screen.getByRole('button', { name: 'Re-price this takeoff' })); await screen.findByText('Exact server pricing reviewed');
  expect(mockPrice).toHaveBeenCalledWith({ paintRunId: runId, extractionId, expectedRevision: revision, labourRatePerHr: 95.25 });
  await fireEvent.changeText(field, '96'); expect(screen.queryByText('Exact server pricing reviewed')).toBeNull();
});
it('blocks navigation and preserves last customer edit until secure storage retry succeeds', async () => {
  await mount(); mockDraftSave.mockRejectedValueOnce(new Error('Keychain unavailable'));
  await fireEvent.changeText(screen.getByLabelText('Customer name (optional)'), 'Private Customer'); await screen.findByText('Working copy needs attention');
  expect(screen.getByLabelText('Customer name (optional)').props.value).toBe('Private Customer');
  expect(mockPreventRemove.mock.calls.at(-1)?.[0]).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'TRY AGAIN' }));
  await waitFor(() => expect(mockPreventRemove.mock.calls.at(-1)?.[0]).toBe(false));
  expect(screen.getByLabelText('Customer name (optional)').props.value).toBe('Private Customer');
});
it('loads recovery before run resume and cannot erase unknown Save by switching runs or repricing', async () => {
  mockReceiptLoaded = false; const view = await render(<CommercialPaintingWorkspace scope={scope} />);
  expect(mockResumeLoad).not.toHaveBeenCalled(); mockReceiptLoaded = true;
  mockReceipt = { version: 1, pass: { paintRunId: runId, extractionId, ...proof }, inputHash: 'b'.repeat(64), quoteId: null };
  await view.rerender(<CommercialPaintingWorkspace scope={scope} />); await screen.findByText('Check an earlier Save');
  await fireEvent.press(screen.getByRole('button', { name: 'Re-price this takeoff' }));
  await fireEvent.press(screen.getByText('START A NEW RUN'));
  await fireEvent.press(screen.getByText('Another run'));
  expect(mockPrice).not.toHaveBeenCalled(); expect(mockResumeSave).not.toHaveBeenCalled(); expect(mockSave).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Check Save status' })); expect(mockRefresh).toHaveBeenCalledTimes(1);
});
it('retains current run if its replacement cannot be stored', async () => {
  await mount(); mockResumeSave.mockRejectedValueOnce(new Error('No space'));
  await fireEvent.press(screen.getByText('Another run')); await screen.findByText('Something needs attention');
  expect(screen.getByLabelText('Job name').props.value).toBe('Saved job');
});
it('allows original customer re-entry after a missing working copy and retries the exact old pass while new Save stays gated', async () => {
  const original = retainUnknown(); await render(<CommercialPaintingWorkspace scope={scope} />);
  await waitFor(() => expect(screen.getByLabelText('Original customer name').props.editable).toBe(true));
  expect(screen.getByLabelText('Original customer name').props.value).toBe('');
  expect(screen.getByLabelText('Customer name (optional)').props.editable).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry earlier Save' }));
  await screen.findByText(/Restore the original customer name and phone/); expect(mockSave).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Original customer name'), original.customerName);
  await fireEvent.changeText(screen.getByLabelText('Original customer phone'), original.customerPhone);
  await waitFor(() => expect(mockDraftSave).toHaveBeenLastCalledWith(expect.objectContaining({ customerName: original.customerName, customerPhone: original.customerPhone })));
  await waitFor(() => expect(mockPreventRemove.mock.calls.at(-1)?.[0]).toBe(false));
  await fireEvent.press(screen.getByRole('button', { name: 'Retry earlier Save' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(original, 'retry'));
  await fireEvent.press(screen.getByRole('button', { name: 'Save as quote' }));
  expect(mockSave).toHaveBeenCalledTimes(1); expect(mockPrice).not.toHaveBeenCalled();
  expect(screen.getByText('Mobile Save is awaiting release checks')).toBeTruthy();
});
it('keeps recovered contact edits and blocks explicit retry until their encrypted write succeeds', async () => {
  const original = retainUnknown(); await render(<CommercialPaintingWorkspace scope={scope} />);
  await waitFor(() => expect(screen.getByLabelText('Original customer name').props.editable).toBe(true));
  mockDraftSave.mockRejectedValue(new Error('Keychain unavailable'));
  await fireEvent.changeText(screen.getByLabelText('Original customer name'), original.customerName);
  await fireEvent.changeText(screen.getByLabelText('Original customer phone'), original.customerPhone);
  await screen.findByText('Working copy needs attention');
  await fireEvent.press(screen.getByRole('button', { name: 'Retry earlier Save' })); expect(mockSave).not.toHaveBeenCalled();
  expect(mockPreventRemove.mock.calls.at(-1)?.[0]).toBe(true);
  mockDraftSave.mockResolvedValue(undefined); await fireEvent.press(screen.getByRole('button', { name: 'TRY AGAIN' }));
  await waitFor(() => expect(mockPreventRemove.mock.calls.at(-1)?.[0]).toBe(false));
  expect(screen.getByLabelText('Original customer phone').props.value).toBe(original.customerPhone);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry earlier Save' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(original, 'retry'));
});
it('does not apply a pricing response after unmount', async () => {
  let finish!: (value: unknown) => void; mockPrice.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = await mount(); await fireEvent.press(screen.getByRole('button', { name: 'Re-price this takeoff' })); await view.unmount();
  await act(async () => { finish({ ok: true, bom, ...proof, gst_registered: true, usesSeedDefaults: false, rateRows: 3, labourBasis: { mode: 'tenant', ratePerHr: null } }); });
  expect(mockSave).not.toHaveBeenCalled(); expect(mockResumeSave).not.toHaveBeenCalled();
});
it('hides a mixed-snapshot BOM and blocks pricing until the displayed takeoff matches its observed revision', async () => {
  mockData = { ...mockData, edit_snapshot: { ...mockData.edit_snapshot!, corrected_items: [{ surface: 'walls', quantity: 200 }] } };
  await render(<CommercialPaintingWorkspace scope={scope} />); await screen.findByText('Refresh the takeoff review');
  expect(screen.queryByText('04 · Priced summary')).toBeNull(); expect(screen.queryByText('Exact server pricing reviewed')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Price this takeoff' })); expect(mockPrice).not.toHaveBeenCalled();
});
it('rejects a price completion when its refetched correction revision no longer matches the displayed baseline', async () => {
  await mount(); mockPrice.mockImplementationOnce(async () => {
    mockData = { ...mockData, edit_snapshot: { ...mockData.edit_snapshot!, revision: 'd'.repeat(64) } };
    return { ok: true, bom, ...proof, gst_registered: true, usesSeedDefaults: false, rateRows: 3, labourBasis: { mode: 'tenant', ratePerHr: null } };
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Re-price this takeoff' }));
  await screen.findByText('Something needs attention'); expect(screen.queryByText('Exact server pricing reviewed')).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
});
it.each(['correction', 'pricing', 'timestamp'])('never renders a retained review against a remote %s update, including before passive cleanup', async change => {
  const view = await mount(); await fireEvent.press(screen.getByRole('button', { name: 'Re-price this takeoff' }));
  await screen.findByText('Exact server pricing reviewed');
  const earlier = mockData;
  if (change === 'correction') {
    const corrected = [{ surface: 'walls', quantity: 200 }];
    mockData = { ...mockData, edit_snapshot: { ...mockData.edit_snapshot!, revision: 'd'.repeat(64), corrected_items: corrected },
      extraction: { ...mockData.extraction!, corrected_items: corrected, priced_bom: null, priced_at: null, pricing_review: null } };
  } else if (change === 'timestamp') {
    mockData = { ...mockData, extraction: { ...mockData.extraction!, priced_at: '2026-09-09T00:00:00.123457Z' } };
  } else {
    const next = { pricingProof: 'e'.repeat(64), pricedAt: '2026-09-09T00:00:00.123457Z' };
    mockData = { ...mockData, extraction: { ...mockData.extraction!, priced_at: next.pricedAt, pricing_review: next,
      priced_bom: { ...bom, totalIncGst: 220 } } };
  }
  mockMonitorReview = true; await view.rerender(<CommercialPaintingWorkspace scope={scope} />);
  expect(mockReviewRender).not.toHaveBeenCalled(); expect(screen.queryByText('Exact server pricing reviewed')).toBeNull();
  if (change === 'correction') expect(screen.queryByText('04 · Priced summary')).toBeNull();
  mockData = earlier; await view.rerender(<CommercialPaintingWorkspace scope={scope} />);
  expect(mockReviewRender).not.toHaveBeenCalled(); expect(screen.queryByText('Exact server pricing reviewed')).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
});
it('offers a controlled retry for the account read before exposing the workspace', async () => {
  await render(<CommercialPaintingScreen />); await fireEvent.press(screen.getByRole('button', { name: 'TRY AGAIN' }));
  expect(mockTenantRetry).toHaveBeenCalledTimes(1); expect(mockPrice).not.toHaveBeenCalled();
});
