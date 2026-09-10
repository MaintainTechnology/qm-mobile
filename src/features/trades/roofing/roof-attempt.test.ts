import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { clearRoofAttempt, readRoofAttempt, roofRejectedBeforeWrite, runRoofAttempt, type RoofAttempt } from './roof-attempt';
import { ApiError } from '@/lib/api';
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: {SHA256:'SHA-256'}, digestStringAsync: async (_:string,value:string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex') }));
jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY:7,getItemAsync:jest.fn(),setItemAsync:jest.fn(),deleteItemAsync:jest.fn() }));
const storage = new Map<string,string>();
const scope = { userId:'user_A',tenantId:'tenant_A',recordId:'roof_A' };
const attempt: RoofAttempt = {version:1,action:'corrections',revision:'a'.repeat(64)};
beforeEach(() => {
  Object.defineProperty(Platform,'OS',{configurable:true,value:'ios'}); storage.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key,value) => { storage.set(key,value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { storage.delete(key); });
});
it('writes recovery before issuing the mutation', async () => {
  await runRoofAttempt(scope,attempt,async () => { expect(await readRoofAttempt(scope)).toEqual(attempt); return 'ok'; });
});
it('retains unknown result through reopen and blocks blind replay', async () => {
  await expect(runRoofAttempt(scope,attempt,async () => { throw new Error('lost response'); })).rejects.toThrow('lost response');
  expect(await readRoofAttempt(scope)).toEqual(attempt);
  const mutate = jest.fn(); await expect(runRoofAttempt(scope,attempt,mutate)).rejects.toThrow('previous'); expect(mutate).not.toHaveBeenCalled();
});
it('blocks mutations when durable receipt storage fails', async () => {
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('storage unavailable'));
  const mutate=jest.fn(); await expect(runRoofAttempt(scope,attempt,mutate)).rejects.toThrow(); expect(mutate).not.toHaveBeenCalled();
});
it('partitions receipts by user, tenant and record and only explicitly clears', async () => {
  await runRoofAttempt(scope,attempt,async () => 'ok');
  for (const key of ['userId','tenantId','recordId'] as const) expect(await readRoofAttempt({...scope,[key]:'other'})).toBeNull();
  await clearRoofAttempt(scope); expect(await readRoofAttempt(scope)).toBeNull();
});
it('blocks simultaneous callers before a second provider mutation', async () => {
  let finish!:()=>void; const held = new Promise<void>(resolve=> { finish=resolve; });
  const first = runRoofAttempt(scope,attempt,async () => held);
  await new Promise(resolve=>setTimeout(resolve,0));
  const mutate=jest.fn(); await expect(runRoofAttempt(scope,attempt,mutate)).rejects.toThrow('already running');
  finish(); await first; expect(mutate).not.toHaveBeenCalled();
});
it('distinguishes exact pre-write rejection from uncertain commit and pending promotion',()=>{
  expect(roofRejectedBeforeWrite(new ApiError('changed',409,'/api/roofing/measurement/token',{error:'measurement_changed'}),'corrections')).toBe(true);
  expect(roofRejectedBeforeWrite(new ApiError('unknown',409,'/api/roofing/measurement/token',{error:'measurement_changed_or_unavailable'}),'corrections')).toBe(false);
  expect(roofRejectedBeforeWrite(new ApiError('pending',409,'/api/roofing/save-as-quote',{error:'promotion_pending'}),'promotion')).toBe(false);
});
