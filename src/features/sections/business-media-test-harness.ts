import * as SecureStore from 'expo-secure-store';
import { pickImageForUpload } from '@/lib/media';
import { readBusinessMediaFile } from './business-media-file';
import { MediaIdentitySchema, type MediaIdentity, type MediaReceipt, type MediaResponse } from './business-media-contract';
import { MEDIA_ORIGIN, MEDIA_REV_A, MEDIA_REV_C, MEDIA_TENANT, mediaBytes, mediaCompleted, mediaCurrent, mediaSelection } from './business-media-test-fixture';

let mockMediaAuth = { userId: 'user_media_a',sessionId: 'session_media_a' };
export const mockMediaToken = jest.fn(async (): Promise<string | null> => `token:${mockMediaAuth.userId}:${mockMediaAuth.sessionId}`);
export const mockMediaInvalidate = jest.fn(), mockMediaPrevent = jest.fn();
export const mockMediaApi = jest.fn();
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ ...mockMediaAuth,getToken: mockMediaToken }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockMediaInvalidate }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: (...args: unknown[]) => mockMediaPrevent(...args) }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'),apiRequest: (...args: unknown[]) => mockMediaApi(...args) }));
jest.mock('@/lib/media', () => ({ ...jest.requireActual('@/lib/media'),pickImageForUpload: jest.fn() }));
jest.mock('./business-media-file', () => ({ ...jest.requireActual('./business-media-file'),readBusinessMediaFile: jest.fn() }));
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' },randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_: string,text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,isAvailableAsync: jest.fn(async () => true),getItemAsync: jest.fn(),setItemAsync: jest.fn(),deleteItemAsync: jest.fn() }));
export const mockMediaPicker = jest.mocked(pickImageForUpload), mockMediaReader = jest.mocked(readBusinessMediaFile);
export const mediaSecure = new Map<string,string>();
export const mediaWire = { current: mediaCurrent(),operations: new Map<string,MediaReceipt>(),posts: [] as { identity: MediaIdentity; dataBase64: string }[],
  cancellations: [] as MediaIdentity[],commits: 0,failBeforeClaim: false,failAfterCommit: false,failReads: false };
export function setMediaAuth(userId: string,sessionId: string) { mockMediaAuth = { userId,sessionId }; }
export function setMediaRevision(revision = MEDIA_REV_C) { mediaWire.current = { ...mediaWire.current,revision }; }
export async function mediaHttp(path: string, _schema?: unknown, options?: { method?: string; body?: unknown }): Promise<MediaResponse> {
  const method = options?.method ?? 'GET', query = new URL('https://fixture.test' + path).searchParams;
  if (method === 'GET') {
    if (mediaWire.failReads) throw new Error('Server read unavailable');
    const id = query.get('requestId');
    return { ...mediaWire.current,operation: id ? mediaWire.operations.get(id) ?? { requestId: id,status: 'not_found' } : null };
  }
  const raw = options?.body as Record<string,unknown>, { dataBase64,...fields } = raw;
  const identity = MediaIdentitySchema.parse(fields);
  if (method === 'DELETE') {
    mediaWire.cancellations.push(identity);
    if (!mediaWire.operations.has(identity.requestId)) mediaWire.operations.set(identity.requestId,{ ...identity,status: 'cancelled' });
    const existing = mediaWire.operations.get(identity.requestId)!;
    if (existing.status === 'pending') mediaWire.operations.set(identity.requestId,{ ...identity,status: 'cancelled' });
  } else {
    mediaWire.posts.push({ identity,dataBase64: String(dataBase64) });
    if (mediaWire.failBeforeClaim) { mediaWire.failBeforeClaim = false; throw new Error('Response lost before visible claim'); }
    if (!mediaWire.operations.has(identity.requestId)) {
      const operation: MediaReceipt = identity.expectedRevision === mediaWire.current.revision ? mediaCompleted(identity)
        : { ...identity,status: 'rejected',reason: 'revision_conflict' };
      mediaWire.operations.set(identity.requestId,operation);
      if (operation.status === 'complete') {
        mediaWire.commits += 1;
        mediaWire.current = { ...mediaWire.current,revision: operation.resultRevision,media: { ...mediaWire.current.media,
          [identity.kind === 'logo' ? 'logoPath' : 'photoPath']: operation.asset.path,
          [identity.kind === 'logo' ? 'logoUrl' : 'photoUrl']: operation.asset.url } };
      }
    }
    if (mediaWire.failAfterCommit) { mediaWire.failAfterCommit = false; throw new Error('Lost committed response'); }
  }
  return { ...mediaWire.current,operation: mediaWire.operations.get(identity.requestId)! };
}
export function resetMediaHarness() {
  jest.clearAllMocks(); setMediaAuth('user_media_a','session_media_a'); process.env.EXPO_PUBLIC_SUPABASE_URL = MEDIA_ORIGIN;
  mockMediaToken.mockReset().mockImplementation(async () => `token:${mockMediaAuth.userId}:${mockMediaAuth.sessionId}`);
  mediaSecure.clear(); mediaWire.current = mediaCurrent(); mediaWire.operations.clear(); mediaWire.posts = []; mediaWire.cancellations = [];
  mediaWire.commits = 0; mediaWire.failBeforeClaim = false; mediaWire.failAfterCommit = false; mediaWire.failReads = false;
  jest.mocked(SecureStore.getItemAsync).mockReset().mockImplementation(async key => mediaSecure.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockReset().mockImplementation(async (key,value) => { mediaSecure.set(key,value); });
  jest.mocked(SecureStore.deleteItemAsync).mockReset().mockImplementation(async key => { mediaSecure.delete(key); });
  mockMediaPicker.mockReset().mockResolvedValue({ kind: 'selected',libraryAccess: 'all',hasUnknownSize: false,
    files: [{ uri: 'file:///private/picked.png',name: 'picked.png',type: 'image/png',size: mediaBytes.length,width: 1,height: 1 }] });
  mockMediaReader.mockReset().mockResolvedValue(mediaSelection);
  mockMediaApi.mockReset().mockImplementation(mediaHttp);
}
export { SecureStore,MEDIA_TENANT,MEDIA_REV_A };
