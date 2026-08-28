import { fireEvent, render } from '@testing-library/react-native';
import { PaintPricingGate, PricedSummary } from './CommercialPaintingScreen';
import type { PricedBom } from './api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const bom = (gstRegistered: boolean, unmatched: PricedBom['unmatched'] = []): PricedBom =>
  ({
    lines: [], unmatched, excluded: [],
    labour: { hours: 1, ratePerHr: 80, costExGst: 80 },
    materials: [], materialsExGst: 0, equipment: [], equipmentExGst: 0,
    subtotalExGst: 80, gst: gstRegistered ? 8 : 0, totalIncGst: gstRegistered ? 88 : 80,
    gstRegistered, assumptions: [], exclusions: [],
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
    [true, 'TOTAL INC GST', 'GST'],
    [false, 'TOTAL — NO GST CHARGED', 'NO GST CHARGED'],
  ] as const)('renders dynamic GST labels for registered=%s', async (registered, totalLabel, gstLabel) => {
    const screen = await render(<PricedSummary bom={bom(registered)} />);
    expect(screen.getByText(totalLabel)).toBeTruthy();
    expect(screen.getByText(gstLabel)).toBeTruthy();
  });
});
