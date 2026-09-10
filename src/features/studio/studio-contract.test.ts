import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CAROUSEL, STUDIO_PHOTOS } from './studio-presets';
import { assertStudioPng, replaceStudioSlide, StudioDraftSlideSchema, StudioSlideSchema, StudioCarouselSchema, studioRenderBody, studioPngDataUri } from './studio-contract';

const realPng = () => new Uint8Array(readFileSync(join(process.cwd(), 'specs/audits/evidence/studio-c24/slide-1-stat.png')));
it('keeps the five fixed slide kinds in order and changes only the selected slide', () => {
  const slides = StudioCarouselSchema.parse(DEFAULT_CAROUSEL);
  const changed = replaceStudioSlide(slides, 3, { ...slides[3]!, kind: 'quote', quote: 'My own testimonial', attrib: ['Sample'] });
  expect(changed[3]).toMatchObject({ quote: 'My own testimonial' });
  for (const index of [0, 1, 2, 4]) expect(changed[index]).toBe(slides[index]);
  expect(() => replaceStudioSlide(slides, 0, changed[3]!)).toThrow();
  expect(StudioCarouselSchema.safeParse([...slides].reverse()).success).toBe(false);
});
it('accepts exactly the established photo gallery or None', () => {
  for (const id of STUDIO_PHOTOS) expect(StudioSlideSchema.safeParse({ ...DEFAULT_CAROUSEL[0], photo: { src: `/studio/photos/${id}.png` } }).success).toBe(true);
  for (const src of ['/studio/photos/../secret.png', 'https://example.test/image.png', '/studio/photos/new.png'])
    expect(StudioSlideSchema.safeParse({ ...DEFAULT_CAROUSEL[0], photo: { src } }).success).toBe(false);
  expect(StudioSlideSchema.safeParse({ ...DEFAULT_CAROUSEL[0], photo: null }).success).toBe(true);
});
it('retains unsupported custom copy for editing but rejects rendering without modifying it', () => {
  const slide = { kind: 'quote' as const, quote: 'Customer copy 🛠️', attrib: [] };
  expect(StudioDraftSlideSchema.parse(slide)).toMatchObject({ quote: slide.quote });
  expect(() => studioRenderBody(slide)).toThrow(/character/);
  expect(slide.quote).toBe('Customer copy 🛠️');
  DEFAULT_CAROUSEL.forEach(slide => expect(JSON.parse(studioRenderBody(slide)).format).toBe('li-carousel'));
});
it('enforces exact fields, tuple counts, field limits and UTF8 request size', () => {
  expect(StudioSlideSchema.safeParse({ ...DEFAULT_CAROUSEL[0], projectId: 'extra' }).success).toBe(false);
  expect(StudioSlideSchema.safeParse({ kind: 'list', h: '', cards: [['one', 'two']] }).success).toBe(false);
  expect(StudioSlideSchema.safeParse({ kind: 'quote', quote: 'x'.repeat(501), attrib: [] }).success).toBe(false);
  expect(() => studioRenderBody({ kind: 'quote', quote: 'é'.repeat(500), attrib: Array(6).fill('é'.repeat(500)), eyebrow: Array(6).fill('é'.repeat(500)), bar: Array(6).fill('é'.repeat(500)) })).toThrow(/too much text/);
});
it('validates the actual rendered PNG and produces exact base64 without a Buffer runtime dependency', () => {
  const bytes = realPng(); expect(() => assertStudioPng(bytes)).not.toThrow();
  expect(studioPngDataUri(bytes)).toBe(`data:image/png;base64,${Buffer.from(bytes).toString('base64')}`);
});
it('rejects partial, corrupt and unexpected-dimension PNGs before preview or sharing', () => {
  const bytes = realPng();
  expect(() => assertStudioPng(bytes.slice(0, -12))).toThrow();
  const corrupt = bytes.slice(); corrupt[48] = corrupt[48]! ^ 1;
  expect(() => assertStudioPng(corrupt)).toThrow(/corrupt/);
  const dimensions = bytes.slice(); dimensions[19] = 0;
  expect(() => assertStudioPng(dimensions)).toThrow(/dimensions/);
});
