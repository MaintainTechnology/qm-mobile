import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { createWorkingDraftStore } from '@/lib/working-draft-storage';
import { CONTACT_TOPICS } from './contact-contract';

export const ContactDraftSchema = z.object({
  name: z.string().max(100), email: z.string().max(200), phone: z.string().max(40),
  topic: z.enum(CONTACT_TOPICS), message: z.string().max(4000),
}).strict();
export type ContactScope = { userId: string | null };
export function contactOwner(scope: ContactScope) {
  if (scope.userId === null) return { userId: 'guest', purpose: 'support.guest.v2' };
  return { userId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/).parse(scope.userId), purpose: 'support.account.v2' };
}
export const contactDraftKey = (value: unknown) => JSON.stringify(value);
let legacyCleanup: Promise<void> = Promise.resolve();
/** The old device-wide draft has no trustworthy owner and cannot be migrated.
 * Serialize removals, verify cleanup, and never touch opaque send receipts. */
export function clearLegacyContactDraft(): Promise<void> {
  const remove = async () => {
    if (Platform.OS === 'web') return;
    const key = 'quotemax.public-contact-draft.v1';
    await SecureStore.deleteItemAsync(key);
    if (await SecureStore.getItemAsync(key) !== null) throw new Error('Previous support draft cleanup could not finish. Retry before opening support.');
  };
  const next = legacyCleanup.then(remove, remove);
  legacyCleanup = next.catch(() => undefined);
  return next;
}
export function createContactDraftStore(scope: ContactScope) {
  // Public enquiries have no tenant. Existing real-tenant draft hashes are unchanged.
  const store = createWorkingDraftStore({ ...contactOwner(scope), recordId: 'contact' }, ContactDraftSchema);
  return {
    load: async () => { await clearLegacyContactDraft(); return store.load(); },
    save: store.save,
    remove: store.remove,
  };
}
