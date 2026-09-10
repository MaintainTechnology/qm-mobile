import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};
const CACHE_KEY = 'REACT_QUERY_OFFLINE_CACHE';

/** TanStack throttles writes. Revocation must reach the eventual storage call,
 * not merely the initial persistClient call or an unsubscribe at logout. */
export function createScopedQueryStorage(storage: Storage) {
  let epoch = 0;
  let blocked = false;
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T,>(work: () => Promise<T>): Promise<T> => {
    const next = queue.then(work, work);
    queue = next.catch(() => undefined);
    return next;
  };
  return {
    createPersister() {
      const captured = blocked ? -1 : epoch;
      const active = () => captured === epoch && !blocked;
      const inner = createAsyncStoragePersister({
        key: CACHE_KEY,
        storage: {
          getItem: async key => {
            if (!active()) return null;
            const value = await storage.getItem(key);
            return active() ? value : null;
          },
          setItem: (key, value) => serial(async () => {
            if (active()) await storage.setItem(key, value);
          }),
          removeItem: key => serial(async () => {
            if (active()) await storage.removeItem(key);
          }),
        },
      });
      return {
        ...inner,
        restoreClient: async () => {
          const value = await inner.restoreClient();
          return active() ? value : undefined;
        },
      };
    },
    removeClient: () => {
      // Revoke synchronously; serialize deletion after any already-started
      // write. A queued old write becomes a no-op, even after cleanup returns.
      const clearing = ++epoch;
      blocked = true;
      return serial(async () => {
        await storage.removeItem(CACHE_KEY);
        if (epoch === clearing) blocked = false;
      });
    },
  };
}
