/**
 * Pins the estimator pipeline reducer, the client-side guards and the
 * row/item converters to the web /api/tenant/estimator/* contracts.
 */
import type { PickedFile } from '@/lib/media';

import {
  countProblem,
  deviceTotal,
  effectiveItems,
  itemsToRows,
  MAX_PDF_BYTES,
  PIPELINE_IDLE,
  pipelineReduce,
  pipelineRunId,
  planPdfProblem,
  PriceResponseSchema,
  rowsToItems,
  rowsToPriceItems,
  type PipelineState,
} from './estimator-api';

// The module persists the in-flight run id; keep jest off the native store.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

// ── Pipeline reducer ────────────────────────────────────────────────────────

describe('pipelineReduce — happy path', () => {
  it('walks idle → picking → uploading → review → pricing → priced', () => {
    let s: PipelineState = pipelineReduce(PIPELINE_IDLE, { type: 'pick' });
    expect(s).toEqual({ stage: 'picking' });
    s = pipelineReduce(s, { type: 'picked' });
    expect(s).toEqual({ stage: 'idle' });
    s = pipelineReduce(s, { type: 'upload' });
    expect(s).toEqual({ stage: 'uploading' });
    s = pipelineReduce(s, { type: 'extracted', id: 'ex-1' });
    expect(s).toEqual({ stage: 'review', id: 'ex-1' });
    s = pipelineReduce(s, { type: 'price' });
    expect(s).toEqual({ stage: 'pricing', id: 'ex-1' });
    s = pipelineReduce(s, { type: 'priced' });
    expect(s).toEqual({ stage: 'priced', id: 'ex-1' });
    expect(pipelineRunId(s)).toBe('ex-1');
  });

  it('lets a priced run be edited back into review, then re-priced', () => {
    let s: PipelineState = { stage: 'priced', id: 'ex-1' };
    s = pipelineReduce(s, { type: 'edit' });
    expect(s).toEqual({ stage: 'review', id: 'ex-1' });
    s = pipelineReduce(s, { type: 'price' });
    expect(s).toEqual({ stage: 'pricing', id: 'ex-1' });
  });
});

describe('pipelineReduce — failure at each stage', () => {
  it('upload failure has no id (the server never returned one) and can retry', () => {
    let s: PipelineState = pipelineReduce({ stage: 'uploading' }, { type: 'fail' });
    expect(s).toEqual({ stage: 'failed', at: 'uploading', id: null });
    expect(pipelineRunId(s)).toBeNull();
    s = pipelineReduce(s, { type: 'upload' });
    expect(s).toEqual({ stage: 'uploading' });
  });

  it('a failed resume keeps the id and re-enters extracting on retry', () => {
    let s: PipelineState = pipelineReduce({ stage: 'extracting', id: 'ex-2' }, { type: 'fail' });
    expect(s).toEqual({ stage: 'failed', at: 'extracting', id: 'ex-2' });
    s = pipelineReduce(s, { type: 'resume', id: 'ex-2' });
    expect(s).toEqual({ stage: 'extracting', id: 'ex-2' });
  });

  it('a failed price keeps the id and re-enters pricing on retry', () => {
    let s: PipelineState = pipelineReduce({ stage: 'pricing', id: 'ex-3' }, { type: 'fail' });
    expect(s).toEqual({ stage: 'failed', at: 'pricing', id: 'ex-3' });
    s = pipelineReduce(s, { type: 'price' });
    expect(s).toEqual({ stage: 'pricing', id: 'ex-3' });
  });

  it('fail outside a working stage is a no-op', () => {
    const review: PipelineState = { stage: 'review', id: 'ex-1' };
    expect(pipelineReduce(review, { type: 'fail' })).toBe(review);
    expect(pipelineReduce(PIPELINE_IDLE, { type: 'fail' })).toBe(PIPELINE_IDLE);
  });
});

describe('pipelineReduce — resume path', () => {
  it('resumes a persisted id into extracting, then review when unpriced', () => {
    let s: PipelineState = pipelineReduce(PIPELINE_IDLE, { type: 'resume', id: 'ex-9' });
    expect(s).toEqual({ stage: 'extracting', id: 'ex-9' });
    s = pipelineReduce(s, { type: 'loaded', priced: false });
    expect(s).toEqual({ stage: 'review', id: 'ex-9' });
  });

  it('an already-priced run resumes straight into priced', () => {
    const s = pipelineReduce(
      pipelineReduce(PIPELINE_IDLE, { type: 'resume', id: 'ex-9' }),
      { type: 'loaded', priced: true },
    );
    expect(s).toEqual({ stage: 'priced', id: 'ex-9' });
  });

  it('a history tap reopens a different run from any stage', () => {
    const s = pipelineReduce({ stage: 'priced', id: 'ex-1' }, { type: 'resume', id: 'ex-2' });
    expect(s).toEqual({ stage: 'extracting', id: 'ex-2' });
  });

  it('dismiss returns to idle from anywhere', () => {
    expect(pipelineReduce({ stage: 'priced', id: 'ex-1' }, { type: 'dismiss' })).toEqual(
      PIPELINE_IDLE,
    );
    expect(
      pipelineReduce({ stage: 'failed', at: 'pricing', id: 'ex-1' }, { type: 'dismiss' }),
    ).toEqual(PIPELINE_IDLE);
  });

  it('ignores transitions that make no sense', () => {
    expect(pipelineReduce(PIPELINE_IDLE, { type: 'extracted', id: 'ex-1' })).toBe(PIPELINE_IDLE);
    const review: PipelineState = { stage: 'review', id: 'ex-1' };
    expect(pipelineReduce(review, { type: 'priced' })).toBe(review);
    expect(pipelineReduce(review, { type: 'loaded', priced: true })).toBe(review);
    expect(pipelineReduce(review, { type: 'edit' })).toBe(review);
  });
});

// ── 32 MB size guard ────────────────────────────────────────────────────────

const pdf = (over: Partial<PickedFile> = {}): PickedFile => ({
  uri: 'file:///plan.pdf',
  name: 'plan.pdf',
  type: 'application/pdf',
  size: 1024,
  ...over,
});

describe('planPdfProblem', () => {
  it('passes a PDF at or under 32 MB (server rejects only > 32 MB)', () => {
    expect(planPdfProblem(pdf())).toBeNull();
    expect(planPdfProblem(pdf({ size: MAX_PDF_BYTES }))).toBeNull();
  });

  it('passes an unknown size — the server still enforces', () => {
    expect(planPdfProblem(pdf({ size: undefined }))).toBeNull();
  });

  it('rejects over 32 MB before spending signal, naming the limit', () => {
    expect(planPdfProblem(pdf({ size: MAX_PDF_BYTES + 1 }))).toContain('32 MB');
  });

  it('rejects a non-PDF, but lets the .pdf extension rescue a blank MIME', () => {
    expect(planPdfProblem(pdf({ type: 'image/png', name: 'plan.png' }))).toContain('PDF');
    expect(planPdfProblem(pdf({ type: '' }))).toBeNull();
  });
});

// ── Count-edit validation ───────────────────────────────────────────────────

describe('countProblem', () => {
  it('accepts whole non-negative counts, zero included', () => {
    expect(countProblem('0')).toBeNull();
    expect(countProblem('42')).toBeNull();
    expect(countProblem(' 7 ')).toBeNull();
  });

  it('rejects negatives, decimals, blanks and text', () => {
    for (const bad of ['-1', '1.5', '', '   ', 'ten', '1e3', '+2']) {
      expect(countProblem(bad)).not.toBeNull();
    }
  });
});

// ── Row/item converters ─────────────────────────────────────────────────────

describe('rows ↔ items', () => {
  it('round-trips audit fields so the web plan overlay survives a mobile save', () => {
    const rows = itemsToRows([
      {
        type: 'Double GPO',
        symbol: 'GPO2',
        count: 12,
        confidence: 'low',
        note: 'dense kitchen run',
        locations: [{ page: 1, x: 10, y: 20 }],
      },
      { type: 'Downlight', symbol: '', count: 8, confidence: null },
    ]);
    expect(rows[0]?.count).toBe('12');
    expect(rows[1]?.confidence).toBeNull();
    const items = rowsToItems(rows);
    expect(items[0]?.locations).toEqual([{ page: 1, x: 10, y: 20 }]);
    expect(items[0]?.confidence).toBe('low');
    expect(items[0]?.note).toBe('dense kitchen run');
    expect(items[1]?.confidence).toBeUndefined();
  });

  it('drops blank types and coerces unreadable counts to 0 (web parity)', () => {
    const items = rowsToItems([
      { type: '  ', symbol: '', count: '3', confidence: null },
      { type: 'Switch', symbol: '', count: 'x', confidence: null },
    ]);
    expect(items).toEqual([{ type: 'Switch', symbol: '', count: 0 }]);
  });

  it('price items carry count provenance only — no symbols or pins', () => {
    const priceItems = rowsToPriceItems([
      {
        type: 'Double GPO',
        symbol: 'GPO2',
        count: '12',
        confidence: 'low',
        locations: [{ page: 1, x: 10, y: 20 }],
      },
    ]);
    expect(priceItems).toEqual([{ type: 'Double GPO', count: 12, confidence: 'low' }]);
  });
});

describe('effectiveItems / deviceTotal', () => {
  it('prefers saved corrections and tallies devices', () => {
    const items = [{ type: 'GPO', symbol: '', count: 3 }];
    const corrected = [{ type: 'GPO', symbol: '', count: 5 }];
    expect(effectiveItems({ items, corrected_items: corrected })).toBe(corrected);
    expect(effectiveItems({ items, corrected_items: null })).toBe(items);
    expect(effectiveItems({ items: null, corrected_items: null })).toEqual([]);
    expect(deviceTotal(corrected)).toBe(5);
    expect(deviceTotal([])).toBe(0);
  });
});

// ── Price response contract (incl. UNMATCHED) ───────────────────────────────

describe('PriceResponseSchema', () => {
  it('round-trips a priced BOM with unmatched (uncatalogued) lines', () => {
    const parsed = PriceResponseSchema.parse({
      ok: true,
      bom: {
        lines: [
          {
            type: 'Double GPO',
            count: 12,
            matched: 'Double GPO (custom)',
            unitPriceExGst: 38.5,
            materialExGst: 462,
            labourHours: 3,
            labourExGst: 330,
            lineExGst: 792,
            trace: {},
          },
        ],
        unmatched: [{ type: 'Ceiling fan', count: 2 }],
        materialExGst: 462,
        labourExGst: 330,
        labourFloorAddedExGst: 0,
        subtotalExGst: 792,
        gstExGst: 79.2,
        totalIncGst: 871.2,
        gstRegistered: true,
        assumptions: { hourlyRate: 110, markupPct: 20, minLabourHours: 2 },
      },
      catalogueSize: 34,
      pricingBookSource: 'tenant_book',
      persisted: true,
    });
    expect(parsed.bom.unmatched).toEqual([{ type: 'Ceiling fan', count: 2 }]);
    expect(parsed.bom.totalIncGst).toBe(871.2);
  });

  it('rejects the ok:false envelope so errors surface instead of reading empty', () => {
    expect(PriceResponseSchema.safeParse({ ok: false, error: 'invalid_json' }).success).toBe(false);
  });
});
