import { createHash } from 'node:crypto';
import type { MediaIdentity, MediaReceipt, MediaResponse } from './business-media-contract';
import type { BusinessMediaSelection } from './business-media-file';

export const MEDIA_TENANT = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
export const MEDIA_TENANT_B = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
export const MEDIA_REV_A = 'cccccccc-1111-4111-8111-cccccccccccc';
export const MEDIA_REV_B = 'dddddddd-1111-4111-8111-dddddddddddd';
export const MEDIA_REV_C = 'eeeeeeee-1111-4111-8111-eeeeeeeeeeee';
export const mediaScope = { tenantId: MEDIA_TENANT,userId: 'user_media_a' };
export const MEDIA_ORIGIN = 'https://media-fixture.supabase.co';
// A real static 1x1 PNG. The reader tests exercise the production header guard.
export const mediaBytes = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9sAAAAASUVORK5CYII=', 'base64'));
export const mediaSelection: BusinessMediaSelection = { sourceMime: 'image/png',
  sourceSha256: createHash('sha256').update(mediaBytes).digest('hex'), dataBase64: Buffer.from(mediaBytes).toString('base64'),
  previewUri: 'data:image/png;base64,' + Buffer.from(mediaBytes).toString('base64') };
export const mediaInput = { kind: 'logo' as const,expectedRevision: MEDIA_REV_A,selection: mediaSelection };
export const mediaDeferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise,resolve }; };
export function mediaCurrent(): MediaResponse { return { ok: true,...mediaScope,revision: MEDIA_REV_A,
  media: { logoUrl: null,logoPath: null,photoUrl: null,photoPath: null },operation: null }; }
export function mediaCompleted(identity: MediaIdentity): MediaReceipt {
  const path = `${MEDIA_TENANT}/business-media/${identity.kind}/${identity.requestId}-${'f'.repeat(64)}.webp`;
  return { ...identity,status: 'complete',resultRevision: MEDIA_REV_B,asset: { path,url: `${MEDIA_ORIGIN}/storage/v1/object/public/tenant-logos/${path}` } };
}
export function mediaResponse(identity: MediaIdentity, status: 'complete' | 'pending' | 'cancelled' | 'rejected' | 'not_found' = 'complete'): MediaResponse {
  const operation = status === 'complete' ? mediaCompleted(identity) : status === 'not_found' ? { requestId: identity.requestId,status } :
    status === 'rejected' ? { ...identity,status,reason: 'revision_conflict' as const } : { ...identity,status };
  const result: MediaResponse = { ...mediaCurrent(),operation };
  if (operation.status === 'complete') {
    result.revision = operation.resultRevision;
    result.media = { ...result.media,[identity.kind === 'logo' ? 'logoUrl' : 'photoUrl']: operation.asset.url,
      [identity.kind === 'logo' ? 'logoPath' : 'photoPath']: operation.asset.path };
  }
  return result;
}
export const mediaHashFixture = { kind: 'photo' as const,expectedRevision: 'A1234567-B123-4123-8123-0123456789AB',sourceMime: 'image/jpeg' as const,
  sourceSha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  canonical: '{"version":1,"kind":"photo","expectedRevision":"a1234567-b123-4123-8123-0123456789ab","sourceMime":"image/jpeg","sourceSha256":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}',
  sha256: '93572def8181fae4d18a7b5d103301fd1f9bb19f4743497aa329d958996981b4' };
