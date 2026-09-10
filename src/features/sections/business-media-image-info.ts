import { BUSINESS_MEDIA_MAX_BYTES, type BusinessMediaMime } from './business-media-policy';

const MAX_AXIS = 8192;
const MAX_PIXELS = 16_777_216;
type Dimensions = { width: number; height: number };
function invalid(): never { throw new Error('Choose a valid PNG, JPG or WebP image with supported dimensions.'); }
function boundedDimensions(width: unknown, height: unknown): Dimensions {
  if (typeof width !== 'number' || typeof height !== 'number' || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width <= 0 || height <= 0 || width > MAX_AXIS || height > MAX_AXIS || width * height > MAX_PIXELS) invalid();
  return { width, height };
}
function text(bytes: Uint8Array, offset: number, length: number) {
  let value = '';
  for (let index = offset; index < offset + length; index++) value += String.fromCharCode(bytes[index]!);
  return value;
}
function u16be(bytes: Uint8Array, offset: number) { return bytes[offset]! * 256 + bytes[offset + 1]!; }
function u16le(bytes: Uint8Array, offset: number) { return bytes[offset]! + bytes[offset + 1]! * 256; }
function u24le(bytes: Uint8Array, offset: number) { return u16le(bytes, offset) + bytes[offset + 2]! * 65_536; }
function u32be(bytes: Uint8Array, offset: number) { return u16be(bytes, offset) * 65_536 + u16be(bytes, offset + 2); }
function u32le(bytes: Uint8Array, offset: number) { return u16le(bytes, offset) + u16le(bytes, offset + 2) * 65_536; }
function same(a: Dimensions, b: Dimensions) { return a.width === b.width && a.height === b.height; }

function pngDimensions(bytes: Uint8Array): Dimensions {
  if (bytes.length < 45 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    || u32be(bytes, 8) !== 13 || text(bytes, 12, 4) !== 'IHDR') invalid();
  const result = boundedDimensions(u32be(bytes, 16), u32be(bytes, 20));
  let offset = 8, hasData = false;
  while (offset + 12 <= bytes.length) {
    const length = u32be(bytes, offset), type = text(bytes, offset + 4, 4);
    if (length > bytes.length - offset - 12 || type === 'acTL' || type === 'fcTL' || type === 'fdAT'
      || (type === 'IHDR' && offset !== 8)) invalid();
    if (type === 'IDAT') hasData = true;
    offset += length + 12;
    if (type === 'IEND') {
      if (length !== 0 || !hasData || offset !== bytes.length) invalid();
      return result;
    }
  }
  return invalid();
}

function jpegDimensions(bytes: Uint8Array): Dimensions {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) invalid();
  let offset = 2;
  let result: Dimensions | null = null;
  // Every iteration consumes bytes or rejects. Segment lengths cannot escape
  // this <=2MiB snapshot; EXIF/ICC data is skipped, never decoded or trusted.
  while (offset < bytes.length) {
    if (bytes[offset] !== 255) invalid();
    while (offset < bytes.length && bytes[offset] === 255) offset++;
    if (offset >= bytes.length) invalid();
    const marker = bytes[offset++]!;
    if (marker === 0 || marker === 216 || marker === 217 || marker === 1 || (marker >= 208 && marker <= 215)) invalid();
    if (offset + 2 > bytes.length) invalid();
    const length = u16be(bytes, offset);
    if (length < 2 || length > bytes.length - offset) invalid();
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      if (length < 8 || result) invalid();
      const components = bytes[offset + 7]!;
      if (![1, 3, 4].includes(components) || length !== 8 + 3 * components) invalid();
      result = boundedDimensions(u16be(bytes, offset + 5), u16be(bytes, offset + 3));
    }
    if (marker === 218) {
      if (!result || length < 8 || !bytes[offset + 2] || length !== 6 + 2 * bytes[offset + 2]!) invalid();
      return result;
    }
    offset += length;
  }
  return invalid();
}

function webpDimensions(bytes: Uint8Array): Dimensions {
  if (bytes.length < 20 || text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 4) !== 'WEBP'
    || u32le(bytes, 4) !== bytes.length - 8) invalid();
  let offset = 12;
  let canvas: Dimensions | null = null, image: Dimensions | null = null;
  while (offset + 8 <= bytes.length) {
    const type = text(bytes, offset, 4), length = u32le(bytes, offset + 4), start = offset + 8;
    if (length > bytes.length - start) invalid();
    if (type === 'ANIM' || type === 'ANMF') invalid();
    if (type === 'VP8X') {
      if (canvas || image || length !== 10 || (bytes[start]! & 2) !== 0) invalid();
      canvas = boundedDimensions(1 + u24le(bytes, start + 4), 1 + u24le(bytes, start + 7));
    } else if (type === 'VP8 ') {
      if (image || length < 10 || (bytes[start]! & 1) !== 0 || text(bytes, start + 3, 3) !== '\x9d\x01\x2a') invalid();
      image = boundedDimensions(u16le(bytes, start + 6) & 0x3fff, u16le(bytes, start + 8) & 0x3fff);
    } else if (type === 'VP8L') {
      if (image || length < 5 || bytes[start] !== 47) invalid();
      const bits = u32le(bytes, start + 1);
      if ((bits >>> 29) !== 0) invalid();
      image = boundedDimensions(1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff));
    }
    offset = start + length + (length % 2);
    if (offset > bytes.length) invalid();
  }
  if (offset !== bytes.length || !image || (canvas && !same(canvas, image))) invalid();
  return image;
}

/** Bounded header guard before native preview. This does not certify pixel data;
 * the server remains the full decoder/optimizer and validates the same bounds. */
export function assertBusinessMediaImage(bytes: Uint8Array, mime: BusinessMediaMime,
  dimensions: { width?: number; height?: number }): void {
  const picked = boundedDimensions(dimensions.width, dimensions.height);
  if (!bytes.byteLength || bytes.byteLength > BUSINESS_MEDIA_MAX_BYTES) invalid();
  const encoded = mime === 'image/png' ? pngDimensions(bytes) : mime === 'image/jpeg' ? jpegDimensions(bytes)
    : mime === 'image/webp' ? webpDimensions(bytes) : invalid();
  if (!same(picked, encoded) && !same(picked, { width: encoded.height, height: encoded.width })) invalid();
}
