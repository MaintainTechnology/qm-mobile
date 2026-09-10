import { assertBusinessMediaImage } from './business-media-image-info';
import type { BusinessMediaMime } from './business-media-policy';

const join = (...parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
const ascii = (value: string) => Uint8Array.from(value, char => char.charCodeAt(0));
const be16 = (value: number) => Uint8Array.of(value >>> 8, value & 255);
const be32 = (value: number) => Uint8Array.of(value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
const le16 = (value: number) => Uint8Array.of(value & 255, value >>> 8);
const le24 = (value: number) => Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255);
const le32 = (value: number) => Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, value >>> 24);
const dimensions = { width: 32, height: 16 };

// Deliberately minimal header fixtures: these test the bounded structural
// guard, not successful pixel decoding (the actual sharp/server suite does that).
const pngChunk = (kind: string, bytes = new Uint8Array()) => join(be32(bytes.length), ascii(kind), bytes, new Uint8Array(4));
const pngHeader = (width = 32, height = 16) => join(be32(width), be32(height), Uint8Array.of(8, 2, 0, 0, 0));
const png = (width = 32, height = 16, extra = new Uint8Array()) => join(
  Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), pngChunk('IHDR', pngHeader(width, height)),
  extra, pngChunk('IDAT', Uint8Array.of(120, 156)), pngChunk('IEND'),
);
const jpegSegment = (marker: number, bytes: Uint8Array) => join(Uint8Array.of(255, marker), be16(bytes.length + 2), bytes);
const sof = (width = 32, height = 16, marker = 192) => jpegSegment(marker,
  join(Uint8Array.of(8), be16(height), be16(width), Uint8Array.of(3, 1, 17, 0, 2, 17, 0, 3, 17, 0)));
const sos = () => jpegSegment(218, Uint8Array.of(3, 1, 0, 2, 17, 3, 17, 0, 63, 0));
const jpeg = (width = 32, height = 16, marker = 192, extra = new Uint8Array()) =>
  join(Uint8Array.of(255, 216), extra, sof(width, height, marker), sos(), Uint8Array.of(0, 255, 217));
const riffChunk = (kind: string, bytes: Uint8Array) => join(ascii(kind), le32(bytes.length), bytes, new Uint8Array(bytes.length % 2));
const riff = (...chunks: Uint8Array[]) => {
  const data = join(ascii('WEBP'), ...chunks);
  return join(ascii('RIFF'), le32(data.length), data);
};
const vp8 = (width = 32, height = 16) => riffChunk('VP8 ', join(Uint8Array.of(0, 0, 0, 157, 1, 42), le16(width), le16(height)));
const vp8l = (width = 32, height = 16, extraBits = 0) => riffChunk('VP8L',
  join(Uint8Array.of(47), le32((width - 1) + ((height - 1) << 14) + extraBits)));
const vp8x = (width = 32, height = 16, flags = 0) => riffChunk('VP8X',
  join(Uint8Array.of(flags, 0, 0, 0), le24(width - 1), le24(height - 1)));

describe('business image bounded native preview guard', () => {
  it.each([
    ['PNG', () => png(), 'image/png'],
    ['baseline JPEG', () => jpeg(), 'image/jpeg'],
    ['progressive JPEG', () => jpeg(32, 16, 194), 'image/jpeg'],
    ['WebP VP8', () => riff(vp8()), 'image/webp'],
    ['WebP VP8L', () => riff(vp8l()), 'image/webp'],
    ['WebP VP8X with alpha', () => riff(vp8x(32, 16, 16), riffChunk('ALPH', Uint8Array.of(0)), vp8()), 'image/webp'],
    ['WebP VP8X lossless', () => riff(vp8x(), vp8l()), 'image/webp'],
  ] as const)('accepts matching encoded and picked dimensions for %s', (_name, make, mime) => {
    expect(() => assertBusinessMediaImage(make(), mime, dimensions)).not.toThrow();
    expect(() => assertBusinessMediaImage(make(), mime, { width: 16, height: 32 })).not.toThrow();
  });
  it('accepts a real 1px PNG fixture and a Uint8Array slice with nonzero offset', () => {
    const bytes = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9sAAAAASUVORK5CYII=', 'base64'));
    expect(() => assertBusinessMediaImage(bytes, 'image/png', { width: 1, height: 1 })).not.toThrow();
    const wrapped = join(Uint8Array.of(9, 8, 7), png(), Uint8Array.of(1, 2));
    expect(() => assertBusinessMediaImage(wrapped.subarray(3, wrapped.length - 2), 'image/png', dimensions)).not.toThrow();
  });
  it.each([
    {}, { width: 32 }, { width: 0, height: 16 }, { width: -1, height: 16 },
    { width: 32.1, height: 16 }, { width: Number.NaN, height: 16 }, { width: 32, height: Infinity },
    { width: 8193, height: 1 }, { width: 4097, height: 4096 }, { width: 15, height: 32 },
  ])('rejects missing, invalid, excessive or mismatched picker dimensions %p', value => {
    expect(() => assertBusinessMediaImage(png(), 'image/png', value)).toThrow('supported dimensions');
  });
  it.each([
    ['PNG', png, 'image/png'], ['JPEG', jpeg, 'image/jpeg'],
    ['VP8', (w: number, h: number) => riff(vp8(w, h)), 'image/webp'],
    ['VP8L', (w: number, h: number) => riff(vp8l(w, h)), 'image/webp'],
    ['VP8X', (w: number, h: number) => riff(vp8x(w, h), vp8(w, h)), 'image/webp'],
  ] as const)('%s encoded dimensions cannot exceed bounds or trust smaller picker metadata', (_name, make, mime) => {
    for (const [width, height] of [[8193, 1], [1, 8193], [4097, 4096]])
      expect(() => assertBusinessMediaImage(make(width!, height!), mime, dimensions)).toThrow();
    for (const [width, height] of [[8192, 2048], [4096, 4096]])
      expect(() => assertBusinessMediaImage(make(width!, height!), mime, { width, height })).not.toThrow();
  });
  it.each(['image/png', 'image/jpeg', 'image/webp'] as const)('rejects foreign content declared as %s', mime => {
    for (const bytes of [ascii('<svg width="100000" height="100000"/>'), ascii('%PDF-1.7'), ascii('GIF89a'), new Uint8Array()])
      expect(() => assertBusinessMediaImage(bytes, mime, dimensions)).toThrow();
  });
  it('rejects supported-format MIME mismatch before preview', () => {
    expect(() => assertBusinessMediaImage(png(), 'image/jpeg', dimensions)).toThrow();
    expect(() => assertBusinessMediaImage(jpeg(), 'image/webp', dimensions)).toThrow();
    expect(() => assertBusinessMediaImage(riff(vp8()), 'image/png', dimensions)).toThrow();
    expect(() => assertBusinessMediaImage(png(), 'image/svg+xml' as BusinessMediaMime, dimensions)).toThrow();
  });
  it.each(['acTL', 'fcTL', 'fdAT'])('rejects PNG animation chunk %s wherever it occurs', kind => {
    expect(() => assertBusinessMediaImage(png(32, 16, pngChunk(kind)), 'image/png', dimensions)).toThrow();
    const bytes = png();
    expect(() => assertBusinessMediaImage(join(bytes.subarray(0, bytes.length - 12), pngChunk(kind), pngChunk('IEND')), 'image/png', dimensions)).toThrow();
  });
  it('does not mistake animation marker text inside an ancillary PNG payload for a chunk', () => {
    expect(() => assertBusinessMediaImage(png(32, 16, pngChunk('tEXt', ascii('acTL'))), 'image/png', dimensions)).not.toThrow();
  });
  it('rejects malformed PNG chunk structure and repeated IHDR', () => {
    const bytes = png();
    const hugeLength = bytes.slice(); hugeLength.set(be32(0xffffffff), 33);
    const wrongHeader = bytes.slice(); wrongHeader.set(be32(12), 8);
    for (const bad of [bytes.subarray(0, 30), bytes.subarray(0, bytes.length - 1), join(bytes, Uint8Array.of(0)), hugeLength, wrongHeader,
      png(32, 16, pngChunk('IHDR', pngHeader()))]) expect(() => assertBusinessMediaImage(bad, 'image/png', dimensions)).toThrow();
  });
  it('walks bounded JPEG APP segments/fill bytes without trusting an embedded thumbnail header', () => {
    const app = jpegSegment(225, join(ascii('Exif\0\0'), sof(10000, 10000)));
    expect(() => assertBusinessMediaImage(jpeg(32, 16, 192, app), 'image/jpeg', dimensions)).not.toThrow();
    expect(() => assertBusinessMediaImage(jpeg(32, 16, 192, join(Uint8Array.of(255), app)), 'image/jpeg', dimensions)).not.toThrow();
  });
  it('rejects JPEG segment overrun, absent/repeated SOF, zero-length segments and truncated markers', () => {
    for (const bytes of [
      Uint8Array.of(255, 216, 255), join(Uint8Array.of(255, 216, 255, 225), be16(65535)),
      Uint8Array.of(255, 216, 255, 225, 0, 0), Uint8Array.of(255, 216, 255, 225, 0, 1),
      join(Uint8Array.of(255, 216), sos()), jpeg(32, 16, 192, sof()),
      join(Uint8Array.of(255, 216), sof().subarray(0, 10)),
      join(Uint8Array.of(255, 216), jpegSegment(192, Uint8Array.of(8, 0, 16, 0, 32, 255))),
    ]) expect(() => assertBusinessMediaImage(bytes, 'image/jpeg', dimensions)).toThrow();
  });
  it('rejects animated WebP flag, ANIM and ANMF even with plausible static frame headers', () => {
    for (const bytes of [riff(vp8x(32, 16, 2), vp8()), riff(vp8(), riffChunk('ANIM', new Uint8Array(6))),
      riff(riffChunk('ANMF', new Uint8Array(16)), vp8())])
      expect(() => assertBusinessMediaImage(bytes, 'image/webp', dimensions)).toThrow();
  });
  it('rejects malformed WebP container/frame layouts and conflicting canvas dimensions', () => {
    const wrongLength = riff(vp8()); wrongLength.set(le32(0xffffffff), 4);
    const badStart = vp8(); badStart[11] = 0;
    const hugeChunk = riff(vp8()); hugeChunk.set(le32(0xffffffff), 16);
    const interFrame = vp8(); interFrame[8] = 1;
    for (const bytes of [wrongLength, hugeChunk, riff(vp8x()), riff(vp8x(64, 16), vp8()), riff(vp8(), vp8()),
      riff(vp8l(32, 16, 1 << 29)), riff(badStart), riff(interFrame), riff(riffChunk('VP8L', Uint8Array.of(47))),
      riff(riffChunk('JUNK', Uint8Array.of(1))).subarray(0, 21), riff(vp8(), vp8x()),
    ]) expect(() => assertBusinessMediaImage(bytes, 'image/webp', dimensions)).toThrow();
  });
  it('allows an odd-sized padded non-image WebP chunk without losing frame alignment', () => {
    expect(() => assertBusinessMediaImage(riff(riffChunk('JUNK', Uint8Array.of(1)), vp8l()), 'image/webp', dimensions)).not.toThrow();
  });
  it('caps the byte snapshot independently of header metadata', () => {
    expect(() => assertBusinessMediaImage(join(png(), new Uint8Array(2 * 1024 * 1024)), 'image/png', dimensions)).toThrow();
  });
});
