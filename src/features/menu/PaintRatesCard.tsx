/**
 * G2 — painting $/unit rates (walls, ceilings, trim, exterior) + call-out minimum. Thin config
 * over `OverlayRatesCard`; see that file's header for the save/merge behaviour and api.ts's header
 * for why this targets `/api/tenant/painting-rates` rather than `/api/tenant/me`. Bounds match
 * `PaintingRateOverlaySchema` (lib/painting/rate-card-overlay.ts) and the identical onboarding
 * bounds: rates positive max A$200, call-out minimum A$0–5,000. Blank is a deliberate, valid "use
 * the default" state on every field here — none of them are required the way the labour rates are.
 */
import { PAINT_SCOPES, usePaintingRates, useSavePaintingRates } from './api';
import { OverlayRatesCard, type OverlayField } from './OverlayRatesCard';

const MAX_PAINT_RATE_DOLLARS = 200;
const MAX_CALL_OUT_DOLLARS = 5000;

const FIELDS: OverlayField[] = [
  ...PAINT_SCOPES.map(
    ([key, label, unit]): OverlayField => ({
      key,
      label,
      suffix: `/ ${unit}`,
      bound: { positive: true, maxDollars: MAX_PAINT_RATE_DOLLARS, required: false },
      mapKey: 'rate_per_unit',
    }),
  ),
  {
    key: 'call_out_minimum_ex_gst',
    label: 'Call-out minimum',
    bound: { maxDollars: MAX_CALL_OUT_DOLLARS, required: false },
  },
];

export function PaintRatesCard() {
  return (
    <OverlayRatesCard
      title="PAINTING RATES"
      hint="A$ per unit, ex GST. Leave a field blank to use the default rate."
      emptyHint="Finish onboarding for your primary trade first — painting rates live on the same pricing book row."
      fields={FIELDS}
      useQuery={usePaintingRates}
      useSave={useSavePaintingRates}
    />
  );
}
