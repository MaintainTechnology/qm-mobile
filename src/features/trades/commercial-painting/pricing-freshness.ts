type RefetchedPaintRun = {
  data?: {
    extraction?: { id?: string | null; priced_bom?: unknown | null } | null;
  };
  error?: unknown;
};

export type FreshPaintPricingResult = { ok: true } | { ok: false; error: unknown };

/**
 * A successful price POST is not enough: only the current extraction returned
 * by a completed refetch can make a previously-priced Save safe again.
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
    if (extraction?.id !== extractionId || !extraction.priced_bom) {
      throw new Error('Fresh pricing was not returned for the current takeoff.');
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
