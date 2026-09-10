import { PDFDocument } from 'pdf-lib';
import { assertStudioActive, assertStudioPng, StudioCarouselSchema, studioRenderBody, STUDIO_HEIGHT, STUDIO_WIDTH, type StudioSlide } from './studio-contract';

/** Create all five pages before exposing any file. No browser canvas/HTML or AI. */
export async function createStudioPdf(slides: StudioSlide[], render: (slide: StudioSlide, index: number) => Promise<Uint8Array>, signal?: AbortSignal): Promise<Uint8Array> {
  const snapshot = StudioCarouselSchema.parse(slides);
  snapshot.forEach(studioRenderBody);
  const pdf = await PDFDocument.create();
  pdf.setTitle('QuoteMax carousel');
  pdf.setCreator('QuoteMax Mobile Brand Studio');
  for (let index = 0; index < snapshot.length; index++) {
    assertStudioActive(signal);
    const bytes = await render(snapshot[index]!, index);
    assertStudioActive(signal);
    assertStudioPng(bytes);
    const image = await pdf.embedPng(bytes);
    if (image.width !== STUDIO_WIDTH || image.height !== STUDIO_HEIGHT) throw new Error('Studio image dimensions changed. No PDF was exported.');
    pdf.addPage([STUDIO_WIDTH, STUDIO_HEIGHT]).drawImage(image, { x: 0, y: 0, width: STUDIO_WIDTH, height: STUDIO_HEIGHT });
  }
  assertStudioActive(signal);
  const bytes = await pdf.save();
  assertStudioActive(signal);
  return bytes;
}
