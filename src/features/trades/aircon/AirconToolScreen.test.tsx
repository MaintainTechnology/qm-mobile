import { fireEvent, render } from '@testing-library/react-native';

import { AirconPricingRequiredCard, OptionCardView } from './AirconToolScreen';
import type { AcOption } from './schema';

const option = (gstRegistered: boolean): AcOption => ({
  system_type: 'split', capacity_kw: 2.5, price: { low: 1800, high: 2400 }, best_fit: true,
  pros: [],
  pricing: {
    point_estimate_ex_gst: 1900,
    point_estimate_inc_gst: gstRegistered ? 2090 : 1900,
    confidence_band_pct: 12,
    gst_registered: gstRegistered,
    formula: 'tenant card', band_reason: 'high confidence', components: [], adjustments: [],
  },
});

describe('aircon pricing presentation', () => {
  it('shows setup/site-visit actions without any monetary output when unpriced', async () => {
    const screen = await render(
      <AirconPricingRequiredCard
        setupReason="Complete the air-conditioning rate card."
        routingReason="Book a site assessment before quoting."
      />,
    );
    expect(screen.getByText(/PRICE NEEDED/i)).toBeTruthy();
    expect(screen.getByText(/OPEN PRICING SETUP/i)).toBeTruthy();
    expect(screen.queryByText(/A\$/)).toBeNull();
  });

  it.each([
    [true, 'INC GST'],
    [false, 'NO GST CHARGED'],
  ] as const)('labels priced output for GST registered=%s', async (registered, label) => {
    const screen = await render(<OptionCardView option={option(registered)} rooms={[]} />);
    expect(screen.getByText(new RegExp(label))).toBeTruthy();
    await fireEvent.press(screen.getByText(/HOW THIS PRICE WAS CALCULATED/i));
    expect(
      screen.getByText(registered ? /POINT ESTIMATE INC GST/ : /^NO GST CHARGED$/),
    ).toBeTruthy();
  });
});
