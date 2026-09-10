import { PriceSchema, PricedBomSchema, type PricedBom } from './api';
import { PaintReviewSchema, paintInputKey } from './pricing-contract';
import { paintEditMatchesDisplay, type PaintEditSnapshot } from './edit-review';

type RefetchedPaintRun = {
  data?: {
    run?: unknown;
    edit_snapshot?: PaintEditSnapshot | null;
    edit_review_state?: string;
    extraction?: {
      id?: string | null;
      priced_bom?: unknown | null;
      priced_at?: string | null;
      pricing_review?: unknown;
    } | null;
  };
  error?: unknown;
};

export const PAINT_PRICING_PROOF_MESSAGE =
  'QuoteMax refreshed this pricing preview, but the server did not return a versioned tenant-rate and takeoff proof. Save stays unavailable until that pricing provenance is enabled.';

/** Older servers remain readable, but cannot authorize a new quote Save. */
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
} | {
  ok: true; previewRefreshed: true; bom: PricedBom;
  review: { pricingProof: string; pricedAt: string };
  labourBasis: { mode: 'tenant' | 'override'; ratePerHr: number | null };
  error?: never;
};

export type PaintPricingAttempt = {
  sequence: number;
  runId: string;
  extractionId: string;
};

/** Preserve Postgres microseconds when comparing its raw timestamp to review metadata. */
export function canonicalPaintTimestamp(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00(?::00)?)$/.exec(value);
  return match ? `${match[1]}.${(match[2] ?? '').padEnd(6, '0')}Z` : null;
}

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
 * needs the identical versioned proof, generation and BOM read back from the
 * owned extraction. A concurrent Price cannot silently replace this review.
 */
export async function repriceAndProveFreshBom(
  reprice: () => Promise<unknown>,
  refetch: () => Promise<RefetchedPaintRun>,
  extractionId: string,
  labourRatePerHr?: number,
  expectedRevision?: string,
): Promise<FreshPaintPricingResult> {
  try {
    const priced = await reprice();
    const refreshed = await refetch();
    if (refreshed.error) throw refreshed.error;
    const extraction = refreshed.data?.extraction;
    if (expectedRevision && (!refreshed.data?.edit_snapshot || refreshed.data.edit_review_state !== 'matched' ||
      refreshed.data.edit_snapshot.released || refreshed.data.edit_snapshot.revision !== expectedRevision ||
      !paintEditMatchesDisplay(refreshed.data.edit_snapshot, refreshed.data.run, extraction))) {
      throw new Error('The takeoff changed during pricing. Refresh and review it before pricing again.');
    }
    if (
      extraction?.id !== extractionId ||
      !extraction.priced_bom ||
      typeof extraction.priced_at !== 'string' ||
      extraction.priced_at.trim() === ''
    ) {
      throw new Error('Fresh pricing was not returned for the current takeoff.');
    }

    const result = PriceSchema.safeParse(priced);
    const review = PaintReviewSchema.safeParse(extraction.pricing_review);
    if (!result.success || !result.data.pricingProof || !result.data.pricedAt || !review.success ||
        !result.data.labourBasis || result.data.usesSeedDefaults !== false || !result.data.rateRows) {
      return { ok: false, error: new PaintPricingProofUnavailableError(), previewRefreshed: true };
    }
    const response = result.data;
    if (response.pricingProof !== review.data.pricingProof || response.pricedAt !== review.data.pricedAt ||
        canonicalPaintTimestamp(extraction.priced_at) !== review.data.pricedAt ||
        paintInputKey(response.bom) !== paintInputKey(PricedBomSchema.parse(extraction.priced_bom)) ||
        response.gst_registered !== response.bom.gstRegistered || response.bom.unmatched.length > 0 ||
        response.bom.lines.length === 0 ||
        response.labourBasis!.mode !== (labourRatePerHr === undefined ? 'tenant' : 'override') ||
        (labourRatePerHr !== undefined && (response.labourBasis!.ratePerHr !== labourRatePerHr || response.bom.labour.ratePerHr !== labourRatePerHr))) {
      throw new Error('The takeoff or pricing changed during review. Re-price before saving.');
    }
    return { ok: true, previewRefreshed: true, review: review.data, bom: response.bom, labourBasis: response.labourBasis! };
  } catch (error) {
    return { ok: false, error, previewRefreshed: false };
  }
}
