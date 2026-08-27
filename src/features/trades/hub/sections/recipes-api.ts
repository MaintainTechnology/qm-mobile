/**
 * Recipes data layer — the mobile mirror of the web RecipesTab's two write
 * surfaces (quotemate-automation app/dashboard/page.tsx:12470-13439):
 *
 *   parts (BOM lines) → GET/POST /api/tenant/bom, PATCH/DELETE /api/tenant/bom/[id],
 *     POST /api/tenant/bom/fork. GET returns { assemblies, lines, baselines,
 *     catalogue_categories } — assemblies already narrowed server-side by
 *     recipeTradesFor, lines are the tenant's own rows, baselines the shared
 *     starting points keyed by assembly_id, catalogue_categories the categories
 *     the tradie has a priced active product for (drives the priced/generic badge).
 *   steps (task checklist) → the same five shapes on /api/tenant/tasks, minus
 *     the catalogue-gap apparatus (steps carry no category and no price BY
 *     DESIGN — the estimator never reads them).
 *
 * Write gating: POST bodies validate `trade` against TRADE_ENUM (electrical +
 * plumbing — see ../write-gate.ts); the [id] PATCH routes never see `trade`.
 * Both fork routes 409 `already_customised` when the tenant already has ≥1 row
 * for the assembly (never merge) and 404 `no_baseline` when there is nothing
 * to copy — `forkWouldNoOp` mirrors the 409 guard client-side.
 *
 * Query keys: TASKS_KEY deliberately matches the read-only Recipes render in
 * SectionsContent.tsx (['tenant','tasks']) so its step counts share one cache
 * with this editor. Both parse the same wire response with loose schemas, so
 * neither parse drops the other's fields. BOM writes also invalidate
 * ESTIMATION_KEY — the Estimating section's part counts and recipe_source
 * badges are derived from the same tenant rows.
 *
 * No money here at all: a recipe line carries no price (prices live on the
 * catalogue products the categories join to), so nothing in this file may
 * invent one.
 */
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

import { ESTIMATION_KEY } from './estimating-api';

export const BOM_KEY = ['tenant', 'bom'] as const;
export const TASKS_KEY = ['tenant', 'tasks'] as const;

// ── Server bounds, verbatim from lib/tenant/update-schema.ts ────────────────
// TenantBomLineSchema:  quantity positive ≤ 10_000, description ≤ 200, sort 0–999
// TenantTaskLineSchema: title 1–120, notes ≤ 500, sort 0–999
export const QUANTITY_MAX = 10_000;
export const DESCRIPTION_MAX = 200;
export const TITLE_MAX = 120;
export const NOTES_MAX = 500;
export const SORT_MAX = 999;

// ── GET shapes ──────────────────────────────────────────────────────────────

const AssemblySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  trade: z.string(),
});
export type RecipeAssembly = z.infer<typeof AssemblySchema>;

/** tenant_assembly_bom row (select *). Numerics coerced: Postgres numeric can
 *  serialise as a string, and the web renders via Number(l.quantity) for the
 *  same reason. */
const BomLineSchema = z.looseObject({
  id: z.string(),
  assembly_id: z.string().nullish(),
  material_category: z.string(),
  description: z.string().nullish(),
  quantity: z.coerce.number(),
  required: z.boolean().nullish(),
  sort: z.coerce.number().default(0),
});
export type BomLine = z.infer<typeof BomLineSchema>;

const BaselineLineSchema = z.looseObject({
  material_category: z.string(),
  description: z.string().nullish(),
  quantity: z.coerce.number(),
  required: z.boolean().nullish(),
  sort: z.coerce.number().default(0),
});
export type BaselineLine = z.infer<typeof BaselineLineSchema>;

export const BomResponseSchema = z.looseObject({
  assemblies: z.array(AssemblySchema).default([]),
  lines: z.array(BomLineSchema).default([]),
  baselines: z.record(z.string(), z.array(BaselineLineSchema)).default({}),
  catalogue_categories: z.array(z.string()).default([]),
});

export function useBom(opts: { enabled?: boolean } = {}) {
  return useApiQuery(BOM_KEY, '/api/tenant/bom', BomResponseSchema, opts);
}

/** tenant_assembly_tasks row (select *). */
const TaskLineSchema = z.looseObject({
  id: z.string(),
  assembly_id: z.string().nullish(),
  title: z.string(),
  notes: z.string().nullish(),
  required: z.boolean().nullish(),
  sort: z.coerce.number().default(0),
});
export type TaskLine = z.infer<typeof TaskLineSchema>;

const BaselineTaskSchema = z.looseObject({
  title: z.string(),
  notes: z.string().nullish(),
  required: z.boolean().nullish(),
  sort: z.coerce.number().default(0),
});
export type BaselineTask = z.infer<typeof BaselineTaskSchema>;

export const TasksResponseSchema = z.looseObject({
  assemblies: z.array(AssemblySchema).default([]),
  lines: z.array(TaskLineSchema).default([]),
  baselines: z.record(z.string(), z.array(BaselineTaskSchema)).default({}),
});

export function useTasks() {
  return useApiQuery(TASKS_KEY, '/api/tenant/tasks', TasksResponseSchema);
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** Every write route answers `{ ok: true, … }`; pin the literal so a
 *  200-with-ok:false lands in the error path instead of reading as saved. */
const WriteOkSchema = z.looseObject({ ok: z.literal(true) });
type WriteOk = z.infer<typeof WriteOkSchema>;

/** The TenantBomLineSchema fields the web add-line form submits, verbatim. */
export type BomLineCreate = {
  assembly_id: string;
  trade: string;
  material_category: string;
  quantity: number;
  required: boolean;
  description?: string;
  sort: number;
};

export function useCreateBomLine() {
  return useApiMutation<BomLineCreate, WriteOk>('/api/tenant/bom', WriteOkSchema, {
    invalidates: [BOM_KEY, ESTIMATION_KEY],
  });
}

/** Inline row edits — the web only patches quantity / required (+ sort for
 *  ordering). `id` rides along for the path builder; the server's zod object
 *  strips it from the body. */
export type BomLinePatch = {
  id: string;
  quantity?: number;
  required?: boolean;
  sort?: number;
};

export function useUpdateBomLine() {
  return useApiMutation<BomLinePatch, WriteOk>(
    vars => `/api/tenant/bom/${encodeURIComponent(vars.id)}`,
    WriteOkSchema,
    { method: 'PATCH', invalidates: [BOM_KEY, ESTIMATION_KEY] },
  );
}

export function useDeleteBomLine() {
  return useApiMutation<{ id: string }, WriteOk>(
    vars => `/api/tenant/bom/${encodeURIComponent(vars.id)}`,
    WriteOkSchema,
    { method: 'DELETE', invalidates: [BOM_KEY, ESTIMATION_KEY] },
  );
}

/** POST /api/tenant/bom/fork response. The tasks fork answers the same shape
 *  minus the gap fields (deliberately — steps have no catalogue join), so the
 *  defaults make one schema serve both. */
export const ForkResultSchema = z.looseObject({
  ok: z.literal(true),
  category_gaps: z
    .array(z.looseObject({ material_category: z.string(), line: z.number() }))
    .default([]),
  has_category_gaps: z.boolean().default(false),
  gap_detection_failed: z.boolean().default(false),
});
export type ForkResult = z.infer<typeof ForkResultSchema>;

export function useForkBomBaseline() {
  return useApiMutation<{ assembly_id: string }, ForkResult>(
    '/api/tenant/bom/fork',
    ForkResultSchema,
    { invalidates: [BOM_KEY, ESTIMATION_KEY] },
  );
}

/** The TenantTaskLineSchema fields the web add-step form submits, verbatim. */
export type TaskStepCreate = {
  assembly_id: string;
  trade: string;
  title: string;
  notes?: string;
  required: boolean;
  sort: number;
};

export function useCreateTaskStep() {
  return useApiMutation<TaskStepCreate, WriteOk>('/api/tenant/tasks', WriteOkSchema, {
    invalidates: [TASKS_KEY],
  });
}

export type TaskStepPatch = {
  id: string;
  title?: string;
  notes?: string;
  required?: boolean;
  sort?: number;
};

export function useUpdateTaskStep() {
  return useApiMutation<TaskStepPatch, WriteOk>(
    vars => `/api/tenant/tasks/${encodeURIComponent(vars.id)}`,
    WriteOkSchema,
    { method: 'PATCH', invalidates: [TASKS_KEY] },
  );
}

export function useDeleteTaskStep() {
  return useApiMutation<{ id: string }, WriteOk>(
    vars => `/api/tenant/tasks/${encodeURIComponent(vars.id)}`,
    WriteOkSchema,
    { method: 'DELETE', invalidates: [TASKS_KEY] },
  );
}

export function useForkTaskBaseline() {
  return useApiMutation<{ assembly_id: string }, ForkResult>(
    '/api/tenant/tasks/fork',
    ForkResultSchema,
    { invalidates: [TASKS_KEY] },
  );
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Canonical category form (web lib/estimate/catalogue.ts normaliseCategory). */
export function normaliseCategory(category: string | null | undefined): string {
  return (category ?? '').trim().toLowerCase();
}

/** This assembly's rows, in recipe order. A fork copies the baseline's sorts
 *  verbatim (duplicates possible), so ties keep their server order. */
export function sortedForAssembly<T extends { assembly_id?: string | null; sort?: number }>(
  rows: readonly T[] | null | undefined,
  assemblyId: string,
): T[] {
  return (rows ?? [])
    .filter(r => r.assembly_id === assemblyId)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

/** Baseline rows in recipe order (the GET keys them by assembly already). */
export function sortedBaseline<T extends { sort?: number }>(
  rows: readonly T[] | null | undefined,
): T[] {
  return [...(rows ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

/** Client mirror of both fork routes' 409 guard: the server refuses to fork
 *  over ≥1 existing tenant row for the assembly (never merges). Skip the
 *  request entirely rather than round-trip into `already_customised`. */
export function forkWouldNoOp(existingForAssembly: readonly unknown[]): boolean {
  return existingForAssembly.length >= 1;
}

/** Quantity input → number, or null when unusable. Server bound (TenantBomLine
 *  quantity): positive, ≤ 10 000. `Number` (not parseFloat) so trailing junk
 *  ('3x') is rejected and a silent NaN can never reach a write. */
export function parseQuantity(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > QUANTITY_MAX) return null;
  return n;
}

/** Step-title input → trimmed title, or null when unusable (server bound:
 *  1–120 after trim). */
export function parseStepTitle(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length < 1 || trimmed.length > TITLE_MAX) return null;
  return trimmed;
}

/** Web parity: a new row lands after the existing ones (rows.length + 1),
 *  capped at the server's sort ceiling. */
export function nextSort(existingForAssembly: readonly unknown[]): number {
  return Math.min(existingForAssembly.length + 1, SORT_MAX);
}

/**
 * The PATCHes a one-step move needs — the web's moveTask renumbering
 * (page.tsx:12849-12858) as a pure plan. Renumbers from 1 rather than swapping
 * two sorts: a fork copies the baseline's sorts verbatim, so duplicates are
 * possible and swapping equal numbers would be a silent no-op. Out-of-bounds
 * moves return [].
 */
export function reorderPlan<T extends { id: string; sort?: number }>(
  orderedRows: readonly T[],
  id: string,
  dir: -1 | 1,
): { id: string; sort: number }[] {
  const i = orderedRows.findIndex(r => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= orderedRows.length) return [];
  const next = [...orderedRows];
  const a = next[i];
  const b = next[j];
  if (!a || !b) return [];
  next[i] = b;
  next[j] = a;
  const plan: { id: string; sort: number }[] = [];
  for (const [k, row] of next.entries()) {
    if ((row.sort ?? 0) !== k + 1) plan.push({ id: row.id, sort: k + 1 });
  }
  return plan;
}

/** Web resolveCatalogueBadge (lib/dashboard/badge-state.ts): does this line's
 *  category have a priced, active catalogue product? Display-only — the badge
 *  never computes or shows a price. */
export type CatalogueBadge = 'catalogue' | 'generic';

export function resolveCatalogueBadge(
  lineCategory: string | null | undefined,
  catalogueCategories: readonly string[],
): CatalogueBadge {
  const target = normaliseCategory(lineCategory);
  if (!target) return 'generic';
  return catalogueCategories.some(c => normaliseCategory(c) === target) ? 'catalogue' : 'generic';
}

/** The just-forked catalogue-gap report, mapped for per-line lookup (web
 *  lib/dashboard/fork-gaps.ts mapForkGaps at mobile scope). When detection
 *  failed we surface NO per-line markers — we genuinely don't know — and the
 *  UI says "couldn't check" instead of falsely reassuring. */
export type ForkGapDisplay = {
  detectionFailed: boolean;
  count: number;
  /** 1-based line positions (sort order) with no catalogue product. */
  gapLines: ReadonlySet<number>;
  /** Normalised categories with no catalogue product. */
  gapCategories: ReadonlySet<string>;
};

export function mapForkGaps(
  result: Pick<ForkResult, 'category_gaps' | 'gap_detection_failed'>,
): ForkGapDisplay {
  const detectionFailed = result.gap_detection_failed === true;
  const clean = detectionFailed
    ? []
    : result.category_gaps.filter(
        g => Number.isFinite(g.line) && g.material_category.trim() !== '',
      );
  return {
    detectionFailed,
    count: clean.length,
    gapLines: new Set(clean.map(g => g.line)),
    gapCategories: new Set(
      clean.map(g => normaliseCategory(g.material_category)).filter(c => c !== ''),
    ),
  };
}

// ── Error narrowing ─────────────────────────────────────────────────────────

function errorSlug(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { error?: unknown } | null | undefined;
  return typeof body?.error === 'string' ? body.error : null;
}

/** Fork 404 `{ error: 'no_baseline' }` — nothing to copy for this job. */
export function isNoBaseline(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && errorSlug(error) === 'no_baseline';
}

/** POST/PATCH 409 unique-row guards (`duplicate_line` / `duplicate_task`). */
export function isDuplicate(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const slug = errorSlug(error);
  return slug === 'duplicate_line' || slug === 'duplicate_task';
}

// ── Material vocabulary ─────────────────────────────────────────────────────
// Verbatim mirror of the web's SINGLE SOURCE OF TRUTH for what a BOM line's
// material_category may be (lib/estimate/material-vocabulary.ts
// MATERIAL_VOCABULARY) — the server's refineMaterialCategory rejects anything
// else, so the add-part picker must offer exactly this list. Only electrical
// and plumbing have a material vocabulary at all; every other trade prices
// through its own deterministic engine rather than a BOM.

export type MaterialCategoryOption = { value: string; label: string };

export const MATERIAL_VOCABULARY: Record<string, readonly MaterialCategoryOption[]> = {
  electrical: [
    { value: 'ceiling_fan', label: 'Ceiling fans' },
    { value: 'doorbell_intercom', label: 'Doorbell / intercom' },
    { value: 'downlight', label: 'Downlights' },
    { value: 'ev_charger', label: 'EV charger' },
    { value: 'fault_find', label: 'Fault finding / diagnostics' },
    { value: 'gpo', label: 'GPO / power points' },
    { value: 'outdoor_light', label: 'Outdoor / flood lighting' },
    { value: 'oven_cooktop', label: 'Oven / cooktop' },
    { value: 'safety_switch', label: 'Safety switches / RCBO' },
    { value: 'security_camera', label: 'Security cameras' },
    { value: 'smoke_alarm', label: 'Smoke alarms' },
    { value: 'strip_light', label: 'LED strip lighting' },
    { value: 'sundries', label: 'Sundries / consumables' },
    { value: 'switchboard', label: 'Switchboard' },
    { value: 'general', label: 'General (no specific category)' },
  ],
  plumbing: [
    { value: 'cctv', label: 'Drain camera (CCTV)' },
    { value: 'dishwasher', label: 'Dishwasher connection' },
    { value: 'drain', label: 'Blocked drains' },
    { value: 'gas', label: 'Gas fitting / gas leak' },
    { value: 'hws_electric', label: 'Hot water — electric' },
    { value: 'hws_gas', label: 'Hot water — gas' },
    { value: 'hws_heat_pump', label: 'Hot water — heat pump' },
    { value: 'leak_detection', label: 'Leak detection' },
    { value: 'prv', label: 'Pressure reduction valve' },
    { value: 'rainwater_tank', label: 'Rainwater tank' },
    { value: 'shower', label: 'Shower head' },
    { value: 'sundries', label: 'Sundries / consumables' },
    { value: 'tapware_basin', label: 'Tapware — basin' },
    { value: 'tapware_kitchen', label: 'Tapware — kitchen' },
    { value: 'tapware_laundry', label: 'Tapware — laundry' },
    { value: 'tapware_outdoor', label: 'Tapware — outdoor' },
    { value: 'toilet', label: 'Toilets / cisterns' },
    { value: 'toilet_repair', label: 'Toilet repair parts' },
    { value: 'water_filter', label: 'Water filter / filtration' },
    { value: 'general', label: 'General (no specific category)' },
  ],
};

/** The categories the add-part picker should offer for `trade`. A trade with
 *  no material vocabulary returns [] — offering invented values would be worse
 *  than offering none (the exact bug the web module exists to fix). */
export function materialCategoriesFor(trade: string): readonly MaterialCategoryOption[] {
  return MATERIAL_VOCABULARY[normaliseCategory(trade)] ?? [];
}

/** Friendly label for a stored category value; unknown values render verbatim
 *  (the web shows the raw value — never hide what the server will price by). */
export function categoryLabelFor(trade: string, value: string): string {
  const target = normaliseCategory(value);
  return materialCategoriesFor(trade).find(o => o.value === target)?.label ?? value;
}
