import {
  ACQUISITION_ENVELOPE_KEY,
  acquisitionEnvelopeFromParams,
  acquisitionPostAuthDestination,
  activationAcquisitionFields,
  applyIntentResolution,
  bindAcquisitionAccount,
  clearAcquisitionEnvelope,
  completeAcquisitionEnvelope,
  createAcquisitionPersistence,
  invitationValidationChannel,
  loadAcquisitionEnvelope,
  mergeAcquisitionEnvelopes,
  saveAcquisitionEnvelope,
  withAcquisitionProvisioningReceipt,
  withAcquisitionInvitation,
  type AcquisitionStorage,
} from './acquisition-envelope';

const NOW = Date.parse('2026-09-01T00:00:00.000Z');
const EXPIRES = '2026-09-01T12:00:00.000Z';

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: AcquisitionStorage = {
    getItemAsync: jest.fn(async key => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async key => {
      values.delete(key);
    }),
  };
  return { values, storage };
}

function smsEnvelope() {
  const envelope = acquisitionEnvelopeFromParams(
    {
      code: 'SMS-CAMPAIGN-1',
      intent: 'sms_1234',
      source: 'spring_launch',
      referral: 'tradie_42',
      plan: 'pro',
      interval: 'year',
      returnTo: '/sections/billing',
    },
    NOW,
  );
  if (!envelope) throw new Error('Expected acquisition envelope');
  return envelope;
}

describe('AUTH-006 acquisition envelope', () => {
  it('keeps invitation, attribution, plan and a validated internal return target separate', () => {
    const envelope = smsEnvelope();

    expect(envelope.invitation).toEqual({ code: 'SMS-CAMPAIGN-1', provenance: 'sms' });
    expect(envelope.attribution).toEqual({
      source: 'spring_launch',
      referral: 'tradie_42',
    });
    expect(envelope.selection).toEqual({ plan: 'pro', interval: 'year' });
    expect(envelope.returnTarget).toBe('/sections/billing');
    expect(envelope.intent).toMatchObject({ provenance: 'sms', status: 'pending' });
  });

  it('rejects external/protocol-relative returns and invalid or incomplete plan choices', () => {
    const external = acquisitionEnvelopeFromParams(
      { source: 'campaign', returnTo: 'https://evil.example/steal' },
      NOW,
    );
    const protocolRelative = acquisitionEnvelopeFromParams(
      { source: 'campaign', returnTo: '//evil.example/steal' },
      NOW,
    );
    const badPlan = acquisitionEnvelopeFromParams(
      { source: 'campaign', plan: 'enterprise', interval: 'year' },
      NOW,
    );
    const missingInterval = acquisitionEnvelopeFromParams(
      { source: 'campaign', plan: 'pro' },
      NOW,
    );

    expect(external?.returnTarget).toBe('/');
    expect(protocolRelative?.returnTarget).toBe('/');
    expect(badPlan?.selection).toBeUndefined();
    expect(missingInterval?.selection).toBeUndefined();
  });

  it('uses SMS only after server verification and never downgrades a verified remount', () => {
    const pending = smsEnvelope();
    expect(invitationValidationChannel(pending)).toBeNull();

    const verified = applyIntentResolution(
      pending,
      { status: 'verified', displayPhone: '+61412345678', expiresAt: EXPIRES },
      NOW + 1,
    );
    expect(invitationValidationChannel(verified)).toBe('sms');
    expect(activationAcquisitionFields(verified)).toEqual({
      invitationCode: 'SMS-CAMPAIGN-1',
      intentToken: 'sms_1234',
    });

    const remounted = mergeAcquisitionEnvelopes(verified, smsEnvelope(), NOW + 2);
    expect(remounted?.intent).toMatchObject({ status: 'verified', displayPhone: '+61412345678' });
    expect(invitationValidationChannel(remounted)).toBe('sms');
  });

  it('creates a durable manual invitation envelope for ordinary signup', () => {
    const envelope = withAcquisitionInvitation(null, '  manual-code  ', 'manual', NOW);

    expect(envelope?.invitation).toEqual({ code: 'MANUAL-CODE', provenance: 'manual' });
    expect(invitationValidationChannel(envelope)).toBe('web');
  });

  it.each([
    ['expired', 'expired'],
    ['used', 'used'],
    ['invalid', 'invalid'],
  ] as const)(
    'keeps an accurate %s intent state and drops its SMS code instead of validating on web',
    (_label, status) => {
      const failed = applyIntentResolution(smsEnvelope(), { status }, NOW + 1);

      expect(failed.intent).toEqual({ provenance: 'sms', status });
      expect(failed.invitation).toBeUndefined();
      expect(invitationValidationChannel(failed)).toBe('web');
      expect(activationAcquisitionFields(failed)).toEqual({ invitationCode: '' });
    },
  );

  it('treats a server result that is already expired as expired, never verified', () => {
    const failed = applyIntentResolution(
      smsEnvelope(),
      {
        status: 'verified',
        displayPhone: '+61412345678',
        expiresAt: '2026-08-31T23:59:59.000Z',
      },
      NOW,
    );

    expect(failed.intent).toEqual({ provenance: 'sms', status: 'expired' });
    expect(failed.invitation).toBeUndefined();
  });

  it('is account-isolated across duplicate-account resume', () => {
    const emailBound = bindAcquisitionAccount(smsEnvelope(), {
      email: 'owner@example.com',
    }, NOW + 1);
    expect(emailBound).not.toBeNull();
    expect(
      bindAcquisitionAccount(emailBound!, { clerkUserId: 'user_attacker' }),
    ).toBeNull();

    expect(
      bindAcquisitionAccount(emailBound!, {
        email: 'attacker@example.com',
        clerkUserId: 'user_attacker',
      }),
    ).toBeNull();

    const userBound = bindAcquisitionAccount(
      emailBound!,
      { email: 'OWNER@example.com', clerkUserId: 'user_owner' },
      NOW + 2,
    );
    expect(userBound?.subject).toEqual({
      email: 'owner@example.com',
      clerkUserId: 'user_owner',
    });
    expect(
      bindAcquisitionAccount(userBound!, {
        email: 'owner@example.com',
        clerkUserId: 'user_other',
      }),
    ).toBeNull();
  });

  it('survives remount in SecureStore for the same account and not another one', async () => {
    const { storage } = memoryStorage();
    const bound = bindAcquisitionAccount(
      smsEnvelope(),
      { email: 'owner@example.com', clerkUserId: 'user_owner' },
      NOW + 1,
    )!;
    await saveAcquisitionEnvelope(bound, storage);

    await expect(
      loadAcquisitionEnvelope(
        { email: 'owner@example.com', clerkUserId: 'user_owner' },
        storage,
        NOW + 2,
      ),
    ).resolves.toMatchObject({ selection: { plan: 'pro', interval: 'year' } });
    await expect(
      loadAcquisitionEnvelope(
        { email: 'other@example.com', clerkUserId: 'user_other' },
        storage,
        NOW + 2,
      ),
    ).resolves.toBeNull();
  });

  it('expires a previously verified intent on remount and removes its SMS invitation', async () => {
    const { values, storage } = memoryStorage();
    const verified = applyIntentResolution(
      smsEnvelope(),
      { status: 'verified', displayPhone: '+61412345678', expiresAt: EXPIRES },
      NOW + 1,
    );
    await saveAcquisitionEnvelope(verified, storage);

    const loaded = await loadAcquisitionEnvelope({}, storage, Date.parse(EXPIRES) + 1);

    expect(loaded?.intent).toEqual({ provenance: 'sms', status: 'expired' });
    expect(loaded?.invitation).toBeUndefined();
    expect(values.get(ACQUISITION_ENVELOPE_KEY)).not.toContain('sms_1234');
  });

  it('keeps plan continuity after activation while removing the one-time token', async () => {
    const { values, storage } = memoryStorage();
    const verified = applyIntentResolution(
      smsEnvelope(),
      { status: 'verified', displayPhone: '+61412345678', expiresAt: EXPIRES },
      NOW + 1,
    );
    const complete = withAcquisitionProvisioningReceipt(
      completeAcquisitionEnvelope(
        verified,
        { email: 'owner@example.com', clerkUserId: 'user_owner' },
        NOW + 2,
      )!,
      {
        setupComplete: true,
        phoneNumber: '+61487654321',
        warning: null,
      },
      NOW + 3,
    );
    await saveAcquisitionEnvelope(complete, storage);

    const raw = values.get(ACQUISITION_ENVELOPE_KEY) ?? '';
    expect(raw).not.toContain('sms_1234');
    expect(raw).not.toContain('+61412345678');
    expect(complete.provisioning).toEqual({
      setupComplete: true,
      phoneNumber: '+61487654321',
      recordedAt: NOW + 3,
    });
    expect(complete.selection).toEqual({ plan: 'pro', interval: 'year' });
    expect(complete.attribution).toEqual({
      source: 'spring_launch',
      referral: 'tradie_42',
    });
    expect(acquisitionPostAuthDestination(complete)).toBe('/sections/billing');
    expect(acquisitionPostAuthDestination(complete)).not.toContain('intent');

    await clearAcquisitionEnvelope(storage);
    expect(values.has(ACQUISITION_ENVELOPE_KEY)).toBe(false);
  });

  it('records provisioning UI provenance only after activation is complete', () => {
    const pending = smsEnvelope();
    const queryLikeAttempt = withAcquisitionProvisioningReceipt(pending, {
      setupComplete: true,
      phoneNumber: '+61411111111',
    });
    expect(queryLikeAttempt.provisioning).toBeUndefined();

    const complete = completeAcquisitionEnvelope(
      pending,
      { email: 'owner@example.com', clerkUserId: 'user_owner' },
      NOW + 1,
    )!;
    const recorded = withAcquisitionProvisioningReceipt(
      complete,
      {
        setupComplete: false,
        phoneNumber: '+61482012345',
        warning: 'Provisioning is still pending.',
      },
      NOW + 2,
    );

    expect(recorded.provisioning).toEqual({
      setupComplete: false,
      phoneNumber: '+61482012345',
      warning: 'Provisioning is still pending.',
      recordedAt: NOW + 2,
    });
  });

  it('does not resurrect a redacted token when the original deep link remounts', () => {
    const verified = applyIntentResolution(
      smsEnvelope(),
      { status: 'verified', displayPhone: '+61412345678', expiresAt: EXPIRES },
      NOW + 1,
    );
    const complete = completeAcquisitionEnvelope(
      verified,
      { email: 'owner@example.com', clerkUserId: 'user_owner' },
      NOW + 2,
    )!;

    const remounted = mergeAcquisitionEnvelopes(complete, smsEnvelope(), NOW + 3)!;

    expect(remounted.activation).toBe('complete');
    expect(remounted.intent).toEqual({ provenance: 'sms', status: 'consumed' });
    expect(JSON.stringify(remounted)).not.toContain('sms_1234');
  });

  it('serializes writes so a slow verified write cannot overwrite completion redaction', async () => {
    const { values } = memoryStorage();
    let releaseFirstWrite: (() => void) | undefined;
    let writeCount = 0;
    const storage: AcquisitionStorage = {
      getItemAsync: jest.fn(async key => values.get(key) ?? null),
      deleteItemAsync: jest.fn(async key => {
        values.delete(key);
      }),
      setItemAsync: jest.fn(async (key, value) => {
        writeCount += 1;
        if (writeCount === 1) {
          await new Promise<void>(resolve => {
            releaseFirstWrite = resolve;
          });
        }
        values.set(key, value);
      }),
    };
    const persistence = createAcquisitionPersistence(storage);
    const verified = applyIntentResolution(
      smsEnvelope(),
      { status: 'verified', displayPhone: '+61412345678', expiresAt: EXPIRES },
      NOW + 1,
    );
    const complete = completeAcquisitionEnvelope(
      verified,
      { email: 'owner@example.com', clerkUserId: 'user_owner' },
      NOW + 2,
    )!;

    const verifiedWrite = persistence.save(verified);
    const completeWrite = persistence.save(complete);
    await Promise.resolve();
    expect(storage.setItemAsync).toHaveBeenCalledTimes(1);
    releaseFirstWrite?.();
    await Promise.all([verifiedWrite, completeWrite]);

    const raw = values.get(ACQUISITION_ENVELOPE_KEY) ?? '';
    expect(raw).not.toContain('sms_1234');
    expect(raw).not.toContain('+61412345678');
  });
});
