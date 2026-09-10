import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { createStudioPdf } from './studio-pdf';
import { DEFAULT_CAROUSEL } from './studio-presets';
const pngs = DEFAULT_CAROUSEL.map((slide, index) => new Uint8Array(readFileSync(join(process.cwd(), `specs/audits/evidence/studio-c24/slide-${index + 1}-${slide.kind}.png`))));
it('embeds all five real rendered PNGs in rail order at full declared dimensions', async () => {
  const seen: string[] = [];
  const bytes = await createStudioPdf(DEFAULT_CAROUSEL, async (slide, index) => { seen.push(slide.kind); return pngs[index]!; });
  const pdf = await PDFDocument.load(bytes);
  expect(seen).toEqual(['stat', 'list', 'steps', 'quote', 'cta']);
  expect(pdf.getPageCount()).toBe(5);
  expect(pdf.getPages().map(page => [page.getWidth(), page.getHeight()])).toEqual(Array(5).fill([1080, 1350]));
  expect(bytes.length).toBeGreaterThan(1_000_000);
});
it('validates every custom slide before the first render and exposes no partial PDF on page failure', async () => {
  const render = jest.fn(async (_slide, index: number) => pngs[index]!);
  await expect(createStudioPdf([...DEFAULT_CAROUSEL.slice(0, 4), { kind: 'cta', h: '中文', btn: '' }], render)).rejects.toThrow(/character/);
  expect(render).not.toHaveBeenCalled();
  render.mockImplementation(async (_slide, index) => { if (index === 2) throw new Error('page 3 failed'); return pngs[index]!; });
  await expect(createStudioPdf(DEFAULT_CAROUSEL, render)).rejects.toThrow('page 3 failed');
  expect(render).toHaveBeenCalledTimes(3);
});
it('uses an immutable snapshot and aborts before rendering the next page', async () => {
  const slides = JSON.parse(JSON.stringify(DEFAULT_CAROUSEL)); const controller = new AbortController();
  const render = jest.fn(async (_slide, index: number) => { slides[1].h = 'Changed later'; controller.abort(); return pngs[index]!; });
  await expect(createStudioPdf(slides, render, controller.signal)).rejects.toThrow();
  expect(render).toHaveBeenCalledTimes(1); expect(DEFAULT_CAROUSEL[1]).not.toMatchObject({ h: 'Changed later' });
});
