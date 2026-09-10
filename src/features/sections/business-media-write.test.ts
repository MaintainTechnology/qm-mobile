import * as SecureStore from 'expo-secure-store';
import { acknowledgeMediaWrite, cancelMediaWrite, loadMediaReceipt, mediaWriteHash, recoverMediaWrite, writeBusinessMedia } from './business-media-write';
import { businessMediaPreviewUrl, mediaInputText, readMediaResponse, type MediaIdentity } from './business-media-contract';
import { MEDIA_ORIGIN, MEDIA_REV_C, MEDIA_TENANT_B, mediaDeferred, mediaHashFixture, mediaInput, mediaResponse, mediaScope, mediaSelection } from './business-media-test-fixture';

jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' },randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_: string,text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,isAvailableAsync: jest.fn(async () => true),getItemAsync: jest.fn(),setItemAsync: jest.fn(),deleteItemAsync: jest.fn() }));
const storage = new Map<string,string>();
beforeEach(() => {
  jest.clearAllMocks(); storage.clear(); process.env.EXPO_PUBLIC_SUPABASE_URL = MEDIA_ORIGIN;
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key,value) => { storage.set(key,value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { storage.delete(key); });
});
async function unknown() {
  let identity!: MediaIdentity;
  await expect(writeBusinessMedia(mediaScope,mediaInput,async value => { identity = value; throw new Error('Lost acknowledgement'); })).rejects.toThrow('Lost');
  return identity;
}
it('pins exact server224 canonical hash including UUID normalization', async () => {
  expect(mediaInputText(mediaHashFixture)).toBe(mediaHashFixture.canonical);
  expect(await mediaWriteHash(mediaHashFixture)).toBe(mediaHashFixture.sha256);
});
it('stores only an opaque checked reference before POST, keeping complete until acknowledgement', async () => {
  const dispatch = jest.fn(async (identity: MediaIdentity,body: string) => {
    expect(await loadMediaReceipt(mediaScope)).toMatchObject({ version: 1,identity,status: 'unknown' });
    expect(body).toBe(mediaSelection.dataBase64);
    return mediaResponse(identity);
  });
  const result = await writeBusinessMedia(mediaScope,mediaInput,dispatch), text = [...storage.values()].join('');
  for (const privateValue of [mediaSelection.dataBase64,mediaSelection.previewUri,'file:///private/logo.png','Bearer token']) expect(text).not.toContain(privateValue);
  expect([...storage.keys()].join('')).not.toContain(mediaScope.userId);
  await expect(writeBusinessMedia(mediaScope,mediaInput,dispatch)).rejects.toThrow('completed image change'); expect(dispatch).toHaveBeenCalledTimes(1);
  await acknowledgeMediaWrite(mediaScope,result.operation!.requestId); expect(await loadMediaReceipt(mediaScope)).toBeNull();
});
it('retains not_found across remount and allows only the exact original image/revision retry', async () => {
  const identity = await unknown(), retained = await loadMediaReceipt(mediaScope);
  await recoverMediaWrite(mediaScope,async () => mediaResponse(identity,'not_found'));
  expect(await loadMediaReceipt(mediaScope)).toEqual(retained);
  const dispatch = jest.fn(async (value: MediaIdentity) => mediaResponse(value));
  for (const changed of [{ ...mediaInput,kind: 'photo' as const },{ ...mediaInput,expectedRevision: MEDIA_REV_C },
    { ...mediaInput,selection: { ...mediaSelection,sourceSha256: 'a'.repeat(64) } }]) await expect(writeBusinessMedia(mediaScope,changed,dispatch)).rejects.toThrow('exact original image');
  expect(dispatch).not.toHaveBeenCalled();
  await writeBusinessMedia(mediaScope,mediaInput,dispatch); expect(dispatch).toHaveBeenCalledWith(identity,mediaSelection.dataBase64);
});
it('canonicalizes tenant scope across a lost uppercase request and lowercase recovery', async () => {
  let identity!: MediaIdentity;
  await expect(writeBusinessMedia({ ...mediaScope,tenantId: mediaScope.tenantId.toUpperCase() },mediaInput,async value => { identity = value; throw new Error('Lost'); })).rejects.toThrow();
  expect(await loadMediaReceipt(mediaScope)).toMatchObject({ identity,status: 'unknown' });
  const result = await recoverMediaWrite(mediaScope,async () => mediaResponse(identity)); expect(result?.operation?.status).toBe('complete');
  expect(await loadMediaReceipt({ ...mediaScope,tenantId: mediaScope.tenantId.toUpperCase() })).toMatchObject({ status: 'complete' });
});
it('cancels an absent operation using identity alone and retains a verified tombstone', async () => {
  const identity = await unknown(); await recoverMediaWrite(mediaScope,async () => mediaResponse(identity,'not_found'));
  const cancel = jest.fn(async (value: MediaIdentity) => mediaResponse(value,'cancelled'));
  expect((await cancelMediaWrite(mediaScope,cancel,identity.requestId)).operation?.status).toBe('cancelled');
  expect(cancel).toHaveBeenCalledWith(identity); expect(JSON.stringify(cancel.mock.calls)).not.toContain(mediaSelection.dataBase64);
  expect(await loadMediaReceipt(mediaScope)).toMatchObject({ status: 'cancelled' });
  const send = jest.fn(); await expect(writeBusinessMedia(mediaScope,mediaInput,send)).rejects.toThrow(); expect(send).not.toHaveBeenCalled();
});
it.each(['user','tenant','request','hash','kind','asset'])('rejects malformed %s completion and keeps unknown', async field => {
  const identity = await unknown(), response = mediaResponse(identity);
  if (field === 'user') response.userId = 'other';
  if (field === 'tenant') response.tenantId = MEDIA_TENANT_B;
  if (response.operation?.status === 'complete') {
    if (field === 'request') response.operation.requestId = MEDIA_REV_C;
    if (field === 'hash') response.operation.inputHash = 'a'.repeat(64);
    if (field === 'kind') response.operation.kind = 'photo';
    if (field === 'asset') {
      response.operation.asset.path = response.operation.asset.path.replace(mediaScope.tenantId,MEDIA_TENANT_B);
      response.operation.asset.url = `${MEDIA_ORIGIN}/storage/v1/object/public/tenant-logos/${response.operation.asset.path}`;
    }
  }
  await expect(recoverMediaWrite(mediaScope,async () => response)).rejects.toThrow();
  expect(await loadMediaReceipt(mediaScope)).toMatchObject({ status: 'unknown' });
});
it('accepts historical completion with a newer current media revision', async () => {
  const identity = await unknown(), response = mediaResponse(identity); response.revision = MEDIA_REV_C;
  response.media = { logoUrl: null,logoPath: null,photoUrl: null,photoPath: null };
  expect(readMediaResponse(response,mediaScope,identity).operation?.status).toBe('complete');
});
it('keeps terminal recovery on failed acknowledgement cleanup and retries storage safely', async () => {
  const identity = await unknown(); await recoverMediaWrite(mediaScope,async () => mediaResponse(identity));
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValueOnce();
  await expect(acknowledgeMediaWrite(mediaScope,identity.requestId)).rejects.toThrow('could not be cleared');
  expect(await loadMediaReceipt(mediaScope)).toMatchObject({ status: 'complete' });
  await acknowledgeMediaWrite(mediaScope,identity.requestId); expect(await loadMediaReceipt(mediaScope)).toBeNull();
});
it.each(['complete','cancelled','rejected'] as const)('does not downgrade or replace confirmed %s status on later readback', async status => {
  const identity = await unknown(); await recoverMediaWrite(mediaScope,async () => mediaResponse(identity,status));
  const before = await loadMediaReceipt(mediaScope);
  for (const later of ['pending','not_found',status === 'complete' ? 'cancelled' : 'complete'] as const)
    await expect(recoverMediaWrite(mediaScope,async () => mediaResponse(identity,later))).rejects.toThrow('conflicting');
  expect(await loadMediaReceipt(mediaScope)).toEqual(before);
});
it('binds cancellation to the displayed request instead of whichever receipt exists later', async () => {
  const first = await unknown(); await cancelMediaWrite(mediaScope,async identity => mediaResponse(identity,'cancelled'),first.requestId);
  await acknowledgeMediaWrite(mediaScope,first.requestId);
  const replacement = await unknown(), cancel = jest.fn(async (identity: MediaIdentity) => mediaResponse(identity,'cancelled'));
  await expect(cancelMediaWrite(mediaScope,cancel,first.requestId)).rejects.toThrow();
  expect(cancel).not.toHaveBeenCalled(); expect(await loadMediaReceipt(mediaScope)).toMatchObject({ identity: replacement,status: 'unknown' });
});
it('refuses dispatch when storage fails or silently rejects the reference', async () => {
  const dispatch = jest.fn(); jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('Locked'));
  await expect(writeBusinessMedia(mediaScope,mediaInput,dispatch)).rejects.toThrow('Locked');
  jest.mocked(SecureStore.setItemAsync).mockResolvedValueOnce(); await expect(writeBusinessMedia(mediaScope,mediaInput,dispatch)).rejects.toThrow('protected');
  expect(dispatch).not.toHaveBeenCalled();
});
it('does not expire unknown or expose it across user/tenant scope', async () => {
  await unknown(); expect(await loadMediaReceipt({ ...mediaScope,userId: 'other' })).toBeNull();
  expect(await loadMediaReceipt({ ...mediaScope,tenantId: MEDIA_TENANT_B })).toBeNull();
  const clock = jest.spyOn(Date,'now').mockReturnValue(9999999999999);
  try { expect(await loadMediaReceipt(mediaScope)).toMatchObject({ status: 'unknown' }); } finally { clock.mockRestore(); }
});
it('serializes concurrent starts before creating a second dispatch', async () => {
  const reply = mediaDeferred<ReturnType<typeof mediaResponse>>(); let identity!: MediaIdentity;
  const first = writeBusinessMedia(mediaScope,mediaInput,async value => { identity = value; return reply.promise; });
  for (let i = 0; i < 60 && !identity; i++) await Promise.resolve();
  const dispatch = jest.fn(); await expect(writeBusinessMedia(mediaScope,mediaInput,dispatch)).rejects.toThrow('still being checked');
  reply.resolve(mediaResponse(identity)); await first; expect(dispatch).not.toHaveBeenCalled();
});
it('allows only configured canonical storage URLs as native previews', () => {
  const path = `${mediaScope.tenantId}/logo.webp`, url = `${MEDIA_ORIGIN}/storage/v1/object/public/tenant-logos/${path}`;
  expect(businessMediaPreviewUrl(url,path)).toBe(url);
  for (const candidate of [url.replace(MEDIA_ORIGIN,'https://foreign.example'),url.replace('https:','http:'),url + '?token=private',url + '#fragment',
    url.replace('https://','https://user:pass@'),url.replace('/logo.webp','/%2e%2e/secret.webp')]) expect(businessMediaPreviewUrl(candidate,path)).toBeNull();
  expect(businessMediaPreviewUrl(url,`${mediaScope.tenantId}/../logo.webp`)).toBeNull();
  expect(businessMediaPreviewUrl(url,null)).toBeNull();
  delete process.env.EXPO_PUBLIC_SUPABASE_URL; expect(businessMediaPreviewUrl(url,path)).toBeNull();
});
