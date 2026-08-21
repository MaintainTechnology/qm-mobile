/**
 * Pure numeric-field validators for the Menu tab's pricing editors (spec web-parity G2). Bounds
 * mirror what the backend actually enforces — quotemate-automation lib/onboard/schema.ts (the
 * activation bounds G2 is told to match) and lib/roofing/rate-card-overlay.ts +
 * lib/painting/rate-card-overlay.ts (the same bounds, re-enforced server-side on every save via
 * the dedicated rate-card routes — see api.ts's header comment for why those routes, not
 * `/api/tenant/me`, are what roofing/painting rates actually PATCH).
 *
 * A field that fails to parse always blocks Save (`error` set) rather than silently sending 0. A
 * *blank* field is different: for a required field (labour rates) blank blocks Save too; for an
 * optional rate-card field (roofing/painting) blank is a legitimate "clear this override, use the
 * default" state — mirrored from the web editors' own blank-means-default behaviour, and the
 * literal mechanism the web's roofing editor uses to keep a material "never auto-quoted" (a blank
 * Cement sheet rate).
 */
import { parseAud } from '@/lib/money';

export type RateBound = {
  /** Strictly greater than zero, vs. zero being an allowed value. */
  positive?: boolean;
  /** Inclusive upper bound, in dollars (not cents — matches how the bounds read in the schemas). */
  maxDollars?: number;
  /** Blank blocks Save when true (default). Set false for a rate-card field where blank means
   *  "no override — fall back to the default". */
  required?: boolean;
};

export type ParsedRate = {
  cents: number | null;
  error: string | null;
  /** True only when the field held a value that parsed cleanly — false for both a blocking error
   *  and a valid, intentional blank. Callers use this to decide whether to include the field in
   *  the outgoing PATCH body or omit/clear it. */
  provided: boolean;
};

export function parseRateCents(raw: string, bound: RateBound = {}): ParsedRate {
  const required = bound.required ?? true;
  const trimmed = raw.trim();
  if (trimmed === '') {
    return required
      ? { cents: null, error: 'Enter an amount', provided: false }
      : { cents: null, error: null, provided: false };
  }
  const cents = parseAud(trimmed);
  if (cents === null) return { cents: null, error: 'Enter a valid amount', provided: false };
  if (bound.positive ? cents <= 0 : cents < 0) {
    return {
      cents: null,
      error: bound.positive ? 'Must be more than A$0' : 'Must be A$0 or more',
      provided: false,
    };
  }
  if (bound.maxDollars !== undefined && cents > bound.maxDollars * 100) {
    return { cents: null, error: `Must be at most A$${bound.maxDollars}`, provided: false };
  }
  return { cents, error: null, provided: true };
}

export type ParsedPercent = { value: number | null; error: string | null };

/** Parses a plain (non-money) percentage field, e.g. materials markup. Always required — none of
 *  G2's percentage fields have a "blank means default" meaning. */
export function parsePercent(raw: string, max = 100): ParsedPercent {
  const trimmed = raw.trim();
  if (trimmed === '' || !/^\d*\.?\d*$/.test(trimmed)) {
    return { value: null, error: 'Enter a percentage' };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > max) {
    return { value: null, error: `Enter 0–${max}` };
  }
  return { value, error: null };
}
