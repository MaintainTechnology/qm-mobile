/**
 * Pure data + helpers for the onboarding wizard (spec web-parity B2–B5). Ported from the web's
 * `lib/onboard/schema.ts` / `lib/onboard/field-labels.ts` / `lib/painting/pricing.ts` /
 * `lib/roofing/pricing.ts` so the mobile wizard sends the exact same `OnboardActivateSchema`
 * payload and reads the exact same validation errors back. No React here — keeps this unit
 * testable without mounting the screen.
 */

export type TradeSlug = 'electrical' | 'plumbing' | 'painting' | 'roofing';

/** Per-state licence-body pre-fill (web `LICENCE_BODIES`, `lib/onboard/schema.ts`). Free text —
 *  this only seeds the field, the tradie can type over it. */
export const LICENCE_BODIES: Record<string, Record<TradeSlug, string>> = {
  NSW: {
    electrical: 'NECA NSW',
    plumbing: 'NSW Fair Trading',
    painting: '',
    roofing: 'NSW Fair Trading',
  },
  VIC: { electrical: 'ESV', plumbing: 'VBA', painting: '', roofing: 'VBA' },
  QLD: { electrical: 'ESO QLD', plumbing: 'QBCC', painting: 'QBCC', roofing: 'QBCC' },
  WA: {
    electrical: 'EnergySafety',
    plumbing: 'PLC WA',
    painting: '',
    roofing: 'Building Services Board WA',
  },
  SA: { electrical: 'OTR SA', plumbing: 'OTR SA', painting: '', roofing: 'CBS SA' },
  TAS: { electrical: 'CBOS', plumbing: 'CBOS', painting: '', roofing: 'CBOS' },
  ACT: {
    electrical: 'ACT ESA',
    plumbing: 'Access Canberra',
    painting: '',
    roofing: 'Access Canberra',
  },
  NT: {
    electrical: 'NT Electrical Workers Licensing',
    plumbing: 'NT Plumbers and Drainers Licensing',
    painting: '',
    roofing: 'NT Building Practitioners Board',
  },
};

/** AU defaults for the painting rate card (web `DEFAULT_PAINTING_RATE_CARD`). Pre-fills the
 *  per-m² fields so a painter lands ready and can adjust rather than start from a blank sheet. */
export const PAINTING_DEFAULTS = {
  walls: 28,
  ceilings: 20,
  trim: 12,
  exterior: 45,
  callOutMinimum: 450,
  hourlyRate: 85,
} as const;

export type RoofingMaterial =
  | 'colorbond_corrugated'
  | 'colorbond_trimdek'
  | 'colorbond_spandek'
  | 'colorbond_kliplok'
  | 'concrete_tile'
  | 'terracotta_tile'
  | 'cement_sheet';

/** The 7 roofing $/m² materials (web `ROOFING_RATE_FIELDS` / `DEFAULT_ROOFING_RATE_CARD`).
 *  Cement sheet defaults to blank — its $0 default means "never auto-quoted", and 0 is not an
 *  accepted override, so only an omitted field can express it. */
export const ROOFING_RATE_FIELDS: readonly {
  key: RoofingMaterial;
  apiField: string;
  label: string;
  defaultRate: number;
}[] = [
  {
    key: 'colorbond_corrugated',
    apiField: 'roofing_corrugated_rate',
    label: 'Colorbond Corrugated',
    defaultRate: 90,
  },
  { key: 'colorbond_trimdek', apiField: 'roofing_trimdek_rate', label: 'Trimdek', defaultRate: 95 },
  {
    key: 'colorbond_spandek',
    apiField: 'roofing_spandek_rate',
    label: 'Spandek',
    defaultRate: 105,
  },
  {
    key: 'colorbond_kliplok',
    apiField: 'roofing_kliplok_rate',
    label: 'Klip-Lok 700',
    defaultRate: 115,
  },
  {
    key: 'concrete_tile',
    apiField: 'roofing_concrete_tile_rate',
    label: 'Concrete tile',
    defaultRate: 95,
  },
  {
    key: 'terracotta_tile',
    apiField: 'roofing_terracotta_tile_rate',
    label: 'Terracotta tile',
    defaultRate: 130,
  },
  {
    key: 'cement_sheet',
    apiField: 'roofing_cement_sheet_rate',
    label: 'Cement sheet',
    defaultRate: 0,
  },
];

export type RoofingRates = Record<RoofingMaterial, string>;

export const EMPTY_ROOFING_RATES: RoofingRates = ROOFING_RATE_FIELDS.reduce((acc, f) => {
  acc[f.key] = f.key === 'cement_sheet' ? '' : String(f.defaultRate);
  return acc;
}, {} as RoofingRates);

export type OptionalNumberBounds = {
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
};

export type OptionalNumberResult =
  | { kind: 'blank' }
  | { kind: 'invalid'; raw: string }
  | { kind: 'out_of_range'; value: number; bounds: OptionalNumberBounds }
  | { kind: 'value'; value: number };

/**
 * Parse one optional onboarding number without conflating four materially
 * different inputs: blank, invalid, out-of-range, and a valid value. In
 * particular, literal zero is a real value. Field-specific bounds decide
 * whether it is allowed; it is never silently converted to "not provided".
 */
export function parseOptionalNumber(
  raw: string,
  bounds: OptionalNumberBounds = {},
): OptionalNumberResult {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'blank' };

  // Accept the modest formatting the old parser supported, but require the
  // entire remaining string to be numeric. "TBC 100" must not become 100.
  const cleaned = trimmed.replace(/^\$\s*/, '').replace(/,/g, '');
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) {
    return { kind: 'invalid', raw: trimmed };
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return { kind: 'invalid', raw: trimmed };

  const belowMinimum =
    bounds.min !== undefined &&
    (bounds.exclusiveMin ? value <= bounds.min : value < bounds.min);
  const aboveMaximum = bounds.max !== undefined && value > bounds.max;
  if (belowMinimum || aboveMaximum) return { kind: 'out_of_range', value, bounds };
  return { kind: 'value', value };
}

export class OnboardNumericValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string[]>) {
    super('Onboarding numeric fields failed validation.');
    this.name = 'OnboardNumericValidationError';
  }
}

function rangeMessage(bounds: OptionalNumberBounds): string {
  if (bounds.min !== undefined && bounds.max !== undefined) {
    return bounds.exclusiveMin
      ? `Enter a number above ${bounds.min} and no more than ${bounds.max}.`
      : `Enter a number from ${bounds.min} to ${bounds.max}.`;
  }
  if (bounds.min !== undefined) {
    return bounds.exclusiveMin
      ? `Enter a number above ${bounds.min}.`
      : `Enter a number of ${bounds.min} or more.`;
  }
  return bounds.max !== undefined
    ? `Enter a number no more than ${bounds.max}.`
    : 'Enter a valid number.';
}

function numericValue(
  field: string,
  raw: string,
  bounds: OptionalNumberBounds,
  fieldErrors: Record<string, string[]>,
): number | undefined {
  const parsed = parseOptionalNumber(raw, bounds);
  if (parsed.kind === 'blank') return undefined;
  if (parsed.kind === 'invalid') {
    fieldErrors[field] = ['Enter a valid number.'];
    return undefined;
  }
  if (parsed.kind === 'out_of_range') {
    fieldErrors[field] = [rangeMessage(bounds)];
    return undefined;
  }
  return parsed.value;
}

export type OnboardForm = {
  businessName: string;
  firstName: string;
  email: string;
  password: string;
  trades: TradeSlug[];
  state: string;
  mobile: string;
  contactName: string;
  websiteUrl: string;
  businessAddress: string;
  abn: string;
  licenceType: string;
  licenceNumber: string;
  licenceExpiry: string;
  hourlyRate: string;
  callOutMin: string;
  markupPct: string;
  apprenticeRate: string;
  seniorRate: string;
  afterHoursMultiplier: string;
  minLabourHours: string;
  riskBufferPct: string;
  paintingPricingModel: 'sqm' | 'hourly';
  paintingWallsRate: string;
  paintingCeilingsRate: string;
  paintingTrimRate: string;
  paintingExteriorRate: string;
  paintingCallOutMin: string;
  paintingHourlyRate: string;
  roofing: RoofingRates;
  gstRegistered: boolean;
};

export const EMPTY_ONBOARD_FORM: OnboardForm = {
  businessName: '',
  firstName: '',
  email: '',
  password: '',
  trades: [],
  state: '',
  mobile: '',
  contactName: '',
  websiteUrl: '',
  businessAddress: '',
  abn: '',
  licenceType: '',
  licenceNumber: '',
  licenceExpiry: '',
  hourlyRate: '',
  callOutMin: '',
  markupPct: '',
  apprenticeRate: '',
  seniorRate: '',
  afterHoursMultiplier: '',
  minLabourHours: '',
  riskBufferPct: '',
  paintingPricingModel: 'sqm',
  paintingWallsRate: String(PAINTING_DEFAULTS.walls),
  paintingCeilingsRate: String(PAINTING_DEFAULTS.ceilings),
  paintingTrimRate: String(PAINTING_DEFAULTS.trim),
  paintingExteriorRate: String(PAINTING_DEFAULTS.exterior),
  paintingCallOutMin: String(PAINTING_DEFAULTS.callOutMinimum),
  paintingHourlyRate: String(PAINTING_DEFAULTS.hourlyRate),
  roofing: EMPTY_ROOFING_RATES,
  gstRegistered: true,
};

/**
 * The exact `OnboardActivateSchema` payload shape (spec B4). Blank optional
 * numbers are omitted; valid zero values survive; malformed or out-of-range
 * numbers fail locally with the same API field keys used by the server.
 * Ownership ids are deliberately absent — the server derives them from the
 * verified Clerk bearer.
 */
export function buildActivatePayload(
  form: OnboardForm,
  opts: { invitationCode: string; intentToken?: string },
) {
  const fieldErrors: Record<string, string[]> = {};
  const positive = { min: 0, exclusiveMin: true } as const;
  const pct = { min: 0, max: 100 } as const;
  const paintingRate = { min: 0, max: 200, exclusiveMin: true } as const;
  const roofingRate = { min: 0, max: 500, exclusiveMin: true } as const;
  const numeric = {
    hourly_rate: numericValue('hourly_rate', form.hourlyRate, positive, fieldErrors),
    call_out_minimum: numericValue('call_out_minimum', form.callOutMin, positive, fieldErrors),
    default_markup_pct: numericValue('default_markup_pct', form.markupPct, pct, fieldErrors),
    apprentice_rate: numericValue('apprentice_rate', form.apprenticeRate, { min: 0 }, fieldErrors),
    senior_rate: numericValue('senior_rate', form.seniorRate, { min: 0 }, fieldErrors),
    after_hours_multiplier: numericValue(
      'after_hours_multiplier',
      form.afterHoursMultiplier,
      { min: 1, max: 3 },
      fieldErrors,
    ),
    min_labour_hours: numericValue(
      'min_labour_hours',
      form.minLabourHours,
      { min: 0, max: 8 },
      fieldErrors,
    ),
    risk_buffer_pct: numericValue('risk_buffer_pct', form.riskBufferPct, pct, fieldErrors),
    painting_walls_rate: numericValue(
      'painting_walls_rate',
      form.paintingWallsRate,
      paintingRate,
      fieldErrors,
    ),
    painting_ceilings_rate: numericValue(
      'painting_ceilings_rate',
      form.paintingCeilingsRate,
      paintingRate,
      fieldErrors,
    ),
    painting_trim_rate: numericValue(
      'painting_trim_rate',
      form.paintingTrimRate,
      paintingRate,
      fieldErrors,
    ),
    painting_exterior_rate: numericValue(
      'painting_exterior_rate',
      form.paintingExteriorRate,
      paintingRate,
      fieldErrors,
    ),
    painting_call_out_minimum: numericValue(
      'painting_call_out_minimum',
      form.paintingCallOutMin,
      { min: 0, max: 5000 },
      fieldErrors,
    ),
    painting_hourly_rate: numericValue(
      'painting_hourly_rate',
      form.paintingHourlyRate,
      { min: 0, max: 2000, exclusiveMin: true },
      fieldErrors,
    ),
    roofing_corrugated_rate: numericValue(
      'roofing_corrugated_rate',
      form.roofing.colorbond_corrugated,
      roofingRate,
      fieldErrors,
    ),
    roofing_trimdek_rate: numericValue(
      'roofing_trimdek_rate',
      form.roofing.colorbond_trimdek,
      roofingRate,
      fieldErrors,
    ),
    roofing_spandek_rate: numericValue(
      'roofing_spandek_rate',
      form.roofing.colorbond_spandek,
      roofingRate,
      fieldErrors,
    ),
    roofing_kliplok_rate: numericValue(
      'roofing_kliplok_rate',
      form.roofing.colorbond_kliplok,
      roofingRate,
      fieldErrors,
    ),
    roofing_concrete_tile_rate: numericValue(
      'roofing_concrete_tile_rate',
      form.roofing.concrete_tile,
      roofingRate,
      fieldErrors,
    ),
    roofing_terracotta_tile_rate: numericValue(
      'roofing_terracotta_tile_rate',
      form.roofing.terracotta_tile,
      roofingRate,
      fieldErrors,
    ),
    roofing_cement_sheet_rate: numericValue(
      'roofing_cement_sheet_rate',
      form.roofing.cement_sheet,
      roofingRate,
      fieldErrors,
    ),
  };

  if (Object.keys(fieldErrors).length > 0) {
    throw new OnboardNumericValidationError(fieldErrors);
  }

  return {
    business_name: form.businessName.trim(),
    owner_first_name: form.firstName.trim(),
    owner_email: form.email.trim(),
    // A verified SMS intent is resolved again by the activation route. The
    // server-derived phone is deliberately not replaced by a client field.
    owner_mobile: opts.intentToken ? undefined : form.mobile.trim() || undefined,
    trades: form.trades,
    state: form.state || undefined,
    abn: form.abn.trim() || undefined,
    licence_type: form.licenceType.trim() || undefined,
    licence_number: form.licenceNumber.trim() || undefined,
    licence_expiry: form.licenceExpiry.trim() || undefined,
    contact_name: form.contactName.trim() || undefined,
    website_url: form.websiteUrl.trim() || undefined,
    business_address: form.businessAddress.trim() || undefined,
    hourly_rate: numeric.hourly_rate,
    call_out_minimum: numeric.call_out_minimum,
    default_markup_pct: numeric.default_markup_pct,
    apprentice_rate: numeric.apprentice_rate,
    senior_rate: numeric.senior_rate,
    after_hours_multiplier: numeric.after_hours_multiplier,
    min_labour_hours: numeric.min_labour_hours,
    risk_buffer_pct: numeric.risk_buffer_pct,
    painting_pricing_model: form.paintingPricingModel,
    painting_walls_rate: numeric.painting_walls_rate,
    painting_ceilings_rate: numeric.painting_ceilings_rate,
    painting_trim_rate: numeric.painting_trim_rate,
    painting_exterior_rate: numeric.painting_exterior_rate,
    painting_call_out_minimum: numeric.painting_call_out_minimum,
    painting_hourly_rate: numeric.painting_hourly_rate,
    roofing_corrugated_rate: numeric.roofing_corrugated_rate,
    roofing_trimdek_rate: numeric.roofing_trimdek_rate,
    roofing_spandek_rate: numeric.roofing_spandek_rate,
    roofing_kliplok_rate: numeric.roofing_kliplok_rate,
    roofing_concrete_tile_rate: numeric.roofing_concrete_tile_rate,
    roofing_terracotta_tile_rate: numeric.roofing_terracotta_tile_rate,
    roofing_cement_sheet_rate: numeric.roofing_cement_sheet_rate,
    gst_registered: form.gstRegistered,
    intent_token: opts.intentToken?.trim() || undefined,
    invitation_code: opts.invitationCode.trim(),
  };
}

/** Which wizard step (spec B1's gate excluded — 1 Account, 2 Trade & licence, 3 Pricing) owns
 *  each activation-schema field, for jumping to the earliest offending step on a 400 (web
 *  `stepForFields`, `lib/onboard/field-labels.ts`). Review (4) is never a jump target — nothing
 *  there is directly editable. */
const FIELD_UI: Record<string, { label: string; step: 1 | 2 | 3 }> = {
  business_name: { label: 'Business name', step: 1 },
  owner_first_name: { label: 'Your first name', step: 1 },
  owner_email: { label: 'Email', step: 1 },
  trades: { label: 'Trade', step: 2 },
  state: { label: 'State', step: 2 },
  abn: { label: 'ABN', step: 2 },
  owner_mobile: { label: 'Mobile', step: 2 },
  website_url: { label: 'Website', step: 2 },
  contact_name: { label: 'Contact name', step: 2 },
  business_address: { label: 'Business address', step: 2 },
  licence_type: { label: 'Licence body', step: 2 },
  licence_number: { label: 'Licence number', step: 2 },
  licence_expiry: { label: 'Licence expiry', step: 2 },
  hourly_rate: { label: 'Hourly rate', step: 3 },
  call_out_minimum: { label: 'Call-out minimum', step: 3 },
  default_markup_pct: { label: 'Default markup', step: 3 },
  apprentice_rate: { label: 'Apprentice rate', step: 3 },
  senior_rate: { label: 'Senior rate', step: 3 },
  after_hours_multiplier: { label: 'After-hours multiplier', step: 3 },
  min_labour_hours: { label: 'Minimum charge (hr)', step: 3 },
  risk_buffer_pct: { label: 'Risk buffer', step: 3 },
  painting_call_out_minimum: { label: 'Painting call-out minimum', step: 3 },
  painting_hourly_rate: { label: 'Painting hourly rate', step: 3 },
};
for (const f of ROOFING_RATE_FIELDS) FIELD_UI[f.apiField] = { label: f.label, step: 3 };

/** The local form-state key each activation field maps to, for inline `<Field error>` display. */
export const API_TO_LOCAL_KEY: Record<string, string> = {
  business_name: 'businessName',
  owner_first_name: 'firstName',
  owner_email: 'email',
  trades: 'trades',
  state: 'state',
  owner_mobile: 'mobile',
  abn: 'abn',
  website_url: 'websiteUrl',
  contact_name: 'contactName',
  business_address: 'businessAddress',
  licence_type: 'licenceType',
  licence_number: 'licenceNumber',
  licence_expiry: 'licenceExpiry',
  hourly_rate: 'hourlyRate',
  call_out_minimum: 'callOutMin',
  default_markup_pct: 'markupPct',
  apprentice_rate: 'apprenticeRate',
  senior_rate: 'seniorRate',
  after_hours_multiplier: 'afterHoursMultiplier',
  min_labour_hours: 'minLabourHours',
  risk_buffer_pct: 'riskBufferPct',
  painting_call_out_minimum: 'paintingCallOutMin',
  painting_hourly_rate: 'paintingHourlyRate',
  painting_walls_rate: 'paintingWallsRate',
  painting_ceilings_rate: 'paintingCeilingsRate',
  painting_trim_rate: 'paintingTrimRate',
  painting_exterior_rate: 'paintingExteriorRate',
};
for (const f of ROOFING_RATE_FIELDS) API_TO_LOCAL_KEY[f.apiField] = `roofing.${f.key}`;

/** Fallback label for an unmapped key: drop the `_rate`/`_pct` suffix, sentence-case. */
export function humaniseFieldKey(key: string): string {
  const words = key
    .replace(/_(rate|pct)$/, '')
    .replace(/_/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function fieldLabel(key: string): string {
  return FIELD_UI[key]?.label ?? humaniseFieldKey(key);
}

/** Earliest wizard step holding any of these rejected fields, or `null` when none are rendered. */
export function stepForFields(keys: string[]): 1 | 2 | 3 | null {
  const steps = keys.map(k => FIELD_UI[k]?.step).filter((s): s is 1 | 2 | 3 => !!s);
  return steps.length ? (Math.min(...steps) as 1 | 2 | 3) : null;
}

/** True when an activate/validate-code error is about the CODE, not the form (web
 *  `lib/onboard/invitation-codes.ts`: `code_not_found` | `code_revoked` | `code_paused` |
 *  `code_expired` | `quota_exhausted`) — these send the tradie back to the code pane. */
export function isCodeError(error: string | undefined | null): boolean {
  return !!error && (error.startsWith('code_') || error === 'quota_exhausted');
}

/** `+61412345678` → `+61 412 345 678`; anything else passes through unchanged. */
export function formatAuMobileDisplay(e164: string): string {
  const cleaned = e164.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+61') && cleaned.length === 12) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 12)}`;
  }
  return e164;
}
