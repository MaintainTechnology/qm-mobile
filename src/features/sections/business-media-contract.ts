import { z } from 'zod';
import { BUSINESS_MEDIA_MAX_BYTES } from './business-media-policy';

export const MediaUuid = z.string().uuid().transform(value => value.toLowerCase());
export const MediaHash = z.string().regex(/^[a-f0-9]{64}$/);
export const MediaMime = z.enum(['image/png', 'image/jpeg', 'image/webp']);
export const MediaKind = z.enum(['logo', 'photo']);
export type BusinessMediaKind = z.infer<typeof MediaKind>;
export const MediaIdentitySchema = z.object({
  requestId: MediaUuid, kind: MediaKind, expectedRevision: MediaUuid,
  sourceMime: MediaMime, sourceSha256: MediaHash, inputHash: MediaHash,
}).strict();
export type MediaIdentity = z.infer<typeof MediaIdentitySchema>;
export const MediaWriteSchema = MediaIdentitySchema.extend({
  dataBase64: z.string().min(4).max(4 * Math.ceil(BUSINESS_MEDIA_MAX_BYTES / 3)),
}).strict();
export function mediaInputText(input: Pick<MediaIdentity, 'kind' | 'expectedRevision' | 'sourceMime' | 'sourceSha256'>) {
  return JSON.stringify({ version: 1, kind: MediaKind.parse(input.kind), expectedRevision: MediaUuid.parse(input.expectedRevision),
    sourceMime: MediaMime.parse(input.sourceMime), sourceSha256: MediaHash.parse(input.sourceSha256) });
}
const asset = z.object({ url: z.string().url().max(2048), path: z.string().min(1).max(400) }).strict();
export const MediaReceiptSchema = z.discriminatedUnion('status', [
  MediaIdentitySchema.extend({ status: z.literal('pending') }).strict(),
  MediaIdentitySchema.extend({ status: z.literal('cancelled') }).strict(),
  MediaIdentitySchema.extend({ status: z.literal('rejected'), reason: z.literal('revision_conflict') }).strict(),
  MediaIdentitySchema.extend({ status: z.literal('complete'), resultRevision: MediaUuid, asset }).strict(),
]);
export type MediaReceipt = z.infer<typeof MediaReceiptSchema>;
export const MediaOperationSchema = z.union([MediaReceiptSchema,
  z.object({ requestId: MediaUuid, status: z.literal('not_found') }).strict(),
]);
export const MediaResponseSchema = z.object({
  ok: z.literal(true), tenantId: MediaUuid, userId: z.string().min(1).max(256), revision: MediaUuid,
  media: z.object({ logoUrl: z.string().max(2048).nullable(), logoPath: z.string().max(400).nullable(),
    photoUrl: z.string().max(2048).nullable(), photoPath: z.string().max(400).nullable() }).strict(),
  operation: MediaOperationSchema.nullable(),
}).strict();
export type MediaResponse = z.infer<typeof MediaResponseSchema>;
export type MediaScope = { tenantId: string; userId: string };
export function readMediaResponse(raw: unknown, scope: MediaScope, pending?: MediaIdentity): MediaResponse {
  const result = MediaResponseSchema.parse(raw);
  const tenantId = MediaUuid.parse(scope.tenantId);
  if (result.tenantId !== tenantId || result.userId !== scope.userId) throw new Error('The image response belongs to another account.');
  if (pending) {
    const operation = result.operation;
    if (!operation || operation.requestId !== pending.requestId) throw new Error('The image response does not match the saved request.');
    if (operation.status !== 'not_found' && Object.keys(MediaIdentitySchema.shape).some(key =>
      operation[key as keyof MediaIdentity] !== pending[key as keyof MediaIdentity])) throw new Error('The image response does not match the original change.');
  } else if (result.operation !== null) throw new Error('Unexpected image operation response.');
  if (result.operation?.status === 'complete') {
    const operation = result.operation;
    const prefix = `${tenantId}/business-media/${operation.kind}/${operation.requestId}-`;
    if (!operation.asset.path.startsWith(prefix) || !/^[a-f0-9]{64}\.webp$/.test(operation.asset.path.slice(prefix.length)) ||
      !businessMediaPreviewUrl(operation.asset.url, operation.asset.path))
      throw new Error('The completed image does not match the original account and request.');
  }
  return result;
}
/** The server derives approved storage URLs from owned paths. Reject malformed
 * transport values before handing them to a native image loader. */
export function businessMediaPreviewUrl(url: string | null, path: string | null): string | null {
  if (!url || !path || path.length > 400 || !/^[A-Za-z0-9_./-]+$/.test(path) || path.split('/').some(segment => !segment || segment === '.' || segment === '..')) return null;
  try {
    const parsed = new URL(url);
    const configured = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!configured) return null;
    const origin = new URL(configured);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port || origin.search || origin.hash || origin.pathname !== '/') return null;
    if (parsed.origin !== origin.origin || parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null;
    const prefix = '/storage/v1/object/public/tenant-logos/';
    if (!parsed.pathname.startsWith(prefix) || decodeURIComponent(parsed.pathname.slice(prefix.length)) !== path) return null;
    return url;
  } catch { return null; }
}
