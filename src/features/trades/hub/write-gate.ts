/**
 * Mobile mirror of the backend's pricing-engine write gate.
 *
 * The web's lib/tenant/update-schema.ts pins TRADE_ENUM to electrical +
 * plumbing, and every Services / Catalogue / BOM / Tasks writer validates
 * `trade` against it — a POST for any other trade 400s. The hub still shows
 * those sections for all 8 trades (reads are unrestricted); only write forms
 * gate on this. Widening the backend enum later means widening WRITE_TRADES
 * here in one move.
 */

/** Verbatim mirror of the web's TRADE_ENUM.options (lib/tenant/update-schema.ts). */
export const WRITE_TRADES: readonly string[] = ['electrical', 'plumbing'];

/** Can Services / Catalogue / BOM / Tasks writes succeed for this trade? */
export function canWritePricingEngine(trade: string): boolean {
  return WRITE_TRADES.includes(trade.toLowerCase());
}

/**
 * Mirror of the web's lib/tenant/recipe-trades.ts recipeTradesFor(): narrow a
 * tenant's trades to the recipe-writable ones. `[]` is meaningful, not a bug —
 * a roofing-only tenant can hold no recipe, so a picker must show nothing
 * rather than fall through to every trade. Empty input falls back to the
 * writable pair so the picker still never offers an unwritable job.
 */
export function recipeTradesFor(tenantTrades: readonly string[]): string[] {
  if (tenantTrades.length === 0) return [...WRITE_TRADES];
  return tenantTrades.map(t => t.toLowerCase()).filter(t => WRITE_TRADES.includes(t));
}

/** Shared en-AU copy for a gated write surface. */
export function gatedWriteCopy(tradeLabel: string): string {
  return `Editing for ${tradeLabel.toLowerCase()} is coming to QuoteMax — manage this on the web for now.`;
}
