/**
 * Shared /api/tenant/catalogue data layer. The hub Catalogue section and the job
 * quoter both read this endpoint; they previously cached different shapes under
 * the same react-query key, so whichever fetch landed last poisoned the other's
 * cache. One schema + one key here is the fix. Wire prices are dollars ex-GST
 * (`unit_price_ex_gst`), per the web contract.
 *
 * Phase 3 extends this into the full three-mode Catalogue editor layer (web
 * CatalogueTab, page.tsx:11314-12469):
 *   mine    → POST /api/tenant/catalogue (create — the ONLY TRADE_ENUM-gated
 *             write here: MaterialCatalogueSchema pins `trade` to electrical|
 *             plumbing), PATCH/DELETE /api/tenant/catalogue/[id] (edits omit
 *             `trade` so the [id] PATCH never trips that gate — it validates
 *             trade only when sent), POST stock-essentials, GET gaps.
 *   browse  → GET /api/supplier-catalogue (no server-side filters — the web
 *             filters client-side and so do we), POST catalogue/bulk-add
 *             ({ supplier_catalogue_ids: uuid[1..100] }, idempotent, per-id
 *             status, price defaults to supplier RRP).
 *   ladder  → GET/POST/DELETE /api/tenant/tier-ladder (upsert one
 *             { category, tier, catalogue_id } slot; DELETE ?category=&tier=).
 *
 * Gaps rides under the CATALOGUE_KEY prefix on purpose: every row-changing
 * mutation invalidates CATALOGUE_KEY, and react-query prefix-matching refreshes
 * the coverage report with it.
 */
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import type { UploadPolicy } from '@/lib/media';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

export const CATALOGUE_KEY = ['tenant', 'catalogue'];
export const CATALOGUE_GAPS_KEY = ['tenant', 'catalogue', 'gaps'];
export const SUPPLIER_CATALOGUE_KEY = ['supplier', 'catalogue'];
export const TIER_LADDER_KEY = ['tenant', 'tier-ladder'];

export const CatalogueRowSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  trade: z.string().nullable(),
  brand: z.string().nullable(),
  range_series: z.string().nullable(),
  unit_price_ex_gst: z.union([z.number(), z.string()]).nullable(),
  image_path: z.string().nullable(),
  tier_hint: z.string().nullable(),
  active: z.boolean().nullable(),
  // Editor fields (additive, nullish — the job quoter predates them).
  unit: z.string().nullish(),
  supplier: z.string().nullish(),
  description: z.string().nullish(),
  cost_price_ex_gst: z.union([z.number(), z.string()]).nullish(),
  customer_supply_price_ex_gst: z.union([z.number(), z.string()]).nullish(),
  is_preferred: z.boolean().nullish(),
  supplier_catalogue_id: z.string().nullish(),
  /** jsonb — only the three tradie-settable booleans are read; anything else
   *  (e.g. the GPO backfill's `amperage`) passes through untouched. */
  properties: z
    .looseObject({
      smart: z.boolean().nullish(),
      dimmable: z.boolean().nullish(),
      integrated_driver: z.boolean().nullish(),
    })
    .nullish(),
});
export type CatalogueRow = z.infer<typeof CatalogueRowSchema>;

export const CatalogueResponseSchema = z.looseObject({
  catalogue: z.array(CatalogueRowSchema).default([]),
});
type CatalogueResponse = z.infer<typeof CatalogueResponseSchema>;

export function useCatalogue(enabled = true) {
  return useApiQuery(CATALOGUE_KEY, '/api/tenant/catalogue', CatalogueResponseSchema, { enabled });
}

// ── Material vocabulary (web lib/estimate/material-vocabulary.ts, verbatim) ──
// The category options the web's create/edit form offers per trade, as
// [value, label] tuples so PillGroup renders them word-for-word. Only
// electrical and plumbing have a material vocabulary at all.

export const MATERIAL_CATEGORY_OPTIONS: Record<string, readonly (readonly [string, string])[]> = {
  electrical: [
    ['ceiling_fan', 'Ceiling fans'],
    ['doorbell_intercom', 'Doorbell / intercom'],
    ['downlight', 'Downlights'],
    ['ev_charger', 'EV charger'],
    ['fault_find', 'Fault finding / diagnostics'],
    ['gpo', 'GPO / power points'],
    ['outdoor_light', 'Outdoor / flood lighting'],
    ['oven_cooktop', 'Oven / cooktop'],
    ['safety_switch', 'Safety switches / RCBO'],
    ['security_camera', 'Security cameras'],
    ['smoke_alarm', 'Smoke alarms'],
    ['strip_light', 'LED strip lighting'],
    ['sundries', 'Sundries / consumables'],
    ['switchboard', 'Switchboard'],
    ['general', 'General (no specific category)'],
  ],
  plumbing: [
    ['cctv', 'Drain camera (CCTV)'],
    ['dishwasher', 'Dishwasher connection'],
    ['drain', 'Blocked drains'],
    ['gas', 'Gas fitting / gas leak'],
    ['hws_electric', 'Hot water — electric'],
    ['hws_gas', 'Hot water — gas'],
    ['hws_heat_pump', 'Hot water — heat pump'],
    ['leak_detection', 'Leak detection'],
    ['prv', 'Pressure reduction valve'],
    ['rainwater_tank', 'Rainwater tank'],
    ['shower', 'Shower head'],
    ['sundries', 'Sundries / consumables'],
    ['tapware_basin', 'Tapware — basin'],
    ['tapware_kitchen', 'Tapware — kitchen'],
    ['tapware_laundry', 'Tapware — laundry'],
    ['tapware_outdoor', 'Tapware — outdoor'],
    ['toilet', 'Toilets / cisterns'],
    ['toilet_repair', 'Toilet repair parts'],
    ['water_filter', 'Water filter / filtration'],
    ['general', 'General (no specific category)'],
  ],
};

/** Form options for one trade; `[]` for trades with no material vocabulary
 *  (offering invented values would be worse than offering none — web parity). */
export function materialCategoryOptionsFor(trade: string): readonly (readonly [string, string])[] {
  return MATERIAL_CATEGORY_OPTIONS[trade.toLowerCase()] ?? [];
}

/** Label for a category value — vocabulary label first (bulk-add writes
 *  grounding values like `gpo`), then the web's title-case fallback. */
export function materialCategoryLabel(value: string): string {
  for (const options of Object.values(MATERIAL_CATEGORY_OPTIONS)) {
    for (const [v, label] of options) if (v === value) return label;
  }
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Supabase serialises numeric columns as number OR string; '' and junk must
 *  read as "no price", never as 0 (a silent 0 becomes a free part). */
export function wireNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

/** Web CatalogueTab's list narrowing, verbatim: category chip + one
 *  case-insensitive substring over name/brand/range/supplier. */
export function filterCatalogueRows(
  rows: readonly CatalogueRow[],
  filters: { category: string; search: string },
): CatalogueRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter(r => {
    if (filters.category !== 'all' && r.category !== filters.category) return false;
    if (!q) return true;
    const hay =
      `${r.name} ${r.brand ?? ''} ${r.range_series ?? ''} ${r.supplier ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}

const TIER_RANK: Record<string, number> = { good: 0, better: 1, best: 2 };

/** Web tierSort within a category (page.tsx:11722-11729): good → better →
 *  best → untiered, preferred first inside a tier, then name. Categories
 *  alphabetical (the web uses the grounding CATEGORIES order; single-trade
 *  mobile lists are short enough that alphabetical reads the same). */
export function compareCatalogueRows(a: CatalogueRow, b: CatalogueRow): number {
  const catCmp = (a.category ?? '').localeCompare(b.category ?? '');
  if (catCmp !== 0) return catCmp;
  const ai = a.tier_hint != null ? (TIER_RANK[a.tier_hint] ?? 3) : 3;
  const bi = b.tier_hint != null ? (TIER_RANK[b.tier_hint] ?? 3) : 3;
  if (ai !== bi) return ai - bi;
  const ap = a.is_preferred === true;
  const bp = b.is_preferred === true;
  if (ap !== bp) return ap ? -1 : 1;
  return a.name.localeCompare(b.name);
}

/** Sort + bucket rows into the web's per-category sections. */
export function groupByCategory(
  rows: readonly CatalogueRow[],
): { category: string; items: CatalogueRow[] }[] {
  const sorted = [...rows].sort(compareCatalogueRows);
  const groups: { category: string; items: CatalogueRow[] }[] = [];
  for (const row of sorted) {
    const category = row.category ?? '';
    const last = groups[groups.length - 1];
    if (last && last.category === category) last.items.push(row);
    else groups.push({ category, items: [row] });
  }
  return groups;
}

/** Server cap on one bulk-add call (BulkAddSchema .max(100)). */
export const BULK_ADD_MAX = 100;

/** Toggle one supplier id in the browse selection. Deduped by construction;
 *  adding past the server's 100-id cap is a no-op (callers can compare length
 *  to BULK_ADD_MAX to surface the cap). */
export function toggleSelection(
  selected: readonly string[],
  id: string,
  max = BULK_ADD_MAX,
): string[] {
  if (selected.includes(id)) return selected.filter(s => s !== id);
  if (selected.length >= max) return [...selected];
  return [...selected, id];
}

// ── Supplier catalogue (browse) ─────────────────────────────────────────────

export const SupplierRowSchema = z.looseObject({
  id: z.string(),
  trade: z.string(),
  category: z.string(),
  name: z.string(),
  brand: z.string().nullish(),
  range_series: z.string().nullish(),
  supplier_label: z.string().nullish(),
  default_unit: z.string().nullish(),
  /** Supplier RRP, dollars ex-GST — becomes the tenant row's price on bulk-add. */
  default_unit_price_ex_gst: z.union([z.number(), z.string()]).nullish(),
  tier_hint: z.string().nullish(),
  image_url: z.string().nullish(),
  description: z.string().nullish(),
});
export type SupplierRow = z.infer<typeof SupplierRowSchema>;

export const SupplierCatalogueResponseSchema = z.looseObject({
  supplier_rows: z.array(SupplierRowSchema).default([]),
  /** supplier_catalogue_ids already linked to this tenant — drives the
   *  "✓ in your catalogue" badge so a tradie doesn't duplicate-add. */
  already_stocked: z.array(z.string()).default([]),
});

/** GET /api/supplier-catalogue — the whole library for the tenant's trades;
 *  no query params exist, all filtering is client-side (web parity). */
export function useSupplierCatalogue(enabled = true) {
  return useApiQuery(
    SUPPLIER_CATALOGUE_KEY,
    '/api/supplier-catalogue',
    SupplierCatalogueResponseSchema,
    {
      enabled,
    },
  );
}

/** Web BrowseSupplierPanel filters, verbatim: category chip AND brand chip AND
 *  every search term hitting name/brand/range/category/supplier/description/trade. */
export function filterSupplierRows(
  rows: readonly SupplierRow[],
  filters: { category: string; brand: string; search: string },
): SupplierRow[] {
  const terms = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(r => {
    if (filters.category !== 'all' && r.category !== filters.category) return false;
    if (filters.brand !== 'all' && (r.brand ?? '') !== filters.brand) return false;
    if (terms.length === 0) return true;
    const haystack = [
      r.name,
      r.brand,
      r.range_series,
      r.category,
      r.supplier_label,
      r.description,
      r.trade,
    ]
      .filter((v): v is string => typeof v === 'string' && v !== '')
      .join(' ')
      .toLowerCase();
    return terms.every(t => haystack.includes(t));
  });
}

export function supplierCategories(rows: readonly SupplierRow[]): string[] {
  return [...new Set(rows.map(r => r.category))].sort();
}

/** Brand chips are scoped to the current category pick (web parity). */
export function supplierBrands(rows: readonly SupplierRow[], category: string): string[] {
  const visible = category === 'all' ? rows : rows.filter(r => r.category === category);
  return [...new Set(visible.map(r => r.brand).filter((b): b is string => !!b))].sort();
}

// ── Writes: create / update / delete / toggle ───────────────────────────────

/** All catalogue write routes answer `{ ok: true, … }`; pin the literal so a
 *  200-with-ok:false lands in the error path instead of reading as saved. */
const WriteOkSchema = z.looseObject({ ok: z.literal(true) });
type WriteOk = z.infer<typeof WriteOkSchema>;

/** The MaterialCatalogueSchema fields the web form submits, verbatim. Money is
 *  dollars ex-GST — the wire's own unit; convert cents at the submit boundary
 *  with apiDollarsFromCents. `trade` rides only on create (TRADE_ENUM-gated);
 *  edits omit it so the [id] PATCH never trips the gate. */
export type CatalogueItemFields = {
  category: string;
  name: string;
  brand?: string;
  range_series?: string;
  supplier?: string;
  unit?: string;
  unit_price_ex_gst: number;
  /** null clears on PATCH; omit (undefined) to leave unset on create. */
  customer_supply_price_ex_gst?: number | null;
  cost_price_ex_gst?: number | null;
  description?: string;
  image_path?: string;
  tier_hint?: string;
  is_preferred?: boolean;
  properties?: { smart: boolean; dimmable: boolean; integrated_driver: boolean };
};

/** Row-changing writes refresh the tenant catalogue (prefix-invalidating the
 *  gaps report with it) AND the ladder picker, whose GET embeds the catalogue. */
const ROW_CHANGE_KEYS = [CATALOGUE_KEY, TIER_LADDER_KEY] as const;

export function useCreateCatalogueItem() {
  return useApiMutation<CatalogueItemFields & { trade: string }, WriteOk>(
    '/api/tenant/catalogue',
    WriteOkSchema,
    { invalidates: ROW_CHANGE_KEYS },
  );
}

/** `id` rides along for the path builder; the server's zod object strips it
 *  from the body (same trick as services-api). */
export function useUpdateCatalogueItem() {
  return useApiMutation<CatalogueItemFields & { id: string }, WriteOk>(
    vars => `/api/tenant/catalogue/${vars.id}`,
    WriteOkSchema,
    { method: 'PATCH', invalidates: ROW_CHANGE_KEYS },
  );
}

export function useDeleteCatalogueItem() {
  return useApiMutation<{ id: string }, WriteOk>(
    vars => `/api/tenant/catalogue/${vars.id}`,
    WriteOkSchema,
    { method: 'DELETE', invalidates: ROW_CHANGE_KEYS },
  );
}

/**
 * The active on/off switch. Optimistic: the cache flips under the thumb on a
 * two-bar connection; success re-fetches via `invalidates`, failure re-fetches
 * too (server truth wins — same shape as services' usePatchTenantMe).
 */
export function useToggleCatalogueActive() {
  const queryClient = useQueryClient();
  return useApiMutation<{ id: string; active: boolean }, WriteOk>(
    vars => `/api/tenant/catalogue/${vars.id}`,
    WriteOkSchema,
    {
      method: 'PATCH',
      invalidates: ROW_CHANGE_KEYS,
      onMutate: async vars => {
        await queryClient.cancelQueries({ queryKey: CATALOGUE_KEY });
        const snapshot = queryClient.getQueryData<CatalogueResponse>(CATALOGUE_KEY);
        if (snapshot) {
          queryClient.setQueryData<CatalogueResponse>(CATALOGUE_KEY, {
            ...snapshot,
            catalogue: snapshot.catalogue.map(r =>
              r.id === vars.id ? { ...r, active: vars.active } : r,
            ),
          });
        }
      },
      onError: () => void queryClient.invalidateQueries({ queryKey: CATALOGUE_KEY }),
    },
  );
}

// ── Bulk-add + stock essentials ─────────────────────────────────────────────

const BulkAddResultSchema = z.looseObject({
  supplier_catalogue_id: z.string(),
  /** 'added' | 'already_stocked' | 'trade_mismatch' | 'supplier_not_found' |
   *  'category_unknown' | 'insert_failed' — kept as string so a new server
   *  status degrades to "failed" instead of sinking the whole response. */
  status: z.string(),
  tenant_catalogue_id: z.string().nullish(),
  error: z.string().nullish(),
});
export type BulkAddResult = z.infer<typeof BulkAddResultSchema>;

export const BulkAddResponseSchema = z.looseObject({
  ok: z.literal(true),
  added: z.number(),
  total: z.number(),
  results: z.array(BulkAddResultSchema).default([]),
});
export type BulkAddResponse = z.infer<typeof BulkAddResponseSchema>;

/** POST /api/tenant/catalogue/bulk-add — copy supplier SKUs into the tenant
 *  catalogue at supplier RRP. Idempotent server-side (already-linked ids come
 *  back 'already_stocked'), so retrying on a dropped connection is safe. */
export function useBulkAddFromSupplier() {
  return useApiMutation<{ supplier_catalogue_ids: string[] }, BulkAddResponse>(
    '/api/tenant/catalogue/bulk-add',
    BulkAddResponseSchema,
    { invalidates: [...ROW_CHANGE_KEYS, SUPPLIER_CATALOGUE_KEY] },
  );
}

/** Per-id rollup for the result banner: added / skipped / everything else. */
export function summariseBulkAdd(results: readonly BulkAddResult[]): {
  added: number;
  alreadyStocked: number;
  failures: BulkAddResult[];
} {
  let added = 0;
  let alreadyStocked = 0;
  const failures: BulkAddResult[] = [];
  for (const r of results) {
    if (r.status === 'added') added += 1;
    else if (r.status === 'already_stocked') alreadyStocked += 1;
    else failures.push(r);
  }
  return { added, alreadyStocked, failures };
}

export const StockEssentialsResponseSchema = z.looseObject({
  ok: z.literal(true),
  added: z.number(),
  /** Absent on the "no supplier rows for your trades" early return. */
  skipped: z.number().nullish(),
  total: z.number(),
  message: z.string().nullish(),
});
export type StockEssentialsResponse = z.infer<typeof StockEssentialsResponseSchema>;

/** POST /api/tenant/catalogue/stock-essentials — one good-tier SKU per
 *  essential category, server-curated. Idempotent like bulk-add. */
export function useStockEssentials() {
  return useApiMutation<void, StockEssentialsResponse>(
    '/api/tenant/catalogue/stock-essentials',
    StockEssentialsResponseSchema,
    { invalidates: [...ROW_CHANGE_KEYS, SUPPLIER_CATALOGUE_KEY] },
  );
}

// ── Product photo upload ────────────────────────────────────────────────────

/** Exact multipart contract enforced by /api/tenant/catalogue/upload. */
export const CATALOGUE_PHOTO_POLICY = {
  purpose: 'product photo',
  field: 'file',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedTypeLabel: 'a PNG, JPEG or WebP photo',
  maxBytes: 8 * 1024 * 1024,
  maxFiles: 1,
} as const satisfies UploadPolicy<'file'>;

export const CatalogueUploadResponseSchema = z.looseObject({
  ok: z.literal(true),
  url: z.string(),
  path: z.string(),
});
export type CatalogueUploadResponse = z.infer<typeof CatalogueUploadResponseSchema>;

/** POST /api/tenant/catalogue/upload — a product PHOTO (JPG/PNG/WebP, ≤8MB,
 *  multipart field 'file') answering a public URL for the form's photo field.
 *  Despite the generic route name this is images only, not a data import. */
export function useUploadCatalogueImage() {
  return useApiMutation<FormData, CatalogueUploadResponse>(
    '/api/tenant/catalogue/upload',
    CatalogueUploadResponseSchema,
    { timeoutMs: 60000 },
  );
}

// ── Coverage gaps (read-only) ───────────────────────────────────────────────

const GapCategorySchema = z.looseObject({
  category: z.string(),
  shared_count: z.number(),
  tenant_count: z.number(),
  missing_count: z.number(),
  covered: z.boolean(),
});
export type GapCategory = z.infer<typeof GapCategorySchema>;

const GapsTradeSchema = z.looseObject({
  trade: z.string(),
  total_shared_categories: z.number(),
  covered_categories: z.number(),
  missing_rows_total: z.number(),
  coverage_pct: z.number(),
  categories: z.array(GapCategorySchema).default([]),
});
export type GapsTrade = z.infer<typeof GapsTradeSchema>;

export const GapsResponseSchema = z.looseObject({
  by_trade: z.array(GapsTradeSchema).default([]),
});

export function useCatalogueGaps(enabled = true) {
  return useApiQuery(CATALOGUE_GAPS_KEY, '/api/tenant/catalogue/gaps', GapsResponseSchema, {
    enabled,
  });
}

/** Web CoveragePanel's category sort: uncovered first, then most missing,
 *  then name — zero-shared categories dropped. */
export function sortGapCategories(categories: readonly GapCategory[]): GapCategory[] {
  return categories
    .filter(c => c.shared_count > 0)
    .sort((a, b) => {
      if (a.covered !== b.covered) return a.covered ? 1 : -1;
      if (a.missing_count !== b.missing_count) return b.missing_count - a.missing_count;
      return a.category.localeCompare(b.category);
    });
}

// ── Tier ladder ─────────────────────────────────────────────────────────────

export const LADDER_TIERS = ['good', 'better', 'best'] as const;
export type LadderTier = (typeof LADDER_TIERS)[number];

const LadderRowSchema = z.looseObject({
  category: z.string(),
  tier: z.enum(LADDER_TIERS),
  catalogue_id: z.string(),
});
export type LadderRow = z.infer<typeof LadderRowSchema>;

const LadderCatalogueRowSchema = z.looseObject({
  id: z.string(),
  trade: z.string(),
  category: z.string(),
  name: z.string(),
  brand: z.string().nullish(),
  range_series: z.string().nullish(),
  tier_hint: z.string().nullish(),
});
export type LadderCatalogueRow = z.infer<typeof LadderCatalogueRowSchema>;

export const TierLadderResponseSchema = z.looseObject({
  ladder: z.array(LadderRowSchema).default([]),
  catalogue_by_category: z.record(z.string(), z.array(LadderCatalogueRowSchema)).default({}),
});

export function useTierLadder(enabled = true) {
  return useApiQuery(TIER_LADDER_KEY, '/api/tenant/tier-ladder', TierLadderResponseSchema, {
    enabled,
  });
}

/** POST /api/tenant/tier-ladder — upsert one slot. Not TRADE_ENUM-gated: the
 *  route validates only that the catalogue row belongs to this tenant. */
export function useSetLadderSlot() {
  return useApiMutation<{ category: string; tier: LadderTier; catalogue_id: string }, WriteOk>(
    '/api/tenant/tier-ladder',
    WriteOkSchema,
    { invalidates: [TIER_LADDER_KEY] },
  );
}

/** DELETE /api/tenant/tier-ladder?category=&tier= — back to inference fallback. */
export function useClearLadderSlot() {
  return useApiMutation<{ category: string; tier: LadderTier }, WriteOk>(
    vars =>
      `/api/tenant/tier-ladder?category=${encodeURIComponent(vars.category)}&tier=${vars.tier}`,
    WriteOkSchema,
    { method: 'DELETE', invalidates: [TIER_LADDER_KEY] },
  );
}

/** The web's product-option label: "Brand Range Name" with absent parts dropped. */
export function ladderProductLabel(p: LadderCatalogueRow): string {
  return [p.brand, p.range_series, p.name].filter(Boolean).join(' ');
}
