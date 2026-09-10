import {
  convertBlock,
  inlineText,
  removeBlock,
  replaceBlock,
  replaceReportText,
  ReportDocSchema,
  ReportStyleSchema,
  toggleReportMark,
  type ReportDoc,
} from './report-editor';

it('formats only the selected words and retains the rest of the rich text', () => {
  const runs = [
    { text: 'Inspect ' },
    { text: 'supply', marks: ['italic' as const] },
    { text: ' first' },
  ];
  const marked = toggleReportMark(runs, { start: 8, end: 14 }, 'bold');
  expect(marked).toEqual([
    { text: 'Inspect ' },
    { text: 'supply', marks: ['bold', 'italic'] },
    { text: ' first' },
  ]);
  expect(toggleReportMark(marked, { start: 8, end: 14 }, 'bold')).toEqual(runs);
  expect(inlineText(marked)).toBe('Inspect supply first');
});

it('preserves marks through text insertion, deletion and replacement', () => {
  const runs = [{ text: 'Inspect', marks: ['bold' as const] }, { text: ' supply' }];
  expect(replaceReportText(runs, 'Inspect all supply')).toEqual([
    { text: 'Inspect', marks: ['bold'] },
    { text: ' all supply' },
  ]);
  expect(replaceReportText(runs, 'Test supply')).toEqual([
    { text: 'Test', marks: ['bold'] },
    { text: ' supply' },
  ]);
  expect(replaceReportText(runs, 'Inspect')).toEqual([{ text: 'Inspect', marks: ['bold'] }]);
});

it('keeps the pricing marker locked and rejects documents with missing or repeated pricing', () => {
  const doc: ReportDoc = {
    version: 1,
    blocks: [{ type: 'paragraph', content: [{ text: 'Scope' }] }, { type: 'pricing' }],
  };
  expect(() => removeBlock(doc, 1)).toThrow('locked');
  expect(() => replaceBlock(doc, 1, { type: 'title', content: [] })).toThrow('locked');
  expect(() => convertBlock(doc.blocks[1]!, 'heading')).toThrow('locked');
  expect(
    ReportDocSchema.safeParse({ version: 1, blocks: [{ type: 'paragraph', content: [] }] }).success,
  ).toBe(false);
  expect(
    ReportDocSchema.safeParse({ version: 1, blocks: [{ type: 'pricing' }, { type: 'pricing' }] })
      .success,
  ).toBe(false);
  expect(ReportDocSchema.parse(doc)).toEqual(doc);
});

it('retains formatting when changing a bullet list into a heading and rejects unapproved branding', () => {
  expect(
    convertBlock(
      { type: 'bulletList', items: [[{ text: 'One', marks: ['underline'] }], [{ text: 'Two' }]] },
      'heading',
    ),
  ).toEqual({
    type: 'heading',
    content: [{ text: 'One', marks: ['underline'] }, { text: '\nTwo' }],
  });
  expect(
    ReportStyleSchema.safeParse({ accentColor: '#FF5F00', fontFamily: 'mono', headingStyle: 'bar' })
      .success,
  ).toBe(true);
  expect(ReportStyleSchema.safeParse({ accentColor: 'url(https://foreign.test/x)' }).success).toBe(
    false,
  );
  expect(ReportStyleSchema.safeParse({ logoPath: 'branding/../../private' }).success).toBe(false);
});
