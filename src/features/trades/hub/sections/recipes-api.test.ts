/**
 * Pins the Recipes editor's pure helpers to the backend contract:
 *   fork guard  → app/api/tenant/bom/fork + tasks/fork (409 already_customised)
 *   quantity    → TenantBomLineSchema (positive, ≤ 10 000)
 *   title       → TenantTaskLineSchema (1–120 after trim)
 *   reorder     → web RecipesTab moveTask renumbering (page.tsx:12849-12858)
 *   gaps        → web lib/dashboard/fork-gaps.ts mapForkGaps
 *   badge       → web lib/dashboard/badge-state.ts resolveCatalogueBadge
 *   vocabulary  → web lib/estimate/material-vocabulary.ts
 */
import {
  forkWouldNoOp,
  mapForkGaps,
  materialCategoriesFor,
  nextSort,
  parseQuantity,
  parseStepTitle,
  QUANTITY_MAX,
  reorderPlan,
  resolveCatalogueBadge,
  sortedBaseline,
  sortedForAssembly,
  TITLE_MAX,
} from './recipes-api';

describe('forkWouldNoOp — mirror of the server 409 already_customised guard', () => {
  it('no existing rows: the fork may fire', () => {
    expect(forkWouldNoOp([])).toBe(false);
  });

  it('one or more existing rows: skip the request (server would 409, never merge)', () => {
    expect(forkWouldNoOp([{ id: 'a' }])).toBe(true);
    expect(forkWouldNoOp([{ id: 'a' }, { id: 'b' }])).toBe(true);
  });
});

describe('parseQuantity — TenantBomLineSchema bounds', () => {
  it('accepts positive values up to 10 000, decimals included', () => {
    expect(parseQuantity('1')).toBe(1);
    expect(parseQuantity('2.5')).toBe(2.5);
    expect(parseQuantity(' 4 ')).toBe(4);
    expect(parseQuantity(String(QUANTITY_MAX))).toBe(10_000);
  });

  it('rejects zero and negatives — the server wants positive()', () => {
    expect(parseQuantity('0')).toBeNull();
    expect(parseQuantity('-2')).toBeNull();
  });

  it('rejects values over the 10 000 cap', () => {
    expect(parseQuantity('10001')).toBeNull();
  });

  it('rejects NaN, junk and empty — never a silent 0', () => {
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('   ')).toBeNull();
    expect(parseQuantity('3x')).toBeNull();
    expect(parseQuantity('NaN')).toBeNull();
    expect(parseQuantity('Infinity')).toBeNull();
  });
});

describe('parseStepTitle — TenantTaskLineSchema bounds', () => {
  it('trims and accepts 1–120 characters', () => {
    expect(parseStepTitle('Isolate the circuit')).toBe('Isolate the circuit');
    expect(parseStepTitle('  padded  ')).toBe('padded');
    expect(parseStepTitle('x'.repeat(TITLE_MAX))).toBe('x'.repeat(120));
  });

  it('rejects empty, whitespace-only and over-length titles', () => {
    expect(parseStepTitle('')).toBeNull();
    expect(parseStepTitle('   ')).toBeNull();
    expect(parseStepTitle('x'.repeat(TITLE_MAX + 1))).toBeNull();
  });
});

describe('nextSort — web parity: new rows land after the existing ones', () => {
  it('first row gets sort 1; later rows append', () => {
    expect(nextSort([])).toBe(1);
    expect(nextSort([1, 2, 3])).toBe(4);
  });
});

describe('sortedForAssembly / sortedBaseline — recipe order', () => {
  it('filters to the assembly and orders by sort', () => {
    const rows = [
      { id: 'c', assembly_id: 'asm-1', sort: 3 },
      { id: 'x', assembly_id: 'asm-2', sort: 1 },
      { id: 'a', assembly_id: 'asm-1', sort: 1 },
      { id: 'n', assembly_id: null, sort: 0 },
      { id: 'b', assembly_id: 'asm-1', sort: 2 },
    ];
    expect(sortedForAssembly(rows, 'asm-1').map(r => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles null/undefined row lists (offline cache miss)', () => {
    expect(sortedForAssembly(undefined, 'asm-1')).toEqual([]);
    expect(sortedForAssembly(null, 'asm-1')).toEqual([]);
    expect(sortedBaseline(undefined)).toEqual([]);
  });

  it('sortedBaseline orders without mutating the input', () => {
    const rows = [{ sort: 2 }, { sort: 1 }];
    expect(sortedBaseline(rows).map(r => r.sort)).toEqual([1, 2]);
    expect(rows.map(r => r.sort)).toEqual([2, 1]);
  });
});

describe('reorderPlan — web moveTask renumbering', () => {
  const rows = [
    { id: 'a', sort: 1 },
    { id: 'b', sort: 2 },
    { id: 'c', sort: 3 },
  ];

  it('moving a middle row up renumbers exactly the rows whose sort changes', () => {
    expect(reorderPlan(rows, 'c', -1)).toEqual([
      { id: 'c', sort: 2 },
      { id: 'b', sort: 3 },
    ]);
  });

  it('out-of-bounds moves are a no-op plan', () => {
    expect(reorderPlan(rows, 'a', -1)).toEqual([]);
    expect(reorderPlan(rows, 'c', 1)).toEqual([]);
    expect(reorderPlan(rows, 'missing', 1)).toEqual([]);
  });

  it('duplicate sorts from a fresh fork renumber every row from 1 — a swap of equal sorts would be a silent no-op', () => {
    const forked = [
      { id: 'a', sort: 0 },
      { id: 'b', sort: 0 },
    ];
    expect(reorderPlan(forked, 'b', -1)).toEqual([
      { id: 'b', sort: 1 },
      { id: 'a', sort: 2 },
    ]);
  });
});

describe('mapForkGaps — web fork-gaps.ts parity', () => {
  it('maps gaps to line and category lookups', () => {
    const display = mapForkGaps({
      category_gaps: [
        { material_category: 'Downlight ', line: 2 },
        { material_category: 'sundries', line: 5 },
      ],
      gap_detection_failed: false,
    });
    expect(display.count).toBe(2);
    expect(display.detectionFailed).toBe(false);
    expect(display.gapLines.has(2)).toBe(true);
    expect(display.gapLines.has(3)).toBe(false);
    expect(display.gapCategories.has('downlight')).toBe(true);
  });

  it('detection failure surfaces NO per-line markers — "couldn\'t check" is not "all good"', () => {
    const display = mapForkGaps({
      category_gaps: [{ material_category: 'downlight', line: 1 }],
      gap_detection_failed: true,
    });
    expect(display.detectionFailed).toBe(true);
    expect(display.count).toBe(0);
    expect(display.gapLines.size).toBe(0);
    expect(display.gapCategories.size).toBe(0);
  });

  it('drops blank-category entries rather than throwing', () => {
    const display = mapForkGaps({
      category_gaps: [{ material_category: '   ', line: 1 }],
      gap_detection_failed: false,
    });
    expect(display.count).toBe(0);
  });
});

describe('resolveCatalogueBadge — priced vs generic', () => {
  it('matches case-insensitively in the canonical trim+lowercase form', () => {
    expect(resolveCatalogueBadge('Downlight', ['downlight'])).toBe('catalogue');
    expect(resolveCatalogueBadge('downlight', [' DOWNLIGHT '])).toBe('catalogue');
  });

  it('no product in the category → generic', () => {
    expect(resolveCatalogueBadge('gpo', ['downlight'])).toBe('generic');
    expect(resolveCatalogueBadge('gpo', [])).toBe('generic');
  });

  it('a blank category can never claim catalogue pricing', () => {
    expect(resolveCatalogueBadge('', ['downlight'])).toBe('generic');
    expect(resolveCatalogueBadge(null, ['downlight'])).toBe('generic');
  });
});

describe('materialCategoriesFor — web vocabulary scoping', () => {
  it('electrical and plumbing carry their own vocabularies', () => {
    const electrical = materialCategoriesFor('electrical').map(o => o.value);
    expect(electrical).toContain('downlight');
    expect(electrical).toContain('sundries');
    expect(electrical).not.toContain('tapware_kitchen');
    const plumbing = materialCategoriesFor('plumbing').map(o => o.value);
    expect(plumbing).toContain('tapware_kitchen');
    expect(plumbing).not.toContain('gpo');
  });

  it('a trade with no material vocabulary offers nothing — never invented values', () => {
    expect(materialCategoriesFor('roofing')).toEqual([]);
    expect(materialCategoriesFor('')).toEqual([]);
  });

  it('normalises the trade before lookup', () => {
    expect(materialCategoriesFor(' Electrical ').length).toBeGreaterThan(0);
  });
});
