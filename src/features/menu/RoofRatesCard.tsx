/**
 * G2 — the 7 roofing material $/m² rates. Thin config over `OverlayRatesCard`; see that file's
 * header for the save/merge behaviour and api.ts's header for why this targets
 * `/api/tenant/roofing-rates` rather than `/api/tenant/me`. Bounds match `RoofingRateOverlaySchema`
 * (lib/roofing/rate-card-overlay.ts) and the identical onboarding bounds: positive, max A$500/m².
 * A blank material is a deliberate, valid state — same as the web dashboard, where a blank
 * Cement sheet rate means that material is never auto-quoted rather than quoted at $0.
 */
import { ROOF_MATERIALS, useRoofingRates, useSaveRoofingRates } from './api';
import { OverlayRatesCard, type OverlayField } from './OverlayRatesCard';

const MAX_ROOF_RATE_DOLLARS = 500;

const FIELDS: OverlayField[] = ROOF_MATERIALS.map(([key, label]) => ({
  key,
  label,
  suffix: '/ m²',
  bound: { positive: true, maxDollars: MAX_ROOF_RATE_DOLLARS, required: false },
  mapKey: 'reroof_rate_per_m2',
}));

export function RoofRatesCard() {
  return (
    <OverlayRatesCard
      title="ROOFING RATES"
      hint="A$ per m², ex GST. Leave a material blank to use the default rate — a blank Cement sheet rate means that material is never auto-quoted."
      emptyHint="Finish onboarding for your primary trade first — roofing rates live on the same pricing book row."
      fields={FIELDS}
      useQuery={useRoofingRates}
      useSave={useSaveRoofingRates}
    />
  );
}
