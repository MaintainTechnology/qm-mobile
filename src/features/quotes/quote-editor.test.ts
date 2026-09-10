import {
  applyProposedTiers,
  editableTiers,
  editorInputIdentity,
  newManualLine,
  quoteEditPayload,
  QuoteEditorValidationError,
} from './quote-editor';

const source = {
  better: {
    label: 'Re-roof',
    timeframe: 'Two days',
    line_items: [
      {
        description: 'Roof material',
        quantity: 12.5,
        unit_price_ex_gst: 0,
        unit: 'm²',
        source: 'owned-item',
        supplied_by: 'customer',
        safety_note: 'Verify roof access',
      },
    ],
  },
};

it('preserves supplier/safety/unit/timeframe through manual edits and requests a quiet versioned save', () => {
  const tiers = editableTiers(source);
  tiers.better!.lines[0]!.description = 'Customer supplied roof material';
  tiers.better!.lines[0]!.quantity = '14.25';
  const body = quoteEditPayload(tiers, 'a'.repeat(64));
  expect(body).toMatchObject({
    expected_revision: 'a'.repeat(64),
    notify_customer: false,
    better: {
      timeframe: 'Two days',
      line_items: [
        {
          description: 'Customer supplied roof material',
          quantity: 14.25,
          unit_price_ex_gst: 0,
          original_line_index: 0,
          unit: 'm²',
          source: 'owned-item',
          supplied_by: 'customer',
          safety_note: 'Verify roof access',
        },
      ],
    },
  });
  expect(body).not.toHaveProperty('force');
  expect(body.better?.line_items[0]).not.toHaveProperty('total_ex_gst');
  expect(source.better.line_items[0]?.description).toBe('Roof material');
});

it('does not fabricate missing or new-line amounts and blocks deleting the last line', () => {
  const tiers = editableTiers(source);
  tiers.better!.lines = [newManualLine('new')];
  expect(() => quoteEditPayload(tiers, 'a'.repeat(64))).toThrow(QuoteEditorValidationError);
  tiers.better!.lines = [];
  expect(() => quoteEditPayload(tiers, 'a'.repeat(64))).toThrow('keep at least one line item');
});

it.each(['', '-1', 'Infinity', '1e4', '1,200', 'abc'])(
  'rejects an invalid price %s without substituting a price',
  price => {
    const tiers = editableTiers(source);
    tiers.better!.lines[0]!.price = price;
    expect(() => quoteEditPayload(tiers, 'a'.repeat(64))).toThrow(QuoteEditorValidationError);
  },
);

it('invalidates a proposal identity after any working-copy or server revision change', () => {
  const tiers = editableTiers(source);
  const before = editorInputIdentity(tiers, 'version-1');
  tiers.better!.lines[0]!.quantity = '13';
  expect(editorInputIdentity(tiers, 'version-1')).not.toBe(before);
  expect(editorInputIdentity(editableTiers(source), 'version-2')).not.toBe(before);
});

it('requires a server revision before saving', () => {
  expect(() => quoteEditPayload(editableTiers(source), 'unversioned')).toThrow('Reload this quote');
});

it('preserves persisted line identity when an AI proposal reorders existing lines', () => {
  const original = editableTiers(source);
  const proposed = applyProposedTiers(original, {
    better: {
      label: 'Changed',
      line_items: [
        {
          description: 'Moved existing line',
          original_line_index: 4,
          quantity: 2,
          unit_price_ex_gst: 15.25,
          source: 'owned-item',
          supplied_by: 'customer',
          safety_note: 'Keep safe',
        },
        {
          description: 'New proposed line',
          quantity: 1,
          unit_price_ex_gst: 3.25,
          source: 'catalogue-id',
        },
      ],
    },
  });
  const body = quoteEditPayload(proposed, 'b'.repeat(64));
  expect(body.better?.line_items[0]).toMatchObject({
    original_line_index: 4,
    supplied_by: 'customer',
    safety_note: 'Keep safe',
  });
  expect(body.better?.line_items[1]).not.toHaveProperty('original_line_index');
  expect(body.better?.line_items[1]?.source).toBe('catalogue-id');
  expect(original).toEqual(editableTiers(source));
  expect(() => applyProposedTiers(original, { better: null })).toThrow(
    'cannot remove a complete tier',
  );
});
