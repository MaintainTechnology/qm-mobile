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

/**
 * "110.00" | "$ 110.00" → 110; blank, "0"/"0.00", or garbage like "TBC"/"n/a"/"$"/"-5" that
 * doesn't reduce to a positive number → undefined so the field is OMITTED from the activation
 * payload rather than sent as 0 (spec B4 — mirrors the web's `optionalNumber`). A blank,
 * unparseable, or zero numeric field must never become a free job or a $0 rate the pricing book
 * didn't set — and a stray minus is rejected outright rather than stripped, which would otherwise
 * silently flip a negative typo into a positive rate.
 */
export function optionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('-')) return undefined;
  const cleaned = trimmed.replace(/[^0-9.]/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return value === 0 ? undefined : value;
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

/** The exact `OnboardActivateSchema` payload shape (spec B4) — blanks omitted, never `0`. */
export function buildActivatePayload(
  form: OnboardForm,
  opts: { clerkUserId: string; invitationCode: string },
) {
  return {
    business_name: form.businessName.trim(),
    owner_first_name: form.firstName.trim(),
    owner_email: form.email.trim(),
    owner_mobile: form.mobile.trim() || undefined,
    clerk_user_id: opts.clerkUserId,
    trades: form.trades,
    state: form.state || undefined,
    abn: form.abn.trim() || undefined,
    licence_type: form.licenceType.trim() || undefined,
    licence_number: form.licenceNumber.trim() || undefined,
    licence_expiry: form.licenceExpiry.trim() || undefined,
    contact_name: form.contactName.trim() || undefined,
    website_url: form.websiteUrl.trim() || undefined,
    business_address: form.businessAddress.trim() || undefined,
    hourly_rate: optionalNumber(form.hourlyRate),
    call_out_minimum: optionalNumber(form.callOutMin),
    default_markup_pct: optionalNumber(form.markupPct),
    apprentice_rate: optionalNumber(form.apprenticeRate),
    senior_rate: optionalNumber(form.seniorRate),
    after_hours_multiplier: optionalNumber(form.afterHoursMultiplier),
    min_labour_hours: optionalNumber(form.minLabourHours),
    risk_buffer_pct: optionalNumber(form.riskBufferPct),
    painting_pricing_model: form.paintingPricingModel,
    painting_walls_rate: optionalNumber(form.paintingWallsRate),
    painting_ceilings_rate: optionalNumber(form.paintingCeilingsRate),
    painting_trim_rate: optionalNumber(form.paintingTrimRate),
    painting_exterior_rate: optionalNumber(form.paintingExteriorRate),
    painting_call_out_minimum: optionalNumber(form.paintingCallOutMin),
    painting_hourly_rate: optionalNumber(form.paintingHourlyRate),
    roofing_corrugated_rate: optionalNumber(form.roofing.colorbond_corrugated),
    roofing_trimdek_rate: optionalNumber(form.roofing.colorbond_trimdek),
    roofing_spandek_rate: optionalNumber(form.roofing.colorbond_spandek),
    roofing_kliplok_rate: optionalNumber(form.roofing.colorbond_kliplok),
    roofing_concrete_tile_rate: optionalNumber(form.roofing.concrete_tile),
    roofing_terracotta_tile_rate: optionalNumber(form.roofing.terracotta_tile),
    roofing_cement_sheet_rate: optionalNumber(form.roofing.cement_sheet),
    gst_registered: form.gstRegistered,
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
