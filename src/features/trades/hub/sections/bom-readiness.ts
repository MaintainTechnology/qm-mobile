export type CatalogueBadge = 'catalogue' | 'generic';
export type CatalogueCategoriesByTrade = Readonly<Record<string, readonly string[]>>;

export type ReadinessBomLine = {
  material_category: string | null | undefined;
  required?: boolean | null;
  include_when?: Readonly<Record<string, unknown>> | null;
};

export function normaliseCategory(category: string | null | undefined): string {
  return (category ?? '').trim().toLowerCase();
}

export function resolveCatalogueBadge(
  lineCategory: string | null | undefined,
  catalogueCategories: readonly string[],
): CatalogueBadge {
  const target = normaliseCategory(lineCategory);
  if (!target) return 'generic';
  return catalogueCategories.some(c => normaliseCategory(c) === target) ? 'catalogue' : 'generic';
}

/**
 * Categories that make this recipe non-authoritative for the chosen trade.
 * Optional rows and rows controlled by a non-empty include_when condition are
 * not unconditional requirements, matching the estimator's recipe coverage
 * gate. Empty include_when objects are unconditional.
 */
export function missingRequiredPriceCategories(
  lines: readonly ReadinessBomLine[],
  catalogueCategoriesByTrade: CatalogueCategoriesByTrade,
  trade: string,
): string[] {
  const priced = catalogueCategoriesByTrade[normaliseCategory(trade)] ?? [];
  const missing = new Set<string>();
  for (const line of lines) {
    if (line.required === false) continue;
    if (line.include_when && Object.keys(line.include_when).length > 0) continue;
    if (resolveCatalogueBadge(line.material_category, priced) !== 'catalogue') {
      const category = normaliseCategory(line.material_category);
      if (category) missing.add(category);
    }
  }
  return [...missing];
}
