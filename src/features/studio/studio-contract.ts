import { z } from 'zod';
import { STUDIO_PHOTOS } from './studio-presets';

// Exact BE10 server contract. Defensive bounds remain pending DEC04 approval;
// they are not provider quotas or guarantees that every long line fits a slide.
export const STUDIO_WIDTH = 1080;
export const STUDIO_HEIGHT = 1350;
export const STUDIO_COPY_BYTES = 16_384;
export const STUDIO_TEXT_LENGTH = 500;
export const STUDIO_LIST_LENGTH = 6;
export const STUDIO_PNG_BYTES = STUDIO_WIDTH * STUDIO_HEIGHT * 4 + 65_536;
export const STUDIO_KINDS = ['stat', 'list', 'steps', 'quote', 'cta'] as const;
export const STUDIO_LABELS = ['Cover', 'Benefits', 'Steps', 'Testimonial', 'CTA'] as const;
/** RN's installed AbortController polyfill does not implement throwIfAborted. */
export function assertStudioActive(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('Studio export was interrupted. Your edits are still here.');
}
const assets = new Set<string>(STUDIO_PHOTOS.map(id => `/studio/photos/${id}.png`));
const extra = new Set([258, 305, 338, 339, 710, 730, 732, 8211, 8212, 8216, 8217, 8218, 8220, 8221, 8222, 8226, 8230, 8249, 8250, 8260, 8364, 8482, 8593, 8595, 8722, 8725]);
export function studioLocalGlyphs(value: string): boolean {
  return Array.from(value + value.toUpperCase()).every(char => {
    const code = char.codePointAt(0)!;
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255) || extra.has(code);
  });
}
function slideSchema(render: boolean) {
  const raw = z.string().max(STUDIO_TEXT_LENGTH);
  const text = render ? raw.refine(studioLocalGlyphs, 'This text includes a character not supported by the Studio fonts.') : raw;
  const button = render ? raw.refine(value => studioLocalGlyphs(value.replaceAll('→', '')), 'This button includes an unsupported character.') : raw;
  const labels = z.array(text).max(STUDIO_LIST_LENGTH);
  const photo = z.object({ src: z.string().refine(src => assets.has(src)),
    pos: z.enum(['center', 'center 28%', 'center 36%', 'right 20%']).optional(),
    scrim: z.enum(['top', 'left', 'faint']).optional() }).strict().nullable().optional();
  const chrome = { photo, eyebrow: labels.optional(), bar: labels.optional() };
  return z.discriminatedUnion('kind', [
    z.object({ ...chrome, kind: z.literal('stat'), lines: z.array(z.tuple([text, text])).length(3), sub: text.optional(), proof: labels.optional() }).strict(),
    z.object({ ...chrome, kind: z.literal('list'), h: text, cards: z.array(z.tuple([text, text])).length(3), sub: text.optional() }).strict(),
    z.object({ ...chrome, kind: z.literal('steps'), h: text, steps: z.array(z.tuple([text, text, text])).length(3) }).strict(),
    z.object({ ...chrome, kind: z.literal('quote'), quote: text, attrib: labels }).strict(),
    z.object({ ...chrome, kind: z.literal('cta'), h: text, sub: text.optional(), btn: button, foot: labels.optional() }).strict(),
  ]);
}
export const StudioSlideSchema = slideSchema(true);
// Invalid font characters remain editable/recoverable locally; the render
// schema rejects them without changing custom copy or calling the server.
export const StudioDraftSlideSchema = slideSchema(false);
export type StudioSlide = z.infer<typeof StudioDraftSlideSchema>;
export const StudioCarouselSchema = z.array(StudioDraftSlideSchema).length(5)
  .refine(slides => slides.every((slide, index) => slide.kind === STUDIO_KINDS[index]));
export const StudioDraftSchema = z.object({ slides: StudioCarouselSchema, selected: z.number().int().min(0).max(4) }).strict();
export type StudioDraft = z.infer<typeof StudioDraftSchema>;
export function replaceStudioSlide(slides: StudioSlide[], index: number, next: StudioSlide): StudioSlide[] {
  if (!Number.isInteger(index) || next.kind !== STUDIO_KINDS[index]) throw new Error('Invalid Studio slide selection.');
  const parsed = StudioDraftSlideSchema.parse(next);
  return slides.map((slide, current) => current === index ? parsed : slide);
}
export function studioRenderBody(slide: StudioSlide): string {
  const value = StudioSlideSchema.safeParse(slide);
  if (!value.success) throw new Error(value.error.issues[0]?.message ?? 'Review this slide before rendering.');
  const body = JSON.stringify({ format: 'li-carousel', slide: value.data });
  if (new TextEncoder().encode(body).length > STUDIO_COPY_BYTES) throw new Error('This slide has too much text. Shorten the copy before previewing or exporting.');
  return body;
}
export function assertStudioPng(bytes: Uint8Array): void {
  if (bytes.length < 45 || bytes.length > STUDIO_PNG_BYTES ||
      ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte))
    throw new Error('Studio returned an invalid PNG. Your edits are still here.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452 ||
      view.getUint32(16) !== STUDIO_WIDTH || view.getUint32(20) !== STUDIO_HEIGHT ||
      view.getUint32(bytes.length - 12) !== 0 || view.getUint32(bytes.length - 8) !== 0x49454e44)
    throw new Error('Studio returned an incomplete image or unexpected dimensions. Your edits are still here.');
  let offset = 8, imageData = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('Studio returned an incomplete PNG.');
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - 12) throw new Error('Studio returned an incomplete PNG.');
    let crc = 0xffffffff;
    for (let index = offset + 4; index < offset + length + 8; index++)
      crc = PNG_CRC[(crc ^ bytes[index]!) & 0xff]! ^ (crc >>> 8);
    if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(offset + length + 8)) throw new Error('Studio returned a corrupt PNG.');
    if (view.getUint32(offset + 4) === 0x49444154 && length > 0) imageData = true;
    offset += length + 12;
  }
  if (!imageData) throw new Error('Studio returned a PNG without image data.');
}
const PNG_CRC = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
export function studioPngDataUri(bytes: Uint8Array): string {
  assertStudioPng(bytes);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 12_288) {
    let chunk = '';
    const end = Math.min(bytes.length, offset + 12_288);
    for (let index = offset; index < end; index += 3) {
      const a = bytes[index]!, b = bytes[index + 1] ?? 0, c = bytes[index + 2] ?? 0;
      chunk += alphabet[a >> 2]! + alphabet[((a & 3) << 4) | (b >> 4)]! +
        (index + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') +
        (index + 2 < bytes.length ? alphabet[c & 63] : '=');
    }
    chunks.push(chunk);
  }
  return `data:image/png;base64,${chunks.join('')}`;
}
