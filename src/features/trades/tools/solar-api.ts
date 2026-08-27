/**
 * Solar tools data layer — the native twin of the web Solar tab's reads and
 * the Pylon hardware settings card.
 *
 * GET /api/tenant/solar (web app/api/tenant/solar/route.ts) returns the 50
 * newest estimates, already mapped server-side to the SolarEstimateViewModel
 * (lib/solar/dashboard-view.ts) — status derived, money in DOLLARS
 * (`netIncGst` inc GST, `stcRebateAud`). Nothing here computes a price; every
 * figure renders exactly as the route sent it, crossing the cents boundary
 * only for display.
 *
 * GET/PUT /api/tenant/pylon/settings (web app/api/tenant/pylon/settings/
 * route.ts): the tenant's nominated hardware SKUs. The route's "schema" is
 * parsePylonSkuSettings — each SKU a trimmed non-empty string, else null —
 * and on PUT every SKU is verified against Pylon's datasheet endpoint (422
 * with a tradie-facing sentence on a typo). Both verbs answer 404
 * `pylon_disabled` when the integration is off; the web hides the card then,
 * and so do we.
 */
import { z } from 'zod';

import { ApiError, apiErrorMessage } from '@/lib/api';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

export const SOLAR_KEY = ['tenant', 'solar'] as const;
export const PYLON_KEY = ['tenant', 'pylon'] as const;

// ── GET /api/tenant/solar ───────────────────────────────────────────────────

/** dashboard-view.ts SolarEstimateStatus, verbatim. */
export const SolarEstimateStatusSchema = z.enum([
  'awaiting_confirmation',
  'confirmed',
  'paid',
  'flagged',
]);
export type SolarEstimateStatus = z.infer<typeof SolarEstimateStatusSchema>;

/** The slice of SolarEstimateViewModel the mobile list renders. Loose so the
 *  richer web-only fields (buildings, STC zone detail…) pass through unread. */
export const SolarEstimateSchema = z.looseObject({
  token: z.string(),
  customerName: z.string().nullish(),
  address: z.string().nullish(),
  /** kW DC of the headline ('better') tier. */
  systemKw: z.number().nullish(),
  /** DOLLARS inc GST on the wire — display only, via the cents boundary. */
  netIncGst: z.number().nullish(),
  /** DOLLARS — the STC rebate already subtracted from netIncGst. */
  stcRebateAud: z.number().nullish(),
  stcCertificates: z.number().nullish(),
  status: SolarEstimateStatusSchema,
  guardrailFlags: z.array(z.string()).default([]),
  routing: z.string().nullish(),
  createdAt: z.string(),
  quoteVariant: z.enum(['instant', 'felt']).nullish(),
  feltStatus: z.string().nullish(),
  /** Absolute Felt editor URL (tradie-facing), felt rows only. */
  feltMapUrl: z.string().nullish(),
  /** Live Pylon pipeline stage of the pushed lead, when one exists. */
  pylonStage: z.string().nullish(),
});
export type SolarEstimate = z.infer<typeof SolarEstimateSchema>;

export const SolarListResponseSchema = z.looseObject({
  estimates: z.array(SolarEstimateSchema).default([]),
  /** The customer-facing entry-form link (/solar/<tenant-id>). */
  shareUrl: z.string().nullish(),
  feltEnabled: z.boolean().nullish(),
});

export function useSolarEstimates() {
  return useApiQuery(SOLAR_KEY, '/api/tenant/solar', SolarListResponseSchema);
}

// ── Pure display helpers (web SolarTab parity) ──────────────────────────────

/** Web STATUS_META labels, verbatim. */
export const SOLAR_STATUS_LABELS: Record<SolarEstimateStatus, string> = {
  awaiting_confirmation: 'Awaiting review',
  confirmed: 'Released',
  paid: 'Deposit paid',
  flagged: 'Needs review',
};

/** Web routing stat, verbatim branches. */
export function solarRoutingLabel(routing: string | null | undefined): string {
  if (routing === 'inspection_required') return 'Site visit';
  if (routing === 'auto_quote') return 'Auto';
  return 'Tradie review';
}

/** Wire DOLLARS → display, crossing the cents boundary exactly once. Never
 *  computes — a missing figure stays a dash, never a zero. */
export function solarMoneyLabel(dollars: number | null | undefined): string {
  return dollars != null && Number.isFinite(dollars)
    ? formatAud(centsFromApiDollars(dollars))
    : '—';
}

export function solarKwLabel(kw: number | null | undefined): string {
  return kw != null && Number.isFinite(kw) ? `${kw.toFixed(1)} kW` : '—';
}

/** Web STC stat: dollar rebate first, certificate count as the fallback. */
export function solarStcLabel(
  rebateAud: number | null | undefined,
  certificates: number | null | undefined,
): string {
  if (rebateAud != null && Number.isFinite(rebateAud)) return solarMoneyLabel(rebateAud);
  if (certificates != null && Number.isFinite(certificates)) return `${certificates} certs`;
  return '—';
}

/** Web FELT_CHIP copy, verbatim; null hides the chip (unknown/instant rows). */
const FELT_STATUS_LABELS: Record<string, string> = {
  ready: 'Map ready',
  partial: 'Map building…',
  provisioning: 'Map building…',
  pending: 'Map building…',
  failed: 'Map unavailable',
};

export function feltStatusLabel(status: string | null | undefined): string | null {
  return status ? (FELT_STATUS_LABELS[status] ?? null) : null;
}

const MONTHS_ABBREV = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Web fmtDate parity ('13 Jun 2026'); '' when unparseable. Hand-formatted —
 *  Intl month abbreviations vary with the runtime's ICU data (jest's Node
 *  renders 'June' where Hermes renders 'Jun'), and a date label must not. */
export function formatSolarDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_ABBREV[d.getMonth()] ?? ''} ${d.getFullYear()}`;
}

// ── Pylon hardware settings ─────────────────────────────────────────────────

export const PylonSkuSettingsSchema = z.looseObject({
  module_sku: z.string().nullish(),
  inverter_sku: z.string().nullish(),
  battery_sku: z.string().nullish(),
});
export type PylonSkuSettings = z.infer<typeof PylonSkuSettingsSchema>;

export const PylonSettingsResponseSchema = z.looseObject({
  settings: PylonSkuSettingsSchema,
});

/** PUT body — all three keys always sent so a cleared field actually clears
 *  (the route's parse treats a missing key and null identically, but sending
 *  the full set keeps the write self-describing). */
export type PylonSettingsBody = {
  module_sku: string | null;
  inverter_sku: string | null;
  battery_sku: string | null;
};

/** PURE — mirror of the route's parsePylonSkuSettings sku(): trim, and an
 *  empty/whitespace-only field is null ("none nominated"), never ''. */
export function parsePylonSku(input: string): string | null {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** PURE — the one client-side check before a save: Pylon SKUs are single
 *  tokens (the UUID segment of a datasheet URL), so embedded whitespace is
 *  always a paste error — catch it here rather than burning a round-trip on
 *  a two-bar connection. Empty input is valid (clears the nomination). */
export function pylonSkuInputError(input: string): string | null {
  const sku = parsePylonSku(input);
  if (sku === null) return null;
  return /\s/.test(sku) ? 'A SKU can’t contain spaces — copy just the UUID segment.' : null;
}

/** PURE — assemble the PUT body from the three raw inputs. */
export function buildPylonSettingsBody(
  moduleInput: string,
  inverterInput: string,
  batteryInput: string,
): PylonSettingsBody {
  return {
    module_sku: parsePylonSku(moduleInput),
    inverter_sku: parsePylonSku(inverterInput),
    battery_sku: parsePylonSku(batteryInput),
  };
}

/** Both pylon verbs 404 (`pylon_disabled`) when the integration is off —
 *  the web renders nothing then; mobile mirrors by hiding the card. */
export function isPylonDisabled(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** The PUT's 422 carries a complete tradie-facing sentence ("Panel SKU "x"
 *  was not found in Pylon…") in `error` — show it verbatim rather than
 *  letting the generic slug formatter mangle it. Everything else goes
 *  through the house mapper. */
export function pylonSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 422) {
    const body = (error.body ?? {}) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  }
  return apiErrorMessage(error);
}

export const PylonSaveResponseSchema = z.looseObject({
  /** Pin the literal so a 200-with-ok:false errors instead of reading as saved. */
  ok: z.literal(true),
  settings: PylonSkuSettingsSchema,
  /** Pylon-verified display name per saved SKU key (e.g. module_sku → name). */
  resolved: z.record(z.string(), z.string()).default({}),
});
export type PylonSaveResult = z.infer<typeof PylonSaveResponseSchema>;

export function usePylonSettings() {
  return useApiQuery(PYLON_KEY, '/api/tenant/pylon/settings', PylonSettingsResponseSchema);
}

/** PUT /api/tenant/pylon/settings — save the nominated SKUs. The server
 *  verifies each against Pylon's datasheet endpoint before writing. */
export function useSavePylonSettings() {
  return useApiMutation<PylonSettingsBody, PylonSaveResult>(
    '/api/tenant/pylon/settings',
    PylonSaveResponseSchema,
    { method: 'PUT', invalidates: [PYLON_KEY] },
  );
}
