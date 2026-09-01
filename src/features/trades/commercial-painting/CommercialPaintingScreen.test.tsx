import { fireEvent, render } from '@testing-library/react-native';
import {
  PaintPricingGate,
  PricedSummary,
  repriceAndProveFreshBom,
} from './CommercialPaintingScreen';
import { isCurrentPaintPricingAttempt, isPaintPricingProofUnavailable } from './pricing-freshness';
import type { PricedBom } from './api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const bom = (gstRegistered: boolean, unmatched: PricedBom['unmatched'] = []): PricedBom =>
  ({
    lines: [],
    unmatched,
    excluded: [],
    labour: { hours: 1, ratePerHr: 80, costExGst: 80 },
    materials: [],
    materialsExGst: 0,
    equipment: [],
    equipmentExGst: 0,
    subtotalExGst: 80,
    gst: gstRegistered ? 8 : 0,
    totalIncGst: gstRegistered ? 88 : 80,
    gstRegistered,
    assumptions: [],
    exclusions: [],
  }) as PricedBom;

describe('commercial-paint pricing presentation', () => {
  it('blocks save and routes unmatched work to an on-site assessment', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <PaintPricingGate
        bom={bom(true, [{ surface: 'feature wall' } as never])}
        block="inspection_required"
        busy={false}
        onSave={onSave}
      />,
    );
    expect(screen.getAllByText(/ON-SITE ASSESSMENT/i).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByText('Save as quote'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows direct rate-setup copy and no enabled save for tenant pricing required', async () => {
    const screen = await render(
      <PaintPricingGate
        bom={bom(true)}
        block="tenant_pricing_required"
        busy={false}
        onSave={jest.fn()}
      />,
    );
    expect(screen.getByText(/SET YOUR OWN COMMERCIAL-PAINT RATES/i)).toBeTruthy();
    expect(screen.getByText(/OPEN PRICING SETUP/i)).toBeTruthy();
  });

  it.each([
    ['transport', new Error('network unavailable')],
    ['500', Object.assign(new Error('server failed'), { status: 500 })],
    ['schema', new TypeError('response schema mismatch')],
    ['unknown', { unexpected: true }],
  ])(
    'keeps a previously-priced Save disabled after a %s repricing failure',
    async (_kind, error) => {
      const refetch = jest.fn();
      const result = await repriceAndProveFreshBom(
        () => Promise.reject(error),
        refetch,
        'extract-1',
      );
      expect(result).toEqual({ ok: false, error, previewRefreshed: false });
      expect(refetch).not.toHaveBeenCalled();

      const onSave = jest.fn();
      const screen = await render(
        <PaintPricingGate
          bom={bom(true)}
          block={null}
          busy={false}
          pricingVerified={result.ok}
          onSave={onSave}
        />,
      );
      await fireEvent.press(screen.getByText('Save as quote'));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(/VERSIONED PRICING CHECK REQUIRED/i)).toBeTruthy();
    },
  );

  it('keeps a remounted priced preview fail-closed by default', async () => {
    const onSave = jest.fn();
    const screen = await render(
      <PaintPricingGate bom={bom(true)} block={null} busy={false} onSave={onSave} />,
    );
    await fireEvent.press(screen.getByText('Save as quote'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/VERSIONED PRICING CHECK REQUIRED/i)).toBeTruthy();
  });

  it('requires current persisted pricing and still blocks when the server has no revision proof', async () => {
    const current = bom(true);
    await expect(
      repriceAndProveFreshBom(
        () => Promise.resolve(),
        () =>
          Promise.resolve({
            data: {
              extraction: {
                id: 'old-extract',
                priced_bom: current,
                priced_at: '2026-09-01T00:00:00.000Z',
              },
            },
          }),
        'extract-1',
      ),
    ).resolves.toMatchObject({ ok: false, previewRefreshed: false });

    const result = await repriceAndProveFreshBom(
      () => Promise.resolve(),
      () =>
        Promise.resolve({
          data: {
            extraction: {
              id: 'extract-1',
              priced_bom: current,
              priced_at: '2026-09-01T00:00:00.000Z',
            },
          },
        }),
      'extract-1',
    );
    expect(result.ok).toBe(false);
    expect(result.previewRefreshed).toBe(true);
    expect(isPaintPricingProofUnavailable(result.error)).toBe(true);
  });

  it('rejects late pricing responses after a run or request switch', () => {
    const attempt = { sequence: 3, runId: 'run-a', extractionId: 'extract-a' };
    expect(
      isCurrentPaintPricingAttempt(attempt, {
        sequence: 3,
        runId: 'run-a',
        extractionId: 'extract-a',
      }),
    ).toBe(true);
    expect(
      isCurrentPaintPricingAttempt(attempt, {
        sequence: 4,
        runId: 'run-a',
        extractionId: 'extract-a',
      }),
    ).toBe(false);
    expect(
      isCurrentPaintPricingAttempt(attempt, {
        sequence: 3,
        runId: 'run-b',
        extractionId: 'extract-b',
      }),
    ).toBe(false);
  });

  it.each([
    [true, 'TOTAL INC GST', 'GST'],
    [false, 'TOTAL — NO GST CHARGED', 'NO GST CHARGED'],
  ] as const)(
    'renders dynamic GST labels for registered=%s',
    async (registered, totalLabel, gstLabel) => {
      const screen = await render(<PricedSummary bom={bom(registered)} />);
      expect(screen.getByText(totalLabel)).toBeTruthy();
      expect(screen.getByText(gstLabel)).toBeTruthy();
    },
  );
});
