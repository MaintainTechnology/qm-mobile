/**
 * Durable acquisition state for AUTH-006.
 *
 * The SMS intent token is a short-lived capability, so it is kept only in
 * SecureStore and in the activation body. It is never used as a route/storage
 * key and is removed as soon as activation succeeds. Account bindings prevent
 * a pending flow from being resumed by a different email or Clerk user.
 */
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import { safeDestination } from '@/lib/destinations';

export const ACQUISITION_ENVELOPE_KEY = 'quotemax.auth.acquisition.v1';

const MAX_ENVELOPE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const INVITATION_RE = /^[A-Z0-9][A-Z0-9-]{0,59}$/;
const INTENT_RE = /^[A-Za-z0-9][A-Za-z0-9._~-]{3,15}$/;
const ATTRIBUTION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const CLERK_USER_RE = /^user_[A-Za-z0-9_-]{1,120}$/;

export type AcquisitionPlan = 'starter' | 'pro' | 'crew';
export type AcquisitionInterval = 'month' | 'year';
export type InvitationChannel = 'web' | 'sms';

export type AcquisitionIntent =
  | { provenance: 'sms'; status: 'pending'; token: string }
  | {
      provenance: 'sms';
      status: 'verified';
      token: string;
      /** Server-returned display context only. Activation derives it again. */
      displayPhone: string;
      expiresAt: string;
      verifiedAt: number;
    }
  | { provenance: 'sms'; status: 'expired' | 'used' | 'invalid' | 'consumed' };

export type AcquisitionProvisioningReceipt = {
  /** Copied only from a validated activation/retry response, never a route query. */
  setupComplete: boolean;
  phoneNumber?: string;
  warning?: string;
  recordedAt: number;
};

export type AcquisitionEnvelope = {
  version: 1;
  createdAt: number;
  updatedAt: number;
  activation: 'pending' | 'complete';
  subject: { email?: string; clerkUserId?: string };
  invitation?: {
    code: string;
    provenance: 'manual' | 'link' | 'sms';
  };
  intent?: AcquisitionIntent;
  attribution?: { source?: string; referral?: string };
  selection?: { plan: AcquisitionPlan; interval: AcquisitionInterval };
  returnTarget: string;
  provisioning?: AcquisitionProvisioningReceipt;
};

export type AcquisitionSearchParams = {
  code?: string | string[];
  intent?: string | string[];
  source?: string | string[];
  referral?: string | string[];
  plan?: string | string[];
  interval?: string | string[];
  returnTo?: string | string[];
};

export type AcquisitionAccount = { email?: string | null; clerkUserId?: string | null };

export type IntentResolution =
  | { status: 'verified'; displayPhone: string; expiresAt: string }
  | { status: 'expired' | 'used' | 'invalid' };

export type AcquisitionStorage = {
  getItemAsync: (key: string, options?: SecureStore.SecureStoreOptions) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: SecureStore.SecureStoreOptions,
  ) => Promise<void>;
  deleteItemAsync: (key: string, options?: SecureStore.SecureStoreOptions) => Promise<void>;
};

export type AcquisitionPersistence = {
  save: (envelope: AcquisitionEnvelope) => Promise<void>;
  /** Waits for queued writes, including a recovered prior failure. */
  drain: () => Promise<void>;
};

const SubjectSchema = z.object({
  email: z.string().max(120).optional(),
  clerkUserId: z.string().regex(CLERK_USER_RE).optional(),
});

const IntentSchema = z.discriminatedUnion('status', [
  z.object({
    provenance: z.literal('sms'),
    status: z.literal('pending'),
    token: z.string().regex(INTENT_RE),
  }),
  z.object({
    provenance: z.literal('sms'),
    status: z.literal('verified'),
    token: z.string().regex(INTENT_RE),
    displayPhone: z.string().min(1).max(32),
    expiresAt: z.string().min(1).max(64),
    verifiedAt: z.number().int().nonnegative(),
  }),
  z.object({
    provenance: z.literal('sms'),
    status: z.enum(['expired', 'used', 'invalid', 'consumed']),
  }),
]);

const EnvelopeSchema = z.object({
  version: z.literal(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  activation: z.enum(['pending', 'complete']),
  subject: SubjectSchema,
  invitation: z
    .object({
      code: z.string().regex(INVITATION_RE),
      provenance: z.enum(['manual', 'link', 'sms']),
    })
    .optional(),
  intent: IntentSchema.optional(),
  attribution: z
    .object({
      source: z.string().regex(ATTRIBUTION_RE).optional(),
      referral: z.string().regex(ATTRIBUTION_RE).optional(),
    })
    .optional(),
  selection: z
    .object({
      plan: z.enum(['starter', 'pro', 'crew']),
      interval: z.enum(['month', 'year']),
    })
    .optional(),
  returnTarget: z.string().min(1).max(1024),
  provisioning: z
    .object({
      setupComplete: z.boolean(),
      phoneNumber: z.string().min(1).max(32).optional(),
      warning: z.string().min(1).max(512).optional(),
      recordedAt: z.number().int().nonnegative(),
    })
    .optional(),
});

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const secureStorage: AcquisitionStorage = {
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: SecureStore.setItemAsync,
  deleteItemAsync: SecureStore.deleteItemAsync,
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | string[] | undefined): string | undefined {
  const trimmed = first(value)?.trim();
  return trimmed || undefined;
}

function normalizedEmail(value: string | null | undefined): string | undefined {
  const email = value?.trim().toLowerCase();
  return email && /^\S+@\S+\.\S+$/.test(email) && email.length <= 120 ? email : undefined;
}

function validatedReturnTarget(value: string | undefined): string | null {
  if (!value) return null;
  const destination = safeDestination(value);
  return destination?.audience === 'authenticated' ? destination.href : null;
}

function defaultReturnTarget(selection: AcquisitionEnvelope['selection']): string {
  return selection ? '/sections/billing' : '/';
}

/** Parse only the allowlisted acquisition fields accepted by the link registry. */
export function acquisitionEnvelopeFromParams(
  params: AcquisitionSearchParams,
  now = Date.now(),
): AcquisitionEnvelope | null {
  const rawCode = clean(params.code)?.toUpperCase();
  const code = rawCode && INVITATION_RE.test(rawCode) ? rawCode : undefined;
  const rawIntent = clean(params.intent);
  const intentToken = rawIntent && INTENT_RE.test(rawIntent) ? rawIntent : undefined;
  const rawSource = clean(params.source);
  const source = rawSource && ATTRIBUTION_RE.test(rawSource) ? rawSource : undefined;
  const rawReferral = clean(params.referral);
  const referral = rawReferral && ATTRIBUTION_RE.test(rawReferral) ? rawReferral : undefined;
  const rawPlan = clean(params.plan);
  const rawInterval = clean(params.interval);
  const selection: AcquisitionEnvelope['selection'] =
    (rawPlan === 'starter' || rawPlan === 'pro' || rawPlan === 'crew') &&
    (rawInterval === 'month' || rawInterval === 'year')
      ? { plan: rawPlan, interval: rawInterval }
      : undefined;
  const requestedReturn = clean(params.returnTo);
  const returnTarget =
    validatedReturnTarget(requestedReturn) ?? defaultReturnTarget(selection);

  if (!code && !intentToken && !source && !referral && !selection && !requestedReturn) return null;

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    activation: 'pending',
    subject: {},
    invitation: code
      ? { code, provenance: intentToken ? 'sms' : 'link' }
      : undefined,
    intent: intentToken ? { provenance: 'sms', status: 'pending', token: intentToken } : undefined,
    attribution: source || referral ? { source, referral } : undefined,
    selection,
    returnTarget,
  };
}

/** Merge a remounted URL with durable state without downgrading a verified token. */
export function mergeAcquisitionEnvelopes(
  stored: AcquisitionEnvelope | null,
  incoming: AcquisitionEnvelope | null,
  now = Date.now(),
): AcquisitionEnvelope | null {
  if (!stored) return incoming;
  if (!incoming) return { ...stored, updatedAt: now };
  // Never resurrect a one-time capability from the original deep link after
  // activation has acknowledged and redacted it.
  if (stored.activation === 'complete') return { ...stored, updatedAt: now };

  const sameToken =
    stored.intent &&
    'token' in stored.intent &&
    incoming.intent &&
    'token' in incoming.intent &&
    stored.intent.token === incoming.intent.token;
  const intent = sameToken && stored.intent?.status === 'verified' ? stored.intent : incoming.intent;

  return {
    ...stored,
    ...incoming,
    createdAt: Math.min(stored.createdAt, incoming.createdAt),
    updatedAt: now,
    subject: stored.subject,
    invitation: incoming.invitation ?? stored.invitation,
    intent: intent ?? stored.intent,
    attribution: { ...stored.attribution, ...incoming.attribution },
    selection: incoming.selection ?? stored.selection,
    returnTarget: incoming.returnTarget || stored.returnTarget,
  };
}

/** Bind once; a mismatched email or Clerk user cannot take over this envelope. */
export function bindAcquisitionAccount(
  envelope: AcquisitionEnvelope,
  account: AcquisitionAccount,
  now = Date.now(),
): AcquisitionEnvelope | null {
  const email = normalizedEmail(account.email);
  const clerkUserId = account.clerkUserId?.trim() || undefined;
  if (clerkUserId && !CLERK_USER_RE.test(clerkUserId)) return null;
  if (envelope.subject.email && email && envelope.subject.email !== email) return null;
  if (
    envelope.subject.email &&
    !envelope.subject.clerkUserId &&
    clerkUserId &&
    !email
  ) {
    // An unrelated Clerk id is not enough to claim an email-bound envelope.
    // The caller must supply the matching email while adding the first id.
    return null;
  }
  if (
    envelope.subject.clerkUserId &&
    clerkUserId &&
    envelope.subject.clerkUserId !== clerkUserId
  ) {
    return null;
  }

  return {
    ...envelope,
    updatedAt: now,
    subject: {
      email: envelope.subject.email ?? email,
      clerkUserId: envelope.subject.clerkUserId ?? clerkUserId,
    },
  };
}

export function withAcquisitionInvitation(
  envelope: AcquisitionEnvelope | null,
  rawCode: string,
  provenance: 'manual' | 'link' | 'sms',
  now = Date.now(),
): AcquisitionEnvelope | null {
  const code = rawCode.trim().toUpperCase();
  if (!INVITATION_RE.test(code)) return null;
  const base =
    envelope ??
    ({
      version: 1,
      createdAt: now,
      updatedAt: now,
      activation: 'pending',
      subject: {},
      returnTarget: '/',
    } satisfies AcquisitionEnvelope);
  return {
    ...base,
    updatedAt: now,
    invitation: { code, provenance },
  };
}

export function acquisitionBelongsToAccount(
  envelope: AcquisitionEnvelope,
  account: AcquisitionAccount,
): boolean {
  const email = normalizedEmail(account.email);
  const clerkUserId = account.clerkUserId?.trim() || undefined;
  if (envelope.subject.clerkUserId) return envelope.subject.clerkUserId === clerkUserId;
  if (envelope.subject.email) return envelope.subject.email === email;
  return true;
}

/** Apply the server result. Failed SMS links lose their SMS-prefilled code. */
export function applyIntentResolution(
  envelope: AcquisitionEnvelope,
  resolution: IntentResolution,
  now = Date.now(),
): AcquisitionEnvelope {
  const current = envelope.intent;
  if (!current || !('token' in current)) return envelope;

  if (
    resolution.status === 'verified' &&
    Number.isFinite(Date.parse(resolution.expiresAt)) &&
    Date.parse(resolution.expiresAt) > now
  ) {
    return {
      ...envelope,
      updatedAt: now,
      intent: {
        provenance: 'sms',
        status: 'verified',
        token: current.token,
        displayPhone: resolution.displayPhone,
        expiresAt: resolution.expiresAt,
        verifiedAt: now,
      },
    };
  }

  const failedStatus = resolution.status === 'verified' ? 'expired' : resolution.status;
  return {
    ...envelope,
    updatedAt: now,
    invitation:
      envelope.invitation?.provenance === 'sms' ? undefined : envelope.invitation,
    intent: { provenance: 'sms', status: failedStatus },
  };
}

/** Pending intent resolution blocks code validation; verified intent forces SMS. */
export function invitationValidationChannel(
  envelope: AcquisitionEnvelope | null,
): InvitationChannel | null {
  if (envelope?.intent?.status === 'pending') return null;
  return envelope?.intent?.status === 'verified' ? 'sms' : 'web';
}

/** The only acquisition fields permitted to enter the activation request. */
export function activationAcquisitionFields(envelope: AcquisitionEnvelope | null): {
  invitationCode: string;
  intentToken?: string;
} {
  return {
    invitationCode: envelope?.invitation?.code ?? '',
    intentToken:
      envelope?.intent?.status === 'verified' ? envelope.intent.token : undefined,
  };
}

/** Redact one-time capabilities after an acknowledged activation. */
export function completeAcquisitionEnvelope(
  envelope: AcquisitionEnvelope,
  account: AcquisitionAccount,
  now = Date.now(),
): AcquisitionEnvelope | null {
  const bound = bindAcquisitionAccount(envelope, account, now);
  if (!bound) return null;
  return {
    ...bound,
    activation: 'complete',
    invitation: undefined,
    intent: bound.intent ? { provenance: 'sms', status: 'consumed' } : undefined,
    provisioning: undefined,
    updatedAt: now,
  };
}

/** Record UI provenance from an authenticated server response. Route query
 * values must never call this helper or become trusted success state. */
export function withAcquisitionProvisioningReceipt(
  envelope: AcquisitionEnvelope,
  receipt: {
    setupComplete: boolean;
    phoneNumber?: string | null;
    warning?: string | null;
  },
  now = Date.now(),
): AcquisitionEnvelope {
  if (envelope.activation !== 'complete') return envelope;
  const phoneNumber = receipt.phoneNumber?.trim() || undefined;
  const warning = receipt.warning?.trim() || undefined;
  return {
    ...envelope,
    updatedAt: now,
    provisioning: {
      setupComplete: receipt.setupComplete === true,
      phoneNumber,
      warning,
      recordedAt: now,
    },
  };
}

export function acquisitionPostAuthDestination(envelope: AcquisitionEnvelope | null): string {
  const explicit = validatedReturnTarget(envelope?.returnTarget);
  return explicit ?? defaultReturnTarget(envelope?.selection);
}

export async function saveAcquisitionEnvelope(
  envelope: AcquisitionEnvelope,
  storage: AcquisitionStorage = secureStorage,
): Promise<void> {
  const parsed = EnvelopeSchema.parse(envelope);
  await storage.setItemAsync(ACQUISITION_ENVELOPE_KEY, JSON.stringify(parsed), SECURE_OPTIONS);
}

/** Serialize SecureStore writes so a slow pre-activation write cannot put a
 * one-time token back after the acknowledged, redacted completion write. */
export function createAcquisitionPersistence(
  storage: AcquisitionStorage = secureStorage,
): AcquisitionPersistence {
  let tail: Promise<void> = Promise.resolve();
  return {
    save(envelope) {
      const operation = tail.then(() => saveAcquisitionEnvelope(envelope, storage));
      tail = operation.catch(() => undefined);
      return operation;
    },
    drain() {
      return tail;
    },
  };
}

export async function loadAcquisitionEnvelope(
  account: AcquisitionAccount = {},
  storage: AcquisitionStorage = secureStorage,
  now = Date.now(),
): Promise<AcquisitionEnvelope | null> {
  const raw = await storage.getItemAsync(ACQUISITION_ENVELOPE_KEY, SECURE_OPTIONS);
  if (!raw) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    await storage.deleteItemAsync(ACQUISITION_ENVELOPE_KEY, SECURE_OPTIONS);
    return null;
  }
  const parsed = EnvelopeSchema.safeParse(decoded);
  if (!parsed.success || now - parsed.data.updatedAt > MAX_ENVELOPE_AGE_MS) {
    await storage.deleteItemAsync(ACQUISITION_ENVELOPE_KEY, SECURE_OPTIONS);
    return null;
  }
  if (!acquisitionBelongsToAccount(parsed.data, account)) return null;

  const envelope = parsed.data;
  if (
    envelope.intent?.status === 'verified' &&
    Date.parse(envelope.intent.expiresAt) <= now
  ) {
    const expired = applyIntentResolution(envelope, { status: 'expired' }, now);
    await saveAcquisitionEnvelope(expired, storage);
    return expired;
  }
  return envelope;
}

export async function clearAcquisitionEnvelope(
  storage: AcquisitionStorage = secureStorage,
): Promise<void> {
  await storage.deleteItemAsync(ACQUISITION_ENVELOPE_KEY, SECURE_OPTIONS);
}
