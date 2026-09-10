import { z } from 'zod';

/** Exact stored ReportDoc v1 contract; customer prices are a data-free locked marker. */
export const REPORT_MARKS = ['bold', 'italic', 'underline', 'highlight'] as const;
export type ReportMark = (typeof REPORT_MARKS)[number];
const RunSchema = z.object({
  text: z.string().max(5000),
  marks: z.array(z.enum(REPORT_MARKS)).optional(),
});
const InlineSchema = z.array(RunSchema);
const ContentBlockSchema = z.object({
  type: z.enum(['title', 'heading', 'paragraph']),
  content: InlineSchema,
});
export const ReportDocSchema = z
  .object({
    version: z.literal(1),
    blocks: z
      .array(
        z.discriminatedUnion('type', [
          ContentBlockSchema,
          z.object({ type: z.literal('bulletList'), items: z.array(InlineSchema) }),
          z.object({ type: z.literal('pricing') }),
        ]),
      )
      .max(300),
  })
  .refine(
    doc => doc.blocks.filter(block => block.type === 'pricing').length === 1,
    'Keep exactly one locked pricing section.',
  );
export type ReportDoc = z.infer<typeof ReportDocSchema>;
export type ReportRun = z.infer<typeof RunSchema>;
export type ReportBlock = ReportDoc['blocks'][number];
export const REPORT_ACCENTS = ['#FF5F00', '#0F1722', '#2563EB', '#16A34A', '#9333EA'] as const;
export const ReportStyleSchema = z.object({
  fontFamily: z.enum(['system', 'serif', 'sans', 'mono']).optional(),
  accentColor: z.enum(REPORT_ACCENTS).optional(),
  headingStyle: z.enum(['plain', 'underline', 'bar']).optional(),
  logoPath: z
    .string()
    .regex(/^branding\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/)
    .optional(),
});
export type ReportStyle = z.infer<typeof ReportStyleSchema>;
export type TextRange = { start: number; end: number };

export function inlineText(runs: ReportRun[]) {
  return runs.map(run => run.text).join('');
}
function canonicalMarks(marks: readonly ReportMark[]) {
  return REPORT_MARKS.filter(mark => marks.includes(mark));
}
function pack(runs: ReportRun[]): ReportRun[] {
  const packed: ReportRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const marks = canonicalMarks(run.marks ?? []);
    const last = packed[packed.length - 1];
    if (last && JSON.stringify(last.marks ?? []) === JSON.stringify(marks)) last.text += run.text;
    else packed.push(marks.length ? { text: run.text, marks } : { text: run.text });
  }
  return packed;
}
function rangeWithin(range: TextRange, length: number): TextRange {
  return {
    start: Math.min(length, Math.max(0, Math.trunc(range.start))),
    end: Math.min(length, Math.max(range.start, Math.trunc(range.end))),
  };
}
function sliceRuns(runs: ReportRun[], start: number, end: number): ReportRun[] {
  let offset = 0;
  const out: ReportRun[] = [];
  for (const run of runs) {
    const first = Math.max(0, start - offset);
    const last = Math.min(run.text.length, end - offset);
    if (last > first)
      out.push({
        ...run,
        text: run.text.slice(first, last),
        ...(run.marks ? { marks: [...run.marks] } : {}),
      });
    offset += run.text.length;
  }
  return out;
}
/** Change marks only in the selected range; neighbouring runs retain their metadata. */
export function toggleReportMark(
  runs: ReportRun[],
  selection: TextRange,
  mark: ReportMark,
): ReportRun[] {
  const text = inlineText(runs);
  const range = rangeWithin(selection, text.length);
  if (range.start === range.end) return runs;
  const selected = sliceRuns(runs, range.start, range.end);
  const remove = selected.every(run => run.marks?.includes(mark));
  return pack([
    ...sliceRuns(runs, 0, range.start),
    ...selected.map(run => ({
      ...run,
      marks: remove
        ? (run.marks ?? []).filter(value => value !== mark)
        : canonicalMarks([...(run.marks ?? []), mark]),
    })),
    ...sliceRuns(runs, range.end, text.length),
  ]);
}
/** Native input exposes plain text; preserve runs outside the changed span instead of flattening formatting. */
export function replaceReportText(
  runs: ReportRun[],
  next: string,
  typingMarks?: ReportMark[],
): ReportRun[] {
  const before = inlineText(runs);
  if (before === next) return runs;
  let start = 0;
  while (start < before.length && start < next.length && before[start] === next[start]) start++;
  let oldEnd = before.length;
  let newEnd = next.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === next[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const inherited = sliceRuns(runs, Math.max(0, start - 1), Math.max(1, start))[0]?.marks ?? [];
  return pack([
    ...sliceRuns(runs, 0, start),
    { text: next.slice(start, newEnd), marks: typingMarks ?? inherited },
    ...sliceRuns(runs, oldEnd, before.length),
  ]);
}

export function replaceBlock(doc: ReportDoc, index: number, block: ReportBlock): ReportDoc {
  if (!doc.blocks[index] || doc.blocks[index]?.type === 'pricing' || block.type === 'pricing')
    throw new Error('The pricing section is locked.');
  return {
    version: 1,
    blocks: doc.blocks.map((existing, at) => (at === index ? block : existing)),
  };
}
export function removeBlock(doc: ReportDoc, index: number): ReportDoc {
  if (doc.blocks[index]?.type === 'pricing') throw new Error('The pricing section is locked.');
  return { version: 1, blocks: doc.blocks.filter((_, at) => at !== index) };
}
export function convertBlock(
  block: ReportBlock,
  type: 'title' | 'heading' | 'paragraph' | 'bulletList',
): ReportBlock {
  if (block.type === 'pricing') throw new Error('The pricing section is locked.');
  const lines = block.type === 'bulletList' ? block.items : [block.content];
  if (type === 'bulletList') return { type, items: lines.length ? lines : [[]] };
  return {
    type,
    content: pack(lines.flatMap((line, index) => (index ? [{ text: '\n' }, ...line] : line))),
  };
}
