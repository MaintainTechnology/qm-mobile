import { CompleteSchema, completionOutcome, formatOptionalBalance } from './PayoutsScreen';

describe('payout semantic outcomes', () => {
  it('preserves a completed-but-blocked release and gives a retry next step', () => {
    const result = CompleteSchema.parse({
      ok: true,
      completed: true,
      released: false,
      completed_at: '2026-09-01T00:00:00.000Z',
      block: 'payouts_not_ready',
    });

    expect(result).toMatchObject({ completed: true, released: false, block: 'payouts_not_ready' });
    expect(completionOutcome(result)).toEqual({
      kind: 'blocked',
      message:
        'Job complete · payout is blocked until Stripe setup is finished. Finish setup, then retry release.',
    });
  });

  it('retains release-in-progress separately from released', () => {
    expect(
      completionOutcome({
        ok: true,
        completed: true,
        released: false,
        block: 'release_in_progress',
      }),
    ).toMatchObject({ kind: 'in_flight' });

    expect(
      completionOutcome({
        ok: true,
        completed: true,
        released: true,
        payout: { id: 'po_123', amount_cents: 9800 },
      }),
    ).toMatchObject({ kind: 'released' });
  });

  it('never renders an unknown balance as zero dollars', () => {
    expect(formatOptionalBalance(null)).toBe('Unavailable');
    expect(formatOptionalBalance(undefined)).toBe('Unavailable');
    expect(formatOptionalBalance(0)).toMatch(/0\.00$/);
  });
});
