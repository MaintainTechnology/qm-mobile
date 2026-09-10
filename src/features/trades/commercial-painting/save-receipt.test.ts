import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@/lib/api';
import { acknowledgePaintDraft, loadPaintReceipt, preparePaintSaveRetryInput, recoverPaintDraft, savePaintDraft } from './save-receipt';
import type { PaintPass, PaintSaved } from './pricing-contract';
import { paintInputKey } from './pricing-contract';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_: string, text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7, isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const storage = new Map<string, string>();
const scope = { userId: 'user_a', tenantId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' };
const pass: PaintPass = { paintRunId: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', extractionId: 'cccccccc-1111-4111-8111-cccccccccccc',
  pricingProof: 'a'.repeat(64), pricedAt: '2026-09-09T00:00:00.123456Z' };
const input = { ...pass, customerName: 'Private Customer', customerPhone: '0412345678' };
const saved = (patch: Partial<PaintSaved> = {}): PaintSaved => ({ ...pass, ok: true, quoteId: 'dddddddd-1111-4111-8111-dddddddddddd',
  shareToken: 'share-private-token', quoteViewUrl: '/q/share-private-token', pdfUrl: '/api/q/share-private-token/pdf', delivery: { attempted: false }, ...patch });
beforeEach(() => {
  storage.clear(); jest.clearAllMocks();
  jest.mocked(SecureStore.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { storage.delete(key); });
});
const lost = () => savePaintDraft(scope, input, 'start', async () => { throw new Error('Lost acknowledgement'); });

it('retains only an opaque reviewed pass before dispatch and requires explicit acknowledgement of saved identity', async () => {
  const dispatch = jest.fn(async body => {
    expect((await loadPaintReceipt(scope))?.pass).toEqual(pass); expect(body).toEqual(input); return saved();
  });
  await savePaintDraft(scope, input, 'start', dispatch);
  const data = [...storage.values()].join('');
  for (const secret of [input.customerName, input.customerPhone, saved().shareToken]) expect(data).not.toContain(secret);
  expect([...storage.keys()].join('')).not.toContain(scope.userId);
  await expect(savePaintDraft(scope, input, 'start', dispatch)).rejects.toThrow('previous quote save');
  await expect(acknowledgePaintDraft(scope, pass.extractionId)).rejects.toThrow('Check the saved quote');
  await acknowledgePaintDraft(scope, saved().quoteId); expect(await loadPaintReceipt(scope)).toBeNull();
});
it('retains unknown across absent GET readback and repricing, then recovers the original microsecond pass', async () => {
  await expect(lost()).rejects.toThrow('Lost acknowledgement');
  expect(await recoverPaintDraft(scope, async original => ({ ...original, ok: true, status: 'not_found' }))).toBeNull();
  await expect(savePaintDraft(scope, { ...input, pricedAt: '2026-09-09T00:00:00.123457Z' }, 'start', jest.fn())).rejects.toThrow('previous quote save');
  const read = jest.fn(async original => ({ ...saved(), ...original, status: 'saved' }));
  expect((await recoverPaintDraft(scope, read))?.quoteId).toBe(saved().quoteId);
  expect(read).toHaveBeenCalledWith(pass);
});
it('permits only an explicit retry with the exact original customer and reviewed inputs', async () => {
  await expect(lost()).rejects.toThrow(); const dispatch = jest.fn(async () => saved());
  for (const changed of [{ ...input, customerPhone: '' }, { ...input, customerName: 'Another' }, { ...input, pricingProof: 'b'.repeat(64) }])
    await expect(savePaintDraft(scope, changed, 'retry', dispatch)).rejects.toThrow('Restore the original');
  expect(dispatch).not.toHaveBeenCalled();
  await savePaintDraft(scope, input, 'retry', dispatch); expect(dispatch).toHaveBeenCalledWith(input);
});
it('restores trimmed original details against the retained full-input hash without storing contact data', async () => {
  await expect(lost()).rejects.toThrow(); const receipt = (await loadPaintReceipt(scope))!;
  const restored = await preparePaintSaveRetryInput(receipt, { customerName: ` ${input.customerName} `, customerPhone: ` ${input.customerPhone} ` });
  expect(restored).toEqual(input);
  const dispatch = jest.fn(async () => saved()); await savePaintDraft(scope, restored, 'retry', dispatch);
  expect(dispatch).toHaveBeenCalledWith(input);
  expect([...storage.values()].join('')).not.toContain(input.customerName);
});
it.each([
  {}, { customerName: '' }, { customerPhone: '' }, { customerName: '', customerPhone: '' },
])('restores only the matching blank/omitted optional input variant %j', async contacts => {
  const original = { ...pass, ...contacts };
  await expect(savePaintDraft(scope, original, 'start', async () => { throw new Error('Lost response'); })).rejects.toThrow();
  const restored = await preparePaintSaveRetryInput((await loadPaintReceipt(scope))!, { customerName: ' ', customerPhone: '' });
  const dispatch = jest.fn(async (_body: unknown) => saved()); await savePaintDraft(scope, restored, 'retry', dispatch);
  expect(paintInputKey(dispatch.mock.calls[0]?.[0])).toBe(paintInputKey(original));
});
it.each([
  { customerName: '', customerPhone: input.customerPhone },
  { customerName: input.customerName, customerPhone: '0411111111' },
  { customerName: 'x'.repeat(121), customerPhone: input.customerPhone },
])('rejects mismatched or invalid re-entry and preserves the receipt %j', async contacts => {
  await expect(lost()).rejects.toThrow(); const receipt = (await loadPaintReceipt(scope))!;
  await expect(preparePaintSaveRetryInput(receipt, contacts)).rejects.toThrow('Restore the original customer');
  expect(await loadPaintReceipt(scope)).toEqual(receipt);
});
it.each([
  { pricingProof: 'b'.repeat(64) }, { pricedAt: '2026-09-09T00:00:00.123457Z' },
  { quoteViewUrl: 'https://foreign.example/q/token' }, { delivery: { attempted: true } },
])('retains unknown on mismatched or unsafe saved result %j', async patch => {
  await expect(savePaintDraft(scope, input, 'start', async () => ({ ...saved(), ...patch }))).rejects.toThrow();
  expect((await loadPaintReceipt(scope))?.quoteId).toBeNull();
});
it('does not release an old unknown on a later conclusive retry rejection', async () => {
  const rejection = new ApiError('Pricing changed', 409, '/save-quote', { error: 'pricing_changed' });
  await expect(lost()).rejects.toThrow();
  await expect(savePaintDraft(scope, input, 'retry', async () => { throw rejection; })).rejects.toThrow();
  expect(await loadPaintReceipt(scope)).not.toBeNull();
});
it('clears only a first conclusive pre-write rejection', async () => {
  await expect(savePaintDraft(scope, input, 'start', async () => { throw new ApiError('Pricing changed', 409, '/save-quote', { error: 'pricing_changed' }); })).rejects.toThrow();
  expect(await loadPaintReceipt(scope)).toBeNull();
});
it('prevents any save when storage fails or silently refuses the receipt', async () => {
  const dispatch = jest.fn();
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('Storage unavailable'));
  await expect(savePaintDraft(scope, input, 'start', dispatch)).rejects.toThrow('Storage unavailable');
  jest.mocked(SecureStore.setItemAsync).mockResolvedValueOnce();
  await expect(savePaintDraft(scope, input, 'start', dispatch)).rejects.toThrow('could not be stored');
  expect(dispatch).not.toHaveBeenCalled();
});
it('does not expire unknown or let another user or tenant read it', async () => {
  await expect(lost()).rejects.toThrow();
  expect(await loadPaintReceipt({ ...scope, userId: 'user_b' })).toBeNull();
  expect(await loadPaintReceipt({ ...scope, tenantId: pass.paintRunId })).toBeNull();
  jest.spyOn(Date, 'now').mockReturnValue(9999999999999);
  expect(await loadPaintReceipt(scope)).not.toBeNull(); jest.restoreAllMocks();
});
it('serializes double taps before request dispatch', async () => {
  let finish!: (value: PaintSaved) => void;
  const dispatch = jest.fn(async () => new Promise<PaintSaved>(resolve => { finish = resolve; }));
  const first = savePaintDraft(scope, input, 'start', dispatch);
  for (let i = 0; i < 50 && !finish; i++) await Promise.resolve();
  await expect(savePaintDraft(scope, input, 'start', dispatch)).rejects.toThrow('still in progress');
  finish(saved()); await first; expect(dispatch).toHaveBeenCalledTimes(1);
});
