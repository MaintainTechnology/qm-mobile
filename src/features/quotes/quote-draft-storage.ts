/**
 * Encrypted, account-bound working copies, retained for seven days after an edit.
 * This is not a server-write receipt: restoring never proves that a Save failed.
 * The editor must refresh the owned quote and reconcile its revision before Save.
 *
 * Fixed encrypted manifest slots make interrupted generations discoverable even
 * when iOS Keychain survives reinstall. No customer content or index is written
 * to AsyncStorage. Manifests switch only after every new chunk is durable; the
 * previous generation remains recorded until the next write or explicit removal.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

import type { EditorTiers } from './quote-editor';
import {
  ReportDocSchema,
  ReportStyleSchema,
  type ReportDoc,
  type ReportStyle,
} from './report-editor';

export const QUOTE_DRAFT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const QUOTE_DRAFT_MAX_SLOTS = 20;
const MAX_CHUNKS = 128;
const CHUNK_BYTES = 1800;
const PREFIX = 'quotemax.quote-draft.v1';
const PURGE_KEY = `${PREFIX}.purging`;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const identity = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9_-]+$/);
const ScopeSchema = z.object({ userId: identity, tenantId: identity, quoteId: identity }).strict();
export type QuoteDraftScope = z.infer<typeof ScopeSchema>;
const LineSchema = z
  .object({
    key: z.string().min(1).max(200),
    originalIndex: z.number().int().nonnegative().nullable(),
    description: z.string().max(10000),
    // Incomplete and invalid numeric text is intentionally recoverable.
    quantity: z.string().max(1000),
    price: z.string().max(1000),
    unit: z.string().max(1000).optional(),
    source: z.string().max(1000).optional(),
    supplied_by: z.string().max(1000).optional(),
    safety_note: z.string().max(10000).optional(),
  })
  .strict();
const TierSchema = z
  .object({
    label: z.string().max(10000),
    timeframe: z.string().max(10000).optional(),
    lines: z.array(LineSchema).max(1000),
  })
  .strict();
const TiersSchema = z
  .object({
    good: TierSchema.optional(),
    better: TierSchema.optional(),
    best: TierSchema.optional(),
  })
  .strict();
const InputSchema = z
  .object({
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    originalTiers: TiersSchema,
    workingTiers: TiersSchema,
    narrative: z
      .object({
        originalDoc: ReportDocSchema.nullable(),
        workingDoc: ReportDocSchema.nullable(),
        originalStyle: ReportStyleSchema.nullable(),
        workingStyle: ReportStyleSchema.nullable(),
      })
      .optional(),
  })
  .strict();
export type QuoteDraftInput = {
  revision: string;
  originalTiers: EditorTiers;
  workingTiers: EditorTiers;
  narrative?: {
    originalDoc: ReportDoc | null;
    workingDoc: ReportDoc | null;
    originalStyle: ReportStyle | null;
    workingStyle: ReportStyle | null;
  };
};
const SnapshotSchema = InputSchema.extend({
  version: z.literal(1),
  scopeHash: z.string().regex(/^[a-f0-9]{64}$/),
  savedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
}).strict();
export type QuoteDraftSnapshot = QuoteDraftInput & { savedAt: number; expiresAt: number };
const GenerationSchema = z
  .object({
    id: z.string().uuid(),
    count: z.number().int().min(1).max(MAX_CHUNKS),
  })
  .strict();
const CurrentSchema = GenerationSchema.extend({
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  savedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
}).strict();
const ManifestSchema = z
  .object({
    version: z.literal(1),
    scopeHash: z.string().regex(/^[a-f0-9]{64}$/),
    current: CurrentSchema.nullable(),
    pending: GenerationSchema.nullable(),
    retired: GenerationSchema.nullable(),
  })
  .strict()
  .refine(value => {
    const ids = [value.current?.id, value.pending?.id, value.retired?.id].filter(Boolean);
    return new Set(ids).size === ids.length;
  });
type Manifest = z.infer<typeof ManifestSchema>;
type Generation = z.infer<typeof GenerationSchema>;
export class QuoteDraftStorageError extends Error {
  constructor(
    readonly code: 'unavailable' | 'revoked' | 'corrupt' | 'full' | 'too_large' | 'io',
    message: string,
  ) {
    super(message);
    this.name = 'QuoteDraftStorageError';
  }
}
let epoch = 0;
let purgeBlocked = false;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action, action);
  queue = next.catch(() => undefined);
  return next.catch(error => {
    if (error instanceof QuoteDraftStorageError) throw error;
    throw new QuoteDraftStorageError(
      'io',
      'Encrypted draft storage could not finish. Keep this editor open and try again.',
    );
  });
}
function assertActive(capturedEpoch: number) {
  if (capturedEpoch !== epoch || purgeBlocked)
    throw new QuoteDraftStorageError(
      'revoked',
      'This editor belongs to an ended session. Reopen it from the current account.',
    );
}
async function assertAvailable() {
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync()))
    throw new QuoteDraftStorageError(
      'unavailable',
      'Encrypted draft recovery is unavailable on this device.',
    );
}
const manifestKey = (slot: number) => `${PREFIX}.${slot}.manifest`;
const chunkKey = (slot: number, generation: Generation, index: number) =>
  `${PREFIX}.${slot}.${generation.id}.${index}`;
const digest = (text: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
async function manifests(): Promise<(Manifest | null)[]> {
  return Promise.all(
    Array.from({ length: QUOTE_DRAFT_MAX_SLOTS }, async (_, slot) => {
      const raw = await SecureStore.getItemAsync(manifestKey(slot), OPTIONS);
      if (raw === null) return null;
      try {
        return ManifestSchema.parse(JSON.parse(raw));
      } catch {
        throw new QuoteDraftStorageError(
          'corrupt',
          'A local draft record is damaged. Its stored content has not been discarded.',
        );
      }
    }),
  );
}
async function writeManifest(slot: number, value: Manifest) {
  await SecureStore.setItemAsync(manifestKey(slot), JSON.stringify(value), OPTIONS);
}
async function removeGeneration(slot: number, generation: Generation | null) {
  if (!generation) return;
  const results = await Promise.allSettled(
    Array.from({ length: generation.count }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(slot, generation, index), OPTIONS),
    ),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) throw failure.reason;
}
async function removeSlot(slot: number, manifest: Manifest) {
  // Keep the manifest if any deletion fails so a later purge can retry all keys.
  await removeGeneration(slot, manifest.current);
  await removeGeneration(slot, manifest.pending);
  await removeGeneration(slot, manifest.retired);
  await SecureStore.deleteItemAsync(manifestKey(slot), OPTIONS);
}
async function purgeSlots() {
  const rows = await manifests();
  const results = await Promise.allSettled(
    rows.map((row, slot) => (row ? removeSlot(slot, row) : Promise.resolve())),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) throw failure.reason;
  await SecureStore.deleteItemAsync(PURGE_KEY, OPTIONS);
}
function chunksFor(text: string): string[] {
  const chunks: string[] = [];
  let part = '';
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    const size = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes + size > CHUNK_BYTES) {
      chunks.push(part);
      part = '';
      bytes = 0;
    }
    part += character;
    bytes += size;
  }
  if (part) chunks.push(part);
  if (chunks.length > MAX_CHUNKS)
    throw new QuoteDraftStorageError(
      'too_large',
      'This working copy exceeds local recovery storage. The previous copy is still available.',
    );
  return chunks;
}

/** Create once per authenticated user/tenant/quote. Handles are revoked on logout. */
export function createQuoteDraftStore(scope: QuoteDraftScope) {
  const verifiedScope = ScopeSchema.parse(scope);
  const capturedEpoch = purgeBlocked ? -1 : epoch;
  const scopeText = JSON.stringify([
    verifiedScope.userId,
    verifiedScope.tenantId,
    verifiedScope.quoteId,
  ]);
  const prepare = async () => {
    assertActive(capturedEpoch);
    await assertAvailable();
    // An interrupted logout must not become a restored working copy after a
    // process restart loses its in-memory epoch. Complete that durable purge first.
    const pendingPurge = await SecureStore.getItemAsync(PURGE_KEY, OPTIONS);
    if (pendingPurge !== null) {
      if (pendingPurge !== '1')
        throw new QuoteDraftStorageError('corrupt', 'Local draft cleanup requires recovery.');
      await purgeSlots();
      assertActive(capturedEpoch);
    }
    const scopeHash = await digest(scopeText);
    const rows = await manifests();
    assertActive(capturedEpoch);
    const matches = rows.flatMap((row, index) => (row?.scopeHash === scopeHash ? [index] : []));
    if (matches.length > 1)
      throw new QuoteDraftStorageError(
        'corrupt',
        'Duplicate local draft identities require storage recovery.',
      );
    return { scopeHash, rows, slot: matches[0] ?? -1 };
  };
  return {
    load: (): Promise<QuoteDraftSnapshot | null> =>
      serial(async () => {
        const { scopeHash, rows, slot } = await prepare();
        if (slot < 0 || !rows[slot]?.current) return null;
        const manifest = rows[slot]!;
        const current = manifest.current!;
        if (current.expiresAt <= Date.now()) {
          await removeSlot(slot, manifest);
          assertActive(capturedEpoch);
          return null;
        }
        const parts = await Promise.all(
          Array.from({ length: current.count }, (_, index) =>
            SecureStore.getItemAsync(chunkKey(slot, current, index), OPTIONS),
          ),
        );
        assertActive(capturedEpoch);
        if (parts.some(part => part === null))
          throw new QuoteDraftStorageError(
            'corrupt',
            'The saved working copy is incomplete. It has not been discarded.',
          );
        const raw = parts.join('');
        if ((await digest(raw)) !== current.hash)
          throw new QuoteDraftStorageError(
            'corrupt',
            'The saved working copy failed its integrity check.',
          );
        let snapshot: z.infer<typeof SnapshotSchema>;
        try {
          snapshot = SnapshotSchema.parse(JSON.parse(raw));
        } catch {
          throw new QuoteDraftStorageError(
            'corrupt',
            'The saved working copy could not be validated.',
          );
        }
        if (
          snapshot.scopeHash !== scopeHash ||
          snapshot.savedAt !== current.savedAt ||
          snapshot.expiresAt !== current.expiresAt ||
          snapshot.expiresAt - snapshot.savedAt !== QUOTE_DRAFT_RETENTION_MS
        )
          throw new QuoteDraftStorageError(
            'corrupt',
            'The saved working copy does not match this editor.',
          );
        assertActive(capturedEpoch);
        return {
          revision: snapshot.revision,
          originalTiers: snapshot.originalTiers,
          workingTiers: snapshot.workingTiers,
          ...(snapshot.narrative ? { narrative: snapshot.narrative } : {}),
          savedAt: snapshot.savedAt,
          expiresAt: snapshot.expiresAt,
        };
      }),
    save: (input: QuoteDraftInput): Promise<QuoteDraftSnapshot> => {
      // Parse/clone at invocation: a queued save cannot observe later mutations.
      let copy: z.infer<typeof InputSchema>;
      try {
        copy = InputSchema.parse(input);
      } catch {
        return Promise.reject(
          new QuoteDraftStorageError(
            'too_large',
            'This working copy cannot be stored safely. The previous copy is still available.',
          ),
        );
      }
      return serial(async () => {
        const prepared = await prepare();
        let slot = prepared.slot;
        if (slot < 0) {
          slot = prepared.rows.findIndex(row => row === null);
          if (slot < 0) {
            slot = prepared.rows.findIndex(
              row => row && (!row.current || row.current.expiresAt <= Date.now()),
            );
            // A failed first write has no committed copy. The global queue
            // proves no earlier writer is still using its recorded generation.
            // Reclaim it rather than letting interrupted attempts fill all slots.
            if (slot >= 0) {
              await removeSlot(slot, prepared.rows[slot]!);
              prepared.rows[slot] = null;
            }
          }
        }
        if (slot < 0)
          throw new QuoteDraftStorageError(
            'full',
            'Twenty quote drafts are stored on this device. Save or discard one before storing another.',
          );
        const savedAt = Date.now();
        const snapshot = {
          ...copy,
          version: 1 as const,
          scopeHash: prepared.scopeHash,
          savedAt,
          expiresAt: savedAt + QUOTE_DRAFT_RETENTION_MS,
        };
        const raw = JSON.stringify(snapshot);
        const parts = chunksFor(raw);
        const generation = { id: Crypto.randomUUID(), count: parts.length };
        const hash = await digest(raw);
        const previous = prepared.rows[slot] ?? {
          version: 1 as const,
          scopeHash: prepared.scopeHash,
          current: null,
          pending: null,
          retired: null,
        };
        await removeGeneration(slot, previous.pending);
        await removeGeneration(slot, previous.retired);
        assertActive(capturedEpoch);
        await writeManifest(slot, { ...previous, pending: generation, retired: null });
        for (const [index, part] of parts.entries()) {
          assertActive(capturedEpoch);
          await SecureStore.setItemAsync(chunkKey(slot, generation, index), part, OPTIONS);
        }
        assertActive(capturedEpoch);
        await writeManifest(slot, {
          version: 1,
          scopeHash: prepared.scopeHash,
          current: { ...generation, hash, savedAt, expiresAt: snapshot.expiresAt },
          pending: null,
          retired: previous.current
            ? { id: previous.current.id, count: previous.current.count }
            : null,
        });
        assertActive(capturedEpoch);
        return { ...copy, savedAt, expiresAt: snapshot.expiresAt };
      });
    },
    /** Only after confirmed server Save or explicit discard; never after timeout. */
    remove: (): Promise<void> =>
      serial(async () => {
        const { rows, slot } = await prepare();
        if (slot >= 0) await removeSlot(slot, rows[slot]!);
        assertActive(capturedEpoch);
      }),
  };
}
export type QuoteDraftStore = ReturnType<typeof createQuoteDraftStore>;

/** Revokes existing handles synchronously, then purges every discoverable generation. */
export function clearAllQuoteDrafts(): Promise<void> {
  epoch += 1;
  purgeBlocked = true;
  return serial(async () => {
    // The helper never stores a web fallback.
    if (Platform.OS === 'web') {
      purgeBlocked = false;
      return;
    }
    await assertAvailable();
    await SecureStore.setItemAsync(PURGE_KEY, '1', OPTIONS);
    await purgeSlots();
    purgeBlocked = false;
  });
}
