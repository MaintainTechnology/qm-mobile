/**
 * Money for QuoteMax. Every amount in this app is an integer number of cents.
 *
 * A float anywhere in a money path is a bug: `0.1 + 0.2 !== 0.3` surfaces as a quote that is a
 * cent off, and tradies notice. This module is the only place rounding is allowed to happen.
 *
 * See .claude/skills/au-conventions/SKILL.md for the rules these functions encode.
 */

/** Australian GST. Prices on quotemax.com.au are quoted ex-GST. */
export const GST_RATE = 0.1;

/**
 * Rounds half away from zero.
 *
 * `Math.round` rounds .5 toward +Infinity, so `Math.round(-2.5)` is `-2` — refunds and credits
 * would round the wrong way. Money must round symmetrically.
 */
function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Adds 10% GST to an ex-GST amount. Both in cents. */
export function addGst(exGstCents: number): number {
  return roundHalfAwayFromZero(exGstCents * (1 + GST_RATE));
}

/**
 * The GST contained in a GST-inclusive amount — one eleventh, not ten percent.
 * Ten percent of the inclusive amount is a different (and wrong) number.
 */
export function gstOf(incGstCents: number): number {
  return roundHalfAwayFromZero(incGstCents / 11);
}

/** Strips GST from a GST-inclusive amount. */
export function removeGst(incGstCents: number): number {
  return incGstCents - gstOf(incGstCents);
}

/** Formats cents as Australian currency, e.g. `A$1,234.56`. The site writes `A$`, not `$`. */
export function formatAud(cents: number): string {
  const amount = (cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `A$${amount}`;
}

/**
 * Parses user input into cents. Accepts `12.34`, `A$12.34`, `1,234.56`.
 * Returns null on anything it cannot read — callers must handle that rather than defaulting to 0,
 * because a silent 0 becomes a free job.
 */
export function parseAud(input: string): number | null {
  const cleaned = input.replace(/[A$,\s]/g, '');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return roundHalfAwayFromZero(value * 100);
}

/** The fixed site-visit fee a complex job routes to instead of being auto-quoted. Ex-GST. */
export const SITE_VISIT_FEE_CENTS = 9900;
