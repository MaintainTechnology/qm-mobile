/**
 * Pins the Catalogue editor's pure helpers to the backend contract (web
 * app/api/tenant/catalogue/* + /api/supplier-catalogue + /api/tenant/tier-ladder)
 * and round-trips realistic payloads through the response schemas so a wire
 * change fails here before it renders a wrong price.
 */
import {
  BULK_ADD_MAX,
  BulkAddResponseSchema,
  CatalogueResponseSchema,
  compareCatalogueRows,
  filterCatalogueRows,
  filterSupplierRows,
  GapsResponseSchema,
  groupByCategory,
  materialCategoryLabel,
  materialCategoryOptionsFor,
  sortGapCategories,
  StockEssentialsResponseSchema,
  summariseBulkAdd,
  SupplierCatalogueResponseSchema,
  supplierBrands,
  supplierCategories,
  TierLadderResponseSchema,
  toggleSelection,
  wireNumber,
  type CatalogueRow,
  type SupplierRow,
} from './catalogue-api';

// ── Selection (browse multi-select) ─────────────────────────────────────────

describe('toggleSelection', () => {
  it('adds an unselected id and removes a selected one', () => {
    expect(toggleSelection([], 'a')).toEqual(['a']);
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('never duplicates — toggling twice is a round trip', () => {
    const once = toggleSelection(['a'], 'b');
    expect(once).toEqual(['a', 'b']);
    expect(toggleSelection(once, 'b')).toEqual(['a']);
  });

  it('caps at the server bulk-add limit of 100', () => {
    expect(BULK_ADD_MAX).toBe(100);
    const full = Array.from({ length: BULK_ADD_MAX }, (_, i) => `id-${i}`);
    expect(toggleSelection(full, 'overflow')).toEqual(full);
    // Removing still works at the cap.
    expect(toggleSelection(full, 'id-0')).toHaveLength(BULK_ADD_MAX - 1);
  });

  it('does not mutate the input array', () => {
    const input = ['a'];
    toggleSelection(input, 'b');
    toggleSelection(input, 'a');
    expect(input).toEqual(['a']);
  });
});

// ── Bulk-add rollup ─────────────────────────────────────────────────────────

describe('summariseBulkAdd', () => {
  it('splits added / already_stocked / everything-else', () => {
    const { added, alreadyStocked, failures } = summariseBulkAdd([
      { supplier_catalogue_id: '1', status: 'added' },
      { supplier_catalogue_id: '2', status: 'already_stocked' },
      { supplier_catalogue_id: '3', status: 'trade_mismatch' },
      { supplier_catalogue_id: '4', status: 'insert_failed', error: 'duplicate name in your catalogue' },
      { supplier_catalogue_id: '5', status: 'added' },
    ]);
    expect(added).toBe(2);
    expect(alreadyStocked).toBe(1);
    expect(failures.map(f => f.status)).toEqual(['trade_mismatch', 'insert_failed']);
  });

  it('treats an unknown future status as a failure, not a success', () => {
    const { failures } = summariseBulkAdd([
      { supplier_catalogue_id: '1', status: 'quota_exceeded' },
    ]);
    expect(failures).toHaveLength(1);
  });
});

// ── Wire numbers ────────────────────────────────────────────────────────────

describe('wireNumber', () => {
  it('passes numbers and parses numeric strings (Supabase numeric columns)', () => {
    expect(wireNumber(42)).toBe(42);
    expect(wireNumber('42.5')).toBe(42.5);
  });

  it('reads blank/junk as null, never 0 — a silent 0 is a free part', () => {
    expect(wireNumber('')).toBeNull();
    expect(wireNumber('  ')).toBeNull();
    expect(wireNumber('abc')).toBeNull();
    expect(wireNumber(null)).toBeNull();
    expect(wireNumber(undefined)).toBeNull();
  });
});

// ── List filtering ──────────────────────────────────────────────────────────

function catRow(over: Partial<CatalogueRow>): CatalogueRow {
  return {
    id: 'id',
    name: 'Clipsal Iconic GPO',
    category: 'gpo',
    trade: 'electrical',
    brand: 'Clipsal',
    range_series: 'Iconic',
    unit_price_ex_gst: '42.00',
    image_path: null,
    tier_hint: 'better',
    active: true,
    ...over,
  };
}

describe('filterCatalogueRows', () => {
  const rows = [
    catRow({ id: '1' }),
    catRow({ id: '2', name: 'HPM downlight', category: 'downlight', brand: 'HPM', range_series: null }),
    catRow({ id: '3', name: 'Cable ties', category: 'sundries', brand: null, supplier: 'Bunnings' }),
  ];

  it('narrows by category chip', () => {
    expect(filterCatalogueRows(rows, { category: 'downlight', search: '' }).map(r => r.id)).toEqual(['2']);
    expect(filterCatalogueRows(rows, { category: 'all', search: '' })).toHaveLength(3);
  });

  it('searches name/brand/range/supplier, case-insensitive', () => {
    expect(filterCatalogueRows(rows, { category: 'all', search: 'clipsal' }).map(r => r.id)).toEqual(['1']);
    expect(filterCatalogueRows(rows, { category: 'all', search: 'BUNNINGS' }).map(r => r.id)).toEqual(['3']);
    expect(filterCatalogueRows(rows, { category: 'all', search: 'nothing here' })).toHaveLength(0);
  });

  it('ANDs category with search', () => {
    expect(filterCatalogueRows(rows, { category: 'gpo', search: 'hpm' })).toHaveLength(0);
  });
});

describe('compareCatalogueRows + groupByCategory', () => {
  it('sorts good → better → best → untiered, preferred first within a tier', () => {
    const rows = [
      catRow({ id: 'untiered', tier_hint: null, name: 'A' }),
      catRow({ id: 'best', tier_hint: 'best' }),
      catRow({ id: 'good-b', tier_hint: 'good', name: 'B item' }),
      catRow({ id: 'good-pref', tier_hint: 'good', name: 'Z item', is_preferred: true }),
    ];
    const sorted = [...rows].sort(compareCatalogueRows);
    expect(sorted.map(r => r.id)).toEqual(['good-pref', 'good-b', 'best', 'untiered']);
  });

  it('buckets by category after sorting', () => {
    const groups = groupByCategory([
      catRow({ id: '1', category: 'gpo' }),
      catRow({ id: '2', category: 'downlight' }),
      catRow({ id: '3', category: 'gpo' }),
    ]);
    expect(groups.map(g => g.category)).toEqual(['downlight', 'gpo']);
    expect(groups[1]?.items).toHaveLength(2);
  });
});

function supRow(over: Partial<SupplierRow>): SupplierRow {
  return {
    id: 'sup-1',
    trade: 'electrical',
    category: 'downlight',
    name: 'DL9 Downlight',
    brand: 'HPM',
    range_series: 'DL9',
    supplier_label: 'TLE',
    default_unit: 'each',
    default_unit_price_ex_gst: 19.9,
    tier_hint: 'good',
    image_url: null,
    description: 'Tri-colour 9W LED',
    ...over,
  };
}

describe('filterSupplierRows', () => {
  const rows = [
    supRow({ id: '1' }),
    supRow({ id: '2', brand: 'Clipsal', range_series: 'Iconic', name: 'Iconic GPO', category: 'gpo' }),
    supRow({ id: '3', brand: 'Clipsal', name: 'Clipsal 2000 GPO', category: 'gpo', tier_hint: 'better' }),
  ];

  it('ANDs category, brand and multi-term search', () => {
    expect(
      filterSupplierRows(rows, { category: 'gpo', brand: 'all', search: '' }).map(r => r.id),
    ).toEqual(['2', '3']);
    expect(
      filterSupplierRows(rows, { category: 'gpo', brand: 'Clipsal', search: 'iconic' }).map(r => r.id),
    ).toEqual(['2']);
  });

  it('matches when every term appears somewhere in the row', () => {
    expect(
      filterSupplierRows(rows, { category: 'all', brand: 'all', search: 'clipsal gpo' }),
    ).toHaveLength(2);
    expect(
      filterSupplierRows(rows, { category: 'all', brand: 'all', search: 'clipsal downlight' }),
    ).toHaveLength(0);
  });

  it('offers chip options off the visible rows', () => {
    expect(supplierCategories(rows)).toEqual(['downlight', 'gpo']);
    expect(supplierBrands(rows, 'gpo')).toEqual(['Clipsal']);
    expect(supplierBrands(rows, 'all')).toEqual(['Clipsal', 'HPM']);
  });
});

// ── Vocabulary ──────────────────────────────────────────────────────────────

describe('material vocabulary', () => {
  it('offers the web vocabulary for the two catalogue trades and nothing else', () => {
    expect(materialCategoryOptionsFor('electrical').length).toBeGreaterThan(0);
    expect(materialCategoryOptionsFor('plumbing').length).toBeGreaterThan(0);
    expect(materialCategoryOptionsFor('roofing')).toEqual([]);
  });

  it('labels known values and title-cases the rest', () => {
    expect(materialCategoryLabel('gpo')).toBe('GPO / power points');
    expect(materialCategoryLabel('hws_gas')).toBe('Hot water — gas');
    expect(materialCategoryLabel('mystery_thing')).toBe('Mystery Thing');
  });
});

// ── Gap sorting ─────────────────────────────────────────────────────────────

describe('sortGapCategories', () => {
  it('drops zero-shared rows, uncovered first, then most missing', () => {
    const sorted = sortGapCategories([
      { category: 'gpo', shared_count: 4, tenant_count: 2, missing_count: 2, covered: true },
      { category: 'zzz', shared_count: 0, tenant_count: 0, missing_count: 0, covered: false },
      { category: 'downlight', shared_count: 3, tenant_count: 0, missing_count: 3, covered: false },
      { category: 'smoke_alarm', shared_count: 2, tenant_count: 0, missing_count: 2, covered: false },
    ]);
    expect(sorted.map(c => c.category)).toEqual(['downlight', 'smoke_alarm', 'gpo']);
  });
});

// ── Schema round-trips ──────────────────────────────────────────────────────

describe('response schemas accept realistic payloads', () => {
  it('catalogue GET — numeric-as-string prices and jsonb properties survive', () => {
    const parsed = CatalogueResponseSchema.parse({
      ok: true,
      catalogue: [
        {
          id: 'c1',
          tenant_id: 't1',
          name: 'Clipsal Iconic GPO',
          category: 'gpo',
          trade: 'electrical',
          brand: 'Clipsal',
          range_series: 'Iconic',
          supplier: 'TLE',
          unit: 'each',
          unit_price_ex_gst: '42.00',
          customer_supply_price_ex_gst: null,
          cost_price_ex_gst: 28.5,
          tier_hint: 'better',
          image_path: null,
          description: 'Matte black',
          is_preferred: true,
          active: true,
          supplier_catalogue_id: 'sup-9',
          properties: { smart: false, dimmable: true, amperage: 10 },
        },
      ],
    });
    const row = parsed.catalogue[0];
    expect(row?.properties?.dimmable).toBe(true);
    expect(row?.cost_price_ex_gst).toBe(28.5);
  });

  it('supplier catalogue GET', () => {
    const parsed = SupplierCatalogueResponseSchema.parse({
      ok: true,
      supplier_rows: [
        {
          id: 's1',
          trade: 'plumbing',
          category: 'tapware_basin',
          brand: 'Caroma',
          range_series: null,
          name: 'Luna basin mixer',
          supplier_label: 'Reece',
          default_unit: 'each',
          default_unit_price_ex_gst: '189',
          tier_hint: null,
          image_url: null,
          description: null,
          supplier_revision: 3,
        },
      ],
      already_stocked: ['s2'],
    });
    expect(parsed.supplier_rows).toHaveLength(1);
    expect(parsed.already_stocked).toEqual(['s2']);
  });

  it('bulk-add POST — ok must be literal true, per-id statuses kept', () => {
    const parsed = BulkAddResponseSchema.parse({
      ok: true,
      added: 1,
      total: 2,
      results: [
        { supplier_catalogue_id: 'a', status: 'added', tenant_catalogue_id: 'c9' },
        { supplier_catalogue_id: 'b', status: 'already_stocked' },
      ],
    });
    expect(summariseBulkAdd(parsed.results).added).toBe(1);
    expect(BulkAddResponseSchema.safeParse({ ok: false, added: 0, total: 0 }).success).toBe(false);
  });

  it('stock-essentials POST — including the no-supplier-rows early return', () => {
    expect(
      StockEssentialsResponseSchema.parse({ ok: true, added: 5, skipped: 1, total: 6, failures: [] })
        .skipped,
    ).toBe(1);
    const early = StockEssentialsResponseSchema.parse({
      ok: true,
      added: 0,
      total: 0,
      message: 'no supplier rows found for your trades — catalogue may not be seeded yet',
    });
    expect(early.skipped ?? 0).toBe(0);
  });

  it('gaps GET', () => {
    const parsed = GapsResponseSchema.parse({
      ok: true,
      trades_active: ['electrical'],
      by_trade: [
        {
          trade: 'electrical',
          total_shared_categories: 7,
          covered_categories: 5,
          uncovered_categories: 2,
          missing_rows_total: 9,
          coverage_pct: 71,
          categories: [
            { category: 'gpo', shared_count: 4, tenant_count: 1, missing_count: 3, covered: true },
          ],
        },
      ],
    });
    expect(parsed.by_trade[0]?.coverage_pct).toBe(71);
  });

  it('tier-ladder GET', () => {
    const parsed = TierLadderResponseSchema.parse({
      ok: true,
      ladder: [{ category: 'gpo', tier: 'better', catalogue_id: 'c1', updated_at: '2026-08-01' }],
      catalogue_by_category: {
        gpo: [
          {
            id: 'c1',
            trade: 'electrical',
            category: 'gpo',
            name: 'Iconic GPO',
            brand: 'Clipsal',
            range_series: 'Iconic',
            tier_hint: 'better',
          },
        ],
      },
    });
    expect(parsed.ladder[0]?.tier).toBe('better');
    expect(parsed.catalogue_by_category.gpo?.[0]?.name).toBe('Iconic GPO');
  });
});
