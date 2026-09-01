export type CatalogueBadge = 'catalogue' | 'generic';
export type CatalogueCategoriesByTrade = Readonly<Record<string, readonly string[]>>;

export type ReadinessBomLine = {
  material_category: string | null | undefined;
  required?: boolean | null;
  include_when?: Readonly<Record<string, unknown>> | null;
};

export type RecipeConditionResult = 'include' | 'exclude' | 'unknown';

export type RecipePriceReadiness = {
  missingRequiredCategories: string[];
  /** Conditional rows the native recipe preview cannot resolve without a quote headline product. */
  conditionalContextCategories: string[];
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

function normaliseAttribute(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (value === 1) return 'true';
    if (value === 0) return 'false';
    return String(value);
  }
  const text = String(value).trim().toLowerCase();
  if (text === 'yes' || text === 'y' || text === '1') return 'true';
  if (text === 'no' || text === 'n' || text === '0') return 'false';
  return text;
}

/** Mobile mirror of web `shouldIncludeLine`, with unknown kept distinct for honest preview copy. */
export function evaluateRecipeCondition(
  condition: Readonly<Record<string, unknown>> | null | undefined,
  headlineProperties: Readonly<Record<string, unknown>> | null | undefined,
): RecipeConditionResult {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return 'include';
  const keys = Object.keys(condition);
  if (keys.length === 0) return 'include';
  const properties =
    headlineProperties && typeof headlineProperties === 'object' ? headlineProperties : {};
  let unknown = false;

  for (const key of keys) {
    const has = Object.prototype.hasOwnProperty.call(properties, key);
    const actual = has ? properties[key] : undefined;
    if (!has || actual === null || actual === '') {
      unknown = true;
      continue;
    }
    if (normaliseAttribute(actual) !== normaliseAttribute(condition[key])) return 'exclude';
  }
  return unknown ? 'unknown' : 'include';
}

/**
 * Readiness for the chosen trade. Required conditional rows stay required
 * when product attributes are unknown; known mismatches are genuinely
 * excluded. Conditions are evaluated against the resolved headline product,
 * never the accessory line itself.
 */
export function assessRecipePriceReadiness(
  lines: readonly ReadinessBomLine[],
  catalogueCategoriesByTrade: CatalogueCategoriesByTrade,
  trade: string,
  headlineProperties?: Readonly<Record<string, unknown>> | null,
): RecipePriceReadiness {
  const priced = catalogueCategoriesByTrade[normaliseCategory(trade)] ?? [];
  const missing = new Set<string>();
  const conditionalContext = new Set<string>();
  for (const line of lines) {
    const condition = evaluateRecipeCondition(line.include_when, headlineProperties);
    const category = normaliseCategory(line.material_category);
    if (condition === 'unknown' && category) conditionalContext.add(category);
    if (line.required === false || condition === 'exclude') continue;
    if (resolveCatalogueBadge(line.material_category, priced) !== 'catalogue') {
      if (category) missing.add(category);
    }
  }
  return {
    missingRequiredCategories: [...missing],
    conditionalContextCategories: [...conditionalContext],
  };
}

export function missingRequiredPriceCategories(
  lines: readonly ReadinessBomLine[],
  catalogueCategoriesByTrade: CatalogueCategoriesByTrade,
  trade: string,
  headlineProperties?: Readonly<Record<string, unknown>> | null,
): string[] {
  return assessRecipePriceReadiness(lines, catalogueCategoriesByTrade, trade, headlineProperties)
    .missingRequiredCategories;
}
