/**
 * Electrical plan estimator data layer — the web Estimator (Beta) contracts
 * (app/api/tenant/estimator/*) at mobile scope:
 *
 * - POST  /api/tenant/estimator/extract       — multipart `pdf` (≤32 MB) + `sheet_hint`.
 *   One long Claude take-off call (~60–110 s; route maxDuration 300) that returns the
 *   finished items, so upload and extraction are a single request from here.
 * - GET   /api/tenant/estimator/extract/[id]  — one saved run (+ any persisted BOM).
 * - PATCH /api/tenant/estimator/extract/[id]  — { corrected_items }; the server clears
 *   the persisted BOM (it was computed from the old counts).
 * - GET   /api/tenant/estimator/history       — past electrical uploads, newest first.
 * - POST  /api/tenant/estimator/price         — { items, extractionId? }. Deterministic,
 *   no LLM: items with no catalogue match come back in `unmatched`, never guessed.
 *
 * BOM money is API dollars (lines ex-GST, total inc-GST) — rendered verbatim via
 * centsFromApiDollars + formatAud, never computed here.
 *
 * The active run id persists to AsyncStorage so an app kill mid-pipeline resumes
 * from the server's saved state instead of losing the run.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { appendFile, sizeOk, type PickedFile } from '@/lib/media';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

// ── Take-off shapes (web estimator/types.ts parity) ─────────────────────────

export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/** Per-symbol pin on the drawing (page + % coordinates). Mobile never renders
 *  pins, but they MUST ride through a mobile count edit — dropping them from
 *  the PATCH body would wipe the web plan overlay for this run. */
export const PinLocationSchema = z.looseObject({
  page: z.number(),
  x: z.number(),
  y: z.number(),
});
export type PinLocation = z.infer<typeof PinLocationSchema>;

export const TakeoffItemSchema = z.looseObject({
  type: z.string(),
  symbol: z.string().nullish(),
  count: z.number(),
  confidence: ConfidenceSchema.nullish(),
  note: z.string().nullish(),
  locations: z.array(PinLocationSchema).nullish(),
});
export type TakeoffItem = z.infer<typeof TakeoffItemSchema>;

// ── Extract kick-off (POST /extract) ────────────────────────────────────────

export const ExtractResponseSchema = z.looseObject({
  ok: z.literal(true),
  extractionId: z.string(),
  planUploadId: z.string(),
  filename: z.string(),
  items: z.array(TakeoffItemSchema),
  sheetsUsed: z.array(z.string()).nullish(),
  overallNote: z.string().nullish(),
  model: z.string().nullish(),
  runtimeSeconds: z.number().nullish(),
});
export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;

// ── Priced BOM (POST /price) ────────────────────────────────────────────────

export const PricedLineSchema = z.looseObject({
  type: z.string(),
  count: z.number(),
  matched: z.string(),
  unitPriceExGst: z.number(),
  materialExGst: z.number(),
  labourHours: z.number(),
  labourExGst: z.number(),
  lineExGst: z.number(),
});
export type PricedLine = z.infer<typeof PricedLineSchema>;

/** Items the deterministic matcher could not find in the tenant's catalogue —
 *  returned unpriced by design, never guessed. */
export const UnmatchedItemSchema = z.looseObject({ type: z.string(), count: z.number() });
export type UnmatchedItem = z.infer<typeof UnmatchedItemSchema>;

export const PricedBomSchema = z.looseObject({
  lines: z.array(PricedLineSchema),
  unmatched: z.array(UnmatchedItemSchema),
  materialExGst: z.number(),
  labourExGst: z.number(),
  labourFloorAddedExGst: z.number(),
  subtotalExGst: z.number(),
  gstExGst: z.number(),
  totalIncGst: z.number(),
  gstRegistered: z.boolean(),
  assumptions: z.looseObject({
    hourlyRate: z.number(),
    markupPct: z.number(),
    minLabourHours: z.number(),
  }),
});
export type PricedBom = z.infer<typeof PricedBomSchema>;

export type PriceRequestItem = {
  type: string;
  count: number;
  confidence?: Confidence;
  note?: string;
};
export type PriceRequest = { items: PriceRequestItem[]; extractionId?: string };

export const PriceResponseSchema = z.looseObject({
  ok: z.literal(true),
  bom: PricedBomSchema,
  catalogueSize: z.number(),
  pricingBookSource: z.string(),
  persisted: z.boolean().nullish(),
});
export type PriceResponse = z.infer<typeof PriceResponseSchema>;

// ── One saved run (GET /extract/[id]) ───────────────────────────────────────

export const RunDetailSchema = z.looseObject({
  id: z.string(),
  items: z.array(TakeoffItemSchema).nullish(),
  corrected_items: z.array(TakeoffItemSchema).nullish(),
  sheets_used: z.array(z.string()).nullish(),
  overall_note: z.string().nullish(),
  model: z.string().nullish(),
  runtime_seconds: z.number().nullish(),
  priced_bom: PricedBomSchema.nullish(),
  priced_at: z.string().nullish(),
  created_at: z.string(),
  plan_uploads: z
    .looseObject({
      filename: z.string(),
      sheet_hint: z.string().nullish(),
      created_at: z.string(),
    })
    .nullish(),
});
export type RunDetail = z.infer<typeof RunDetailSchema>;

export const RunResponseSchema = z.looseObject({ ok: z.literal(true), run: RunDetailSchema });

// ── History (GET /history) ──────────────────────────────────────────────────

export const HistoryExtractionSchema = z.looseObject({
  id: z.string(),
  items: z.array(TakeoffItemSchema).nullish(),
  corrected_items: z.array(TakeoffItemSchema).nullish(),
  created_at: z.string(),
  priced_at: z.string().nullish(),
  /** Supabase `priced_bom->totalIncGst` — inc-GST dollars, null while unpriced. */
  priced_total: z.number().nullish(),
});
export type HistoryExtraction = z.infer<typeof HistoryExtractionSchema>;

export const HistoryUploadSchema = z.looseObject({
  id: z.string(),
  filename: z.string(),
  sheet_hint: z.string().nullish(),
  created_at: z.string(),
  plan_extractions: z.array(HistoryExtractionSchema).default([]),
});
export type HistoryUpload = z.infer<typeof HistoryUploadSchema>;

export const HistoryResponseSchema = z.looseObject({
  ok: z.literal(true),
  uploads: z.array(HistoryUploadSchema).default([]),
});

// ── PATCH /extract/[id] (corrected counts) ──────────────────────────────────

export const SaveCountsResponseSchema = z.looseObject({
  ok: z.literal(true),
  savedCount: z.number(),
});
export type SaveCountsResponse = z.infer<typeof SaveCountsResponseSchema>;

/** The PATCH body's item shape — audit fields ride along so the web plan
 *  overlay and pricing trace survive a mobile save. */
export type CorrectedItem = {
  type: string;
  symbol: string;
  count: number;
  confidence?: Confidence;
  note?: string;
  locations?: PinLocation[];
};

// ── Hooks ───────────────────────────────────────────────────────────────────

/** The extract POST is one long Claude call — matches the route's maxDuration
 *  so a slow success is not aborted client-side and double-fired on retry. */
const EXTRACT_TIMEOUT_MS = 300000;
/** Resume/reopen poll cadence while a run is still loading. */
const RUN_POLL_MS = 5000;

export const ESTIMATOR_KEY = ['tenant', 'estimator'] as const;
export const HISTORY_KEY = ['tenant', 'estimator', 'history'] as const;

export function useExtractPlan() {
  return useApiMutation<FormData, ExtractResponse>(
    '/api/tenant/estimator/extract',
    ExtractResponseSchema,
    { timeoutMs: EXTRACT_TIMEOUT_MS, invalidates: [HISTORY_KEY] },
  );
}

/** The extract route's multipart shape: `pdf` file + `sheet_hint` text. */
export function buildExtractForm(file: PickedFile, sheetHint: string): FormData {
  const form = new FormData();
  appendFile(form, 'pdf', file);
  form.append('sheet_hint', sheetHint.trim());
  return form;
}

export function useEstimatorRun(id: string | null) {
  return useApiQuery(
    ['tenant', 'estimator', 'extract', id ?? ''],
    `/api/tenant/estimator/extract/${id ?? ''}`,
    RunResponseSchema,
    {
      enabled: id !== null,
      // Poll while the run hasn't loaded yet; stop once it lands or fails —
      // the screen's retry notice takes over from there.
      refetchInterval: q => (q.state.data || q.state.error ? false : RUN_POLL_MS),
    },
  );
}

export function useEstimatorHistory() {
  return useApiQuery(HISTORY_KEY, '/api/tenant/estimator/history', HistoryResponseSchema);
}

export function usePriceTakeoff() {
  // Pricing persists the BOM onto the run — refresh the run + history caches.
  return useApiMutation<PriceRequest, PriceResponse>(
    '/api/tenant/estimator/price',
    PriceResponseSchema,
    { invalidates: [ESTIMATOR_KEY] },
  );
}

export function useSaveCounts(id: string | null) {
  // Saving clears the persisted BOM server-side — refresh every estimator cache.
  return useApiMutation<{ corrected_items: CorrectedItem[] }, SaveCountsResponse>(
    `/api/tenant/estimator/extract/${id ?? ''}`,
    SaveCountsResponseSchema,
    { method: 'PATCH', invalidates: [ESTIMATOR_KEY] },
  );
}

// ── Editable counts (pure — the web itemsToRows/rowsToItems at mobile scope) ─

/** A take-off line as the editor holds it — count stays a string while typing. */
export type EditableCount = {
  type: string;
  symbol: string;
  count: string;
  confidence: Confidence | null;
  note?: string;
  locations?: PinLocation[];
};

export function itemsToRows(items: readonly TakeoffItem[]): EditableCount[] {
  return items.map(i => ({
    type: i.type,
    symbol: i.symbol ?? '',
    count: String(i.count),
    confidence: i.confidence ?? null,
    ...(i.note != null && i.note !== '' ? { note: i.note } : {}),
    ...(i.locations && i.locations.length > 0 ? { locations: i.locations } : {}),
  }));
}

/** Editor rows → PATCH items. Blank types are dropped and unreadable counts
 *  coerce to 0 (web rowsToItems parity); the pin locations ride along. */
export function rowsToItems(rows: readonly EditableCount[]): CorrectedItem[] {
  return rows
    .filter(r => r.type.trim() !== '')
    .map(r => ({
      type: r.type.trim(),
      symbol: r.symbol,
      count: Number(r.count) || 0,
      ...(r.confidence ? { confidence: r.confidence } : {}),
      ...(r.note != null && r.note.trim() !== '' ? { note: r.note } : {}),
      ...(r.locations && r.locations.length > 0 ? { locations: r.locations } : {}),
    }));
}

/** Price-route items: count provenance only — type/count/confidence/note
 *  (web parity: pins stay client-side on the price call). */
export function rowsToPriceItems(rows: readonly EditableCount[]): PriceRequestItem[] {
  return rowsToItems(rows).map(i => ({
    type: i.type,
    count: i.count,
    ...(i.confidence ? { confidence: i.confidence } : {}),
    ...(i.note ? { note: i.note } : {}),
  }));
}

/** The take-off a run currently stands at — the tradie's saved corrections win. */
export function effectiveItems(run: {
  items?: TakeoffItem[] | null;
  corrected_items?: TakeoffItem[] | null;
}): TakeoffItem[] {
  return run.corrected_items ?? run.items ?? [];
}

/** Devices = summed symbol counts. A tally, never a price. */
export function deviceTotal(items: readonly { count: number }[]): number {
  return items.reduce((sum, i) => sum + i.count, 0);
}

// ── Client-side guards ──────────────────────────────────────────────────────

/** Mirrors the extract route's MAX_PDF_BYTES so an oversize plan fails before
 *  spending minutes of signal on a doomed upload. The server still enforces. */
export const MAX_PDF_BYTES = 32 * 1024 * 1024;

export function planPdfProblem(file: PickedFile): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'That file isn’t a PDF — export the plan sheet as a PDF and try again.';
  if (!sizeOk(file, MAX_PDF_BYTES)) {
    const mb = ((file.size ?? 0) / 1e6).toFixed(1);
    return `That PDF is ${mb} MB — the limit is 32 MB. Export just the electrical sheets and try again.`;
  }
  return null;
}

/** Counts are whole non-negative tallies (the PATCH route clamps the same way). */
export function countProblem(value: string): string | null {
  return /^\d+$/.test(value.trim()) ? null : 'Counts must be whole numbers — 0 or more.';
}

// ── Pipeline state machine (pure) ───────────────────────────────────────────
//
// idle → picking → uploading → review (the extract POST returns the finished
// take-off, so upload and extraction are one hop) → pricing → priced.
// `extracting` is the resume path: a persisted id or a history row loads the
// saved run from the server. Failures record where they happened so a retry
// re-enters the same stage. Total: unknown transitions are no-ops.
//
// ponytail: an app kill DURING the extract POST has no id to resume from (the
// server only returns one once the take-off finishes) — that run still lands
// in history, which is the recovery path for that window.

export type PipelineFailurePoint = 'uploading' | 'extracting' | 'pricing';

export type PipelineState =
  | { stage: 'idle' }
  | { stage: 'picking' }
  | { stage: 'uploading' }
  | { stage: 'extracting'; id: string }
  | { stage: 'review'; id: string }
  | { stage: 'pricing'; id: string }
  | { stage: 'priced'; id: string }
  | { stage: 'failed'; at: PipelineFailurePoint; id: string | null };

export type PipelineEvent =
  | { type: 'pick' }
  | { type: 'picked' }
  | { type: 'upload' }
  | { type: 'extracted'; id: string }
  | { type: 'resume'; id: string }
  | { type: 'loaded'; priced: boolean }
  | { type: 'price' }
  | { type: 'priced' }
  | { type: 'edit' }
  | { type: 'fail' }
  | { type: 'dismiss' };

export const PIPELINE_IDLE: PipelineState = { stage: 'idle' };

export function pipelineReduce(state: PipelineState, event: PipelineEvent): PipelineState {
  switch (event.type) {
    case 'pick':
      return state.stage === 'idle' || state.stage === 'picking' || state.stage === 'failed'
        ? { stage: 'picking' }
        : state;
    case 'picked':
      return state.stage === 'picking' ? { stage: 'idle' } : state;
    case 'upload':
      return state.stage === 'idle' || state.stage === 'picking' || state.stage === 'failed'
        ? { stage: 'uploading' }
        : state;
    case 'extracted':
      // The POST returned the finished take-off — straight to review.
      return state.stage === 'uploading' ? { stage: 'review', id: event.id } : state;
    case 'resume':
      // A persisted id (app relaunch) or a history row — fetch the saved run.
      return { stage: 'extracting', id: event.id };
    case 'loaded':
      return state.stage === 'extracting'
        ? { stage: event.priced ? 'priced' : 'review', id: state.id }
        : state;
    case 'price': {
      if (state.stage === 'review' || state.stage === 'priced') {
        return { stage: 'pricing', id: state.id };
      }
      if (state.stage === 'failed' && state.at === 'pricing' && state.id !== null) {
        return { stage: 'pricing', id: state.id };
      }
      return state;
    }
    case 'priced':
      return state.stage === 'pricing' ? { stage: 'priced', id: state.id } : state;
    case 'edit':
      // Edits invalidate the price until re-priced (web parity).
      return state.stage === 'priced' ? { stage: 'review', id: state.id } : state;
    case 'fail':
      if (state.stage === 'uploading') return { stage: 'failed', at: 'uploading', id: null };
      if (state.stage === 'extracting') return { stage: 'failed', at: 'extracting', id: state.id };
      if (state.stage === 'pricing') return { stage: 'failed', at: 'pricing', id: state.id };
      return state;
    case 'dismiss':
      return PIPELINE_IDLE;
  }
}

/** The run id the pipeline currently holds, if any. */
export function pipelineRunId(state: PipelineState): string | null {
  return 'id' in state ? state.id : null;
}

// ── In-flight run persistence (survives an app kill mid-pipeline) ───────────

const EXTRACT_ID_KEY = 'quotemax.estimator.extract-id';

/** All three are best-effort: storage trouble must never block the pipeline. */
export async function persistExtractId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(EXTRACT_ID_KEY, id);
  } catch {
    // best-effort
  }
}

export async function readExtractId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(EXTRACT_ID_KEY);
  } catch {
    return null;
  }
}

export async function clearExtractId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EXTRACT_ID_KEY);
  } catch {
    // best-effort
  }
}
