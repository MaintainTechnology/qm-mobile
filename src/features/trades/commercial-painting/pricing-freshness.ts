type RefetchedPaintRun = {
  data?: {
    extraction?: {
      id?: string | null;
      priced_bom?: unknown | null;
      priced_at?: string | null;
    } | null;
  };
  error?: unknown;
};

export const PAINT_PRICING_PROOF_MESSAGE =
  'QuoteMax refreshed this pricing preview, but the server did not return a versioned tenant-rate and takeoff proof. Save stays unavailable until that pricing provenance is enabled.';

/**
 * The paired web API currently persists only `priced_bom` + `priced_at` and
 * returns `usesSeedDefaults`; none of those identifies the tenant rate
 * revision or the takeoff-input revision used by the calculation. Treating a
 * timestamp as that proof would fabricate authority.
 */
export class PaintPricingProofUnavailableError extends Error {
  readonly code = 'versioned_pricing_proof_unavailable';

  constructor() {
    super(PAINT_PRICING_PROOF_MESSAGE);
    this.name = 'PaintPricingProofUnavailableError';
  }
}

export function isPaintPricingProofUnavailable(
  error: unknown,
): error is PaintPricingProofUnavailableError {
  return (
    error instanceof PaintPricingProofUnavailableError ||
    (error instanceof Error &&
      (error as Error & { code?: unknown }).code === 'versioned_pricing_proof_unavailable')
  );
}

export type FreshPaintPricingResult = {
  ok: false;
  error: unknown;
  /** True only when the current extraction's freshly persisted preview was read back. */
  previewRefreshed: boolean;
};

export type PaintPricingAttempt = {
  sequence: number;
  runId: string;
  extractionId: string;
};

/** A late response can update UI state only for the exact request context that started it. */
export function isCurrentPaintPricingAttempt(
  attempt: PaintPricingAttempt,
  current: {
    sequence: number;
    runId: string | null;
    extractionId: string | null;
  },
): boolean {
  return (
    attempt.sequence === current.sequence &&
    attempt.runId === current.runId &&
    attempt.extractionId === current.extractionId
  );
}

/**
 * A successful price POST is not enough: only the current extraction returned
 * by a completed refetch may supply a read-only preview. Save additionally
 * needs versioned server provenance, which the current API does not expose.
 */
export async function repriceAndProveFreshBom(
  reprice: () => Promise<unknown>,
  refetch: () => Promise<RefetchedPaintRun>,
  extractionId: string,
): Promise<FreshPaintPricingResult> {
  try {
    await reprice();
    const refreshed = await refetch();
    if (refreshed.error) throw refreshed.error;
    const extraction = refreshed.data?.extraction;
    if (
      extraction?.id !== extractionId ||
      !extraction.priced_bom ||
      typeof extraction.priced_at !== 'string' ||
      extraction.priced_at.trim() === ''
    ) {
      throw new Error('Fresh pricing was not returned for the current takeoff.');
    }

    // `priced_at` proves persistence, not which input/rate revisions were
    // consumed. The server has no stronger proof field today, so Save must
    // remain disabled even though the read-only preview is current.
    return {
      ok: false,
      error: new PaintPricingProofUnavailableError(),
      previewRefreshed: true,
    };
  } catch (error) {
    return { ok: false, error, previewRefreshed: false };
  }
}
