import { createScopedQueryStorage } from './scoped-query-storage';

type Client = Parameters<ReturnType<ReturnType<typeof createScopedQueryStorage>['createPersister']>['persistClient']>[0];
const client = (buster: string): Client => ({ timestamp: 1, buster, clientState: { mutations: [], queries: [] } });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });
function setup() {
  let data: string | null = null;
  const storage = {
    getItem: jest.fn(async () => data),
    setItem: jest.fn(async (_key: string, value: string) => { data = value; }),
    removeItem: jest.fn(async () => { data = null; }),
  };
  return { storage, scoped: createScopedQueryStorage(storage) };
}

it('prevents a throttled old write from resurrecting cache after cleanup, even for the same user', async () => {
  const { storage, scoped } = setup();
  const old = scoped.createPersister();
  await old.persistClient(client('same-user'));
  const scheduled = old.persistClient(client('same-user-private-tenant-A'));
  await flush();
  await scoped.removeClient();
  const next = scoped.createPersister();
  expect(await next.restoreClient()).toBeUndefined();
  await jest.advanceTimersByTimeAsync(1100);
  await scheduled;
  expect(await next.restoreClient()).toBeUndefined();
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  await next.persistClient(client('same-user-tenant-B'));
  expect((await next.restoreClient())?.buster).toBe('same-user-tenant-B');
});

it('finishes an already-started write before deleting it and blocks restoration by an old handle', async () => {
  const { storage, scoped } = setup();
  let finish!: () => void;
  const realWrite = storage.setItem.getMockImplementation()!;
  storage.setItem.mockImplementationOnce(async (key, value) => {
    await new Promise<void>(resolve => { finish = resolve; });
    await realWrite(key, value);
  });
  const old = scoped.createPersister();
  const writing = old.persistClient(client('private-A'));
  await flush();
  const clearing = scoped.removeClient();
  expect(storage.removeItem).not.toHaveBeenCalled();
  finish();
  await writing;
  await clearing;
  expect(await old.restoreClient()).toBeUndefined();
  expect(await scoped.createPersister().restoreClient()).toBeUndefined();
});

it('preserves safe cold-launch readback and rejects a read that completed after revocation', async () => {
  const { storage, scoped } = setup();
  const first = scoped.createPersister();
  await first.persistClient(client('account-A'));
  expect((await scoped.createPersister().restoreClient())?.buster).toBe('account-A');
  let finish!: (value: string) => void;
  storage.getItem.mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
  const loading = first.restoreClient();
  await scoped.removeClient();
  finish(JSON.stringify(client('private-A')));
  expect(await loading).toBeUndefined();
});

it('keeps failed cleanup closed until explicit retry and never activates handles created while blocked', async () => {
  const { storage, scoped } = setup();
  storage.removeItem.mockRejectedValueOnce(new Error('Storage failed'));
  await expect(scoped.removeClient()).rejects.toThrow('Storage failed');
  const blocked = scoped.createPersister();
  await scoped.removeClient();
  await blocked.persistClient(client('stale'));
  expect(storage.setItem).not.toHaveBeenCalled();
  const next = scoped.createPersister();
  await next.persistClient(client('current'));
  expect((await next.restoreClient())?.buster).toBe('current');
});
