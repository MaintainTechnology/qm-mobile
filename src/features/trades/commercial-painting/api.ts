/**
 * Commercial painting estimator data layer — the web CommercialPaintingTab's
 * pipeline at mobile scope:
 *
 *   sign (POST /upload/sign) → PUT each file straight to the signed storage
 *   URL (Vercel 413s function bodies over ~4.5 MB, so files never ride the
 *   API) → complete (classify + register) → extract (Opus takeoff, minutes)
 *   → price (deterministic, server-side) → save-quote.
 *
 * Every response is zod-parsed; every dollar figure is rendered verbatim via
 * centsFromApiDollars + formatAud at the screen — nothing here computes,
 * sums, or derives a price.
 *
 * The PURE section at the bottom is the upload/extract state machine plus the
 * AsyncStorage run-id persistence that lets a killed app resume the run from
 * server state (paint_runs is the source of truth at every step).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { z } from 'zod';

import type { PickedFile } from '@/lib/media';
import { TENANT_ME_KEY } from '@/lib/tenant';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

const BASE = '/api/tenant/commercial-painting';

/** Mirrors the sign route's MAX_FILE_BYTES (32 MB) — fail before spending signal. */
export const MAX_DOC_BYTES = 32 * 1024 * 1024;
/** Mirrors the sign route's ACCEPTED_MIME. */
export const ACCEPTED_DOC_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

/** Server PAINT_DOC_TYPES — the PATCH route rejects anything else. */
export const DOC_TYPES = [
  'plan_set',
  'measurement_takeoff',
  'services_layout',
  'site_photo',
  'other',
] as const;
export type PaintDocType = (typeof DOC_TYPES)[number];

// Client budgets mirror each route's maxDuration — an abort before the server
// gives up would retry a call that was about to succeed (jobquote precedent).
const SIGN_TIMEOUT_MS = 60000;
/** Classification is a Sonnet call per file on top of storage downloads. */
const COMPLETE_TIMEOUT_MS = 120000;
/** Opus over a full drawing set runs minutes (route maxDuration = 300). */
const EXTRACT_TIMEOUT_MS = 300000;
const PRICE_TIMEOUT_MS = 60000;
const PREVIEW_TIMEOUT_MS = 120000;
const SAVE_TIMEOUT_MS = 90000;
/** Poll cadence while the server owns the run (status 'extracting'). */
const EXTRACT_POLL_MS = 6000;

// ── Schemas ─────────────────────────────────────────────────────────────────
// Loose on purpose: unknown fields pass through, so items PATCHed back to the
// server (and prices rendered) stay byte-for-byte what the API returned.

export const TakeoffItemSchema = z.looseObject({
  surface: z.string(),
  room: z.string().nullish(),
  substrate: z.string().nullish(),
  system: z.string().nullish(),
  unit: z.string().nullish(),
  quantity: z.number(),
  coats: z.number().nullish(),
  height_m: z.number().nullish(),
  confidence: z.string().nullish(),
  source: z.string().nullish(),
  delta_pct: z.number().nullish(),
  separate_price: z.boolean().nullish(),
  excluded: z.boolean().nullish(),
  note: z.string().nullish(),
});
export type TakeoffItem = z.infer<typeof TakeoffItemSchema>;

const ReconcileFlagSchema = z.looseObject({
  kind: z.string(),
  surface: z.string().nullish(),
  room: z.string().nullish(),
  detail: z.string().nullish(),
});
export type ReconcileFlag = z.infer<typeof ReconcileFlagSchema>;

// All money fields below are DOLLARS ex GST on the wire — display-converted
// with centsFromApiDollars + formatAud, never touched by arithmetic here.
const PricedLineSchema = z.looseObject({
  surface: z.string(),
  room: z.string().nullish(),
  system: z.string().nullish(),
  unit: z.string().nullish(),
  quantity: z.number(),
  coats: z.number().nullish(),
  height_m: z.number().nullish(),
  labourHours: z.number().nullish(),
  labourExGst: z.number(),
  product: z.string().nullish(),
  litres: z.number().nullish(),
  materialExGst: z.number(),
  lineExGst: z.number(),
});
export type PricedLine = z.infer<typeof PricedLineSchema>;

const PricedBomSchema = z.looseObject({
  lines: z.array(PricedLineSchema).default([]),
  unmatched: z
    .array(
      z.looseObject({
        surface: z.string(),
        room: z.string().nullish(),
        system: z.string().nullish(),
        quantity: z.number().nullish(),
      }),
    )
    .default([]),
  excluded: z
    .array(
      z.looseObject({
        surface: z.string(),
        room: z.string().nullish(),
        quantity: z.number().nullish(),
        unit: z.string().nullish(),
      }),
    )
    .default([]),
  labour: z.looseObject({
    hours: z.number(),
    ratePerHr: z.number(),
    crewSize: z.number().nullish(),
    estimatedDays: z.number().nullish(),
    costExGst: z.number(),
  }),
  materials: z
    .array(
      z.looseObject({
        product: z.string(),
        litres: z.number().nullish(),
        pricePerL: z.number().nullish(),
        costExGst: z.number(),
      }),
    )
    .default([]),
  materialsExGst: z.number(),
  equipment: z
    .array(
      z.looseObject({
        label: z.string(),
        days: z.number().nullish(),
        dayRate: z.number().nullish(),
        costExGst: z.number(),
        reason: z.string().nullish(),
      }),
    )
    .default([]),
  equipmentExGst: z.number(),
  separate: z
    .looseObject({ lines: z.array(PricedLineSchema).default([]), exGst: z.number() })
    .nullish(),
  subtotalExGst: z.number(),
  gst: z.number(),
  totalIncGst: z.number(),
  gstRegistered: z.boolean().nullish(),
  assumptions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
});
export type PricedBom = z.infer<typeof PricedBomSchema>;

const SignedTargetSchema = z.looseObject({
  uploadId: z.string(),
  filename: z.string(),
  signedUrl: z.string(),
});
export type SignedTarget = z.infer<typeof SignedTargetSchema>;

const SignSchema = z.looseObject({
  ok: z.literal(true),
  paintRunId: z.string(),
  uploads: z.array(SignedTargetSchema),
});
export type SignResult = z.infer<typeof SignSchema>;

const CompleteSchema = z.looseObject({
  ok: z.literal(true),
  paintRunId: z.string(),
  uploads: z.array(
    z.looseObject({
      id: z.string(),
      filename: z.string(),
      doc_type: z.string(),
      size_bytes: z.number().nullish(),
    }),
  ),
});

const DocPatchSchema = z.looseObject({ ok: z.literal(true), id: z.string(), doc_type: z.string() });
const OkSchema = z.looseObject({ ok: z.literal(true) });

/** The extract response also carries the items — but the run GET is the
 *  resume source of truth, so only the id is contract here. */
const ExtractSchema = z.looseObject({ ok: z.literal(true), extractionId: z.string() });

const PriceSchema = z.looseObject({
  ok: z.literal(true),
  bom: PricedBomSchema,
  usesSeedDefaults: z.boolean().nullish(),
});

const PreviewSchema = z.looseObject({
  ok: z.literal(true),
  before: z.string().nullish(),
  after: z.string(),
});

const SaveQuoteSchema = z.looseObject({
  ok: z.literal(true),
  quoteId: z.string(),
  shareToken: z.string(),
  quoteViewUrl: z.string(),
  pdfUrl: z.string().nullish(),
  alreadySaved: z.boolean().nullish(),
  delivery: z
    .looseObject({
      attempted: z.boolean(),
      sent: z.boolean().nullish(),
      mms: z.boolean().nullish(),
      reason: z.string().nullish(),
    })
    .nullish(),
});
export type SavedQuote = z.infer<typeof SaveQuoteSchema>;

const RunSchema = z.looseObject({
  id: z.string(),
  job_name: z.string().nullish(),
  site_address: z.string().nullish(),
  status: z.string(),
  status_note: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});

const UploadRowSchema = z.looseObject({
  id: z.string(),
  filename: z.string(),
  doc_type: z.string().nullish(),
  size_bytes: z.number().nullish(),
});
export type UploadRow = z.infer<typeof UploadRowSchema>;

const SheetsUsedSchema = z.looseObject({
  flags: z.array(ReconcileFlagSchema).nullish(),
  measurement_line_count: z.number().nullish(),
  measurement_parse_failed: z.boolean().nullish(),
});

const ExtractionRowSchema = z.looseObject({
  id: z.string(),
  items: z.array(TakeoffItemSchema).nullish(),
  corrected_items: z.array(TakeoffItemSchema).nullish(),
  sheets_used: SheetsUsedSchema.nullish(),
  overall_note: z.string().nullish(),
  model: z.string().nullish(),
  runtime_seconds: z.number().nullish(),
  priced_bom: PricedBomSchema.nullish(),
  priced_at: z.string().nullish(),
});

const RunDetailSchema = z.looseObject({
  ok: z.literal(true),
  run: RunSchema,
  uploads: z.array(UploadRowSchema).default([]),
  extraction: ExtractionRowSchema.nullish(),
});
export type RunDetail = z.infer<typeof RunDetailSchema>;

const RunListItemSchema = z.looseObject({
  id: z.string(),
  job_name: z.string().nullish(),
  site_address: z.string().nullish(),
  status: z.string(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  public_token: z.string().nullish(),
});
export type RunListItem = z.infer<typeof RunListItemSchema>;

const RunsSchema = z.looseObject({
  ok: z.literal(true),
  runs: z.array(RunListItemSchema).default([]),
});

// ── Request bodies ──────────────────────────────────────────────────────────

export type SignBody = {
  files: { name: string; size: number; type: string }[];
  job_name?: string;
  site_address?: string;
  /** Append to an existing draft run (retry / add-documents path). */
  paint_run_id?: string;
};

export type CompleteBody = {
  paintRunId: string;
  files: { uploadId: string; name: string; size: number; type: string }[];
};

// ── Hooks ───────────────────────────────────────────────────────────────────

export const RUNS_KEY = ['tenant', 'cpaint', 'runs'] as const;

/** One place for the run-detail key — the screen invalidates it after every
 *  step that changes server state. */
export function runKey(id: string): readonly unknown[] {
  return ['tenant', 'cpaint', 'run', id];
}

export function useSignUploads() {
  return useApiMutation<SignBody, SignResult>(`${BASE}/upload/sign`, SignSchema, {
    timeoutMs: SIGN_TIMEOUT_MS,
  });
}

export function useCompleteUploads() {
  return useApiMutation<CompleteBody, z.infer<typeof CompleteSchema>>(
    `${BASE}/upload/complete`,
    CompleteSchema,
    { timeoutMs: COMPLETE_TIMEOUT_MS },
  );
}

/** Correct a document's auto-classification. The server reads only doc_type;
 *  the id rides in the body solely to address the path. */
export function useSetDocType() {
  return useApiMutation<{ id: string; doc_type: PaintDocType }, z.infer<typeof DocPatchSchema>>(
    body => `${BASE}/upload/${body.id}`,
    DocPatchSchema,
    { method: 'PATCH' },
  );
}

/** Remove a document. 409 'has_extraction' means it anchors the takeoff —
 *  apiErrorMessage surfaces the server's own explanation. */
export function useRemoveUpload() {
  return useApiMutation<{ id: string }, z.infer<typeof OkSchema>>(
    body => `${BASE}/upload/${body.id}`,
    OkSchema,
    { method: 'DELETE' },
  );
}

export function useExtract() {
  return useApiMutation<{ paintRunId: string }, z.infer<typeof ExtractSchema>>(
    `${BASE}/extract`,
    ExtractSchema,
    { timeoutMs: EXTRACT_TIMEOUT_MS },
  );
}

export function usePrice() {
  return useApiMutation<
    { paintRunId: string; extractionId: string; labourRatePerHr?: number },
    z.infer<typeof PriceSchema>
  >(`${BASE}/price`, PriceSchema, { timeoutMs: PRICE_TIMEOUT_MS });
}

/** AI "after repaint" render from the run's site photo. Data-URL strings in
 *  the response; failure is non-blocking — the quote stands without it. */
export function usePreview() {
  return useApiMutation<
    { paintRunId: string; colour?: string },
    z.infer<typeof PreviewSchema>
  >(`${BASE}/preview`, PreviewSchema, { timeoutMs: PREVIEW_TIMEOUT_MS });
}

/** Saving invalidates the tenant snapshot so the new quote appears in the hub
 *  queue, and the runs rail so the run shows 'priced'. */
export function useSaveQuote() {
  return useApiMutation<
    { paintRunId: string; extractionId: string; customerPhone?: string; customerName?: string },
    SavedQuote
  >(`${BASE}/save-quote`, SaveQuoteSchema, {
    timeoutMs: SAVE_TIMEOUT_MS,
    invalidates: [TENANT_ME_KEY, RUNS_KEY],
  });
}

/** Full run detail — the resume/refresh source of truth. Polls every 6 s
 *  while the server reports 'extracting', so a takeoff finishes into the UI
 *  even after an app kill or dropped connection. */
export function useRun(runId: string | null) {
  return useApiQuery(
    runKey(runId ?? ''),
    `${BASE}/run/${runId ?? ''}`,
    RunDetailSchema,
    {
      enabled: runId != null,
      refetchInterval: query =>
        query.state.data?.run.status === 'extracting' ? EXTRACT_POLL_MS : false,
    },
  );
}

export function useRuns() {
  return useApiQuery(RUNS_KEY, `${BASE}/runs`, RunsSchema);
}

/**
 * PUT one file straight to its signed Supabase Storage URL. NOT apiRequest:
 * the URL is absolute and pre-authorised — no Bearer, no JSON. x-upsert makes
 * a retry after a mid-pipeline failure overwrite rather than 409.
 */
export async function putSignedFile(signedUrl: string, file: PickedFile): Promise<void> {
  const result = await FileSystem.uploadAsync(signedUrl, file.uri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': file.type, 'x-upsert': 'true' },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Uploading ${file.name} failed (HTTP ${result.status}). Try again.`);
  }
}

// ── PURE: payload builders ──────────────────────────────────────────────────

export function buildSignBody(
  files: readonly PickedFile[],
  opts: { jobName?: string; siteAddress?: string; runId?: string | null } = {},
): SignBody {
  const jobName = opts.jobName?.trim();
  const siteAddress = opts.siteAddress?.trim();
  return {
    files: files.map(f => ({ name: f.name, size: f.size ?? 0, type: f.type })),
    ...(jobName ? { job_name: jobName } : {}),
    ...(siteAddress ? { site_address: siteAddress } : {}),
    ...(opts.runId ? { paint_run_id: opts.runId } : {}),
  };
}

/** Pair each picked file with its signed slot by index (the sign route
 *  preserves request order). Throws on any mismatch rather than uploading a
 *  file to the wrong slot. */
export function zipUploads(
  files: readonly PickedFile[],
  targets: readonly SignedTarget[],
): { file: PickedFile; target: SignedTarget }[] {
  if (targets.length !== files.length) {
    throw new Error('QuoteMax returned a different number of upload slots than files sent.');
  }
  return files.map((file, i) => {
    const target = targets[i];
    if (!target) throw new Error('QuoteMax returned an empty upload slot.');
    return { file, target };
  });
}

export function buildCompleteBody(
  paintRunId: string,
  pairs: readonly { file: PickedFile; target: SignedTarget }[],
): CompleteBody {
  return {
    paintRunId,
    files: pairs.map(({ file, target }) => ({
      uploadId: target.uploadId,
      name: file.name,
      size: file.size ?? 0,
      type: file.type,
    })),
  };
}

// ── PURE: pipeline state machine ────────────────────────────────────────────
// idle → signing → uploading(fileIdx) → completing → classified →
// extracting(runId) → review → priced → saved | failed(stage, resumable).
// Server run status re-syncs the machine via RESUME (resume-from-runId), so a
// killed app lands back on the true step.

export type PipelineStep =
  | 'idle'
  | 'signing'
  | 'uploading'
  | 'completing'
  | 'classified'
  | 'extracting'
  | 'review'
  | 'priced'
  | 'saved'
  | 'failed';

export type FailedStage = 'sign' | 'upload' | 'complete' | 'extract';

export type PipelineState = {
  step: PipelineStep;
  runId: string | null;
  /** 0-based index of the file currently PUT-ing while step === 'uploading'. */
  fileIdx: number;
  fileCount: number;
  failedStage: FailedStage | null;
  /** The run survives the failure server-side — a retry appends to it. */
  resumable: boolean;
};

export const initialPipeline: PipelineState = {
  step: 'idle',
  runId: null,
  fileIdx: 0,
  fileCount: 0,
  failedStage: null,
  resumable: false,
};

export type PipelineEvent =
  | { type: 'SIGN_START'; fileCount: number }
  | { type: 'SIGNED'; runId: string }
  | { type: 'FILE_PUT_OK' }
  | { type: 'COMPLETED' }
  | { type: 'EXTRACT_START'; runId: string }
  | { type: 'EXTRACTED' }
  | { type: 'PRICED' }
  | { type: 'SAVED' }
  | { type: 'FAILED' }
  | { type: 'RESUME'; runId: string; status: string }
  | { type: 'RESET' };

/** Steps where a client-side operation is mid-flight — server RESUME must not
 *  stomp them (the run row lags the client during an upload). */
const CLIENT_BUSY: readonly PipelineStep[] = ['signing', 'uploading', 'completing'];

function stageOf(step: PipelineStep): FailedStage | null {
  switch (step) {
    case 'signing':
      return 'sign';
    case 'uploading':
      return 'upload';
    case 'completing':
      return 'complete';
    case 'extracting':
      return 'extract';
    default:
      return null;
  }
}

export function pipelineReducer(state: PipelineState, event: PipelineEvent): PipelineState {
  switch (event.type) {
    case 'SIGN_START':
      if (CLIENT_BUSY.includes(state.step)) return state;
      return {
        ...state,
        step: 'signing',
        fileCount: event.fileCount,
        fileIdx: 0,
        failedStage: null,
        resumable: false,
      };
    case 'SIGNED':
      if (state.step !== 'signing') return state;
      return { ...state, step: 'uploading', runId: event.runId, fileIdx: 0 };
    case 'FILE_PUT_OK': {
      if (state.step !== 'uploading') return state;
      const next = state.fileIdx + 1;
      return next >= state.fileCount
        ? { ...state, step: 'completing', fileIdx: next }
        : { ...state, fileIdx: next };
    }
    case 'COMPLETED':
      if (state.step !== 'completing') return state;
      return { ...state, step: 'classified' };
    case 'EXTRACT_START':
      if (CLIENT_BUSY.includes(state.step)) return state;
      return { ...state, step: 'extracting', runId: event.runId, failedStage: null, resumable: false };
    case 'EXTRACTED':
      if (state.step !== 'extracting') return state;
      return { ...state, step: 'review' };
    case 'PRICED':
      if (CLIENT_BUSY.includes(state.step)) return state;
      return { ...state, step: 'priced' };
    case 'SAVED':
      if (state.step !== 'priced') return state;
      return { ...state, step: 'saved' };
    case 'FAILED': {
      const stage = stageOf(state.step);
      if (!stage) return state;
      return { ...state, step: 'failed', failedStage: stage, resumable: state.runId != null };
    }
    case 'RESUME': {
      // Never downgrade a mid-flight client op, and 'saved' is client-only —
      // the server still says 'priced' after a save.
      if (CLIENT_BUSY.includes(state.step) || state.step === 'saved') return state;
      const base = { ...state, runId: event.runId, failedStage: null, resumable: false };
      switch (event.status) {
        case 'draft':
          return { ...base, step: 'classified' };
        case 'extracting':
          return { ...base, step: 'extracting' };
        case 'ready':
          return { ...base, step: 'review' };
        case 'priced':
          return { ...base, step: 'priced' };
        case 'failed':
          // Only the extract path marks a run failed; retrying re-claims it.
          return { ...state, runId: event.runId, step: 'failed', failedStage: 'extract', resumable: true };
        default:
          return { ...state, runId: event.runId };
      }
    }
    case 'RESET':
      return initialPipeline;
  }
}

// ── Run-id persistence (resume across app restarts) ─────────────────────────

export const RUN_ID_STORAGE_KEY = 'quotemax.cpaint.run-id';

/** Best-effort: a storage failure must never break the pipeline itself. */
export async function persistRunId(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(RUN_ID_STORAGE_KEY, id);
    else await AsyncStorage.removeItem(RUN_ID_STORAGE_KEY);
  } catch {
    // The run still resumes from the history rail.
  }
}

export async function loadPersistedRunId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(RUN_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}
