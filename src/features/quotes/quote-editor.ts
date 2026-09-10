export const EDITOR_TIER_KEYS = ['good', 'better', 'best'] as const;
export type EditorTierKey = (typeof EDITOR_TIER_KEYS)[number];

export type EditorLine = {
  key: string;
  originalIndex: number | null;
  description: string;
  quantity: string;
  price: string;
  /** Preserved by the working copy; not an independent web-parity control. */
  unit?: string;
  source?: string;
  supplied_by?: string;
  safety_note?: string;
};
export type EditorTier = { label: string; timeframe?: string; lines: EditorLine[] };
export type EditorTiers = Partial<Record<EditorTierKey, EditorTier>>;
export type EditableTierSource = {
  label?: string | null;
  timeframe?: string | null;
  line_items?: Record<string, unknown>[] | null;
};

function textValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
function numberValue(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? String(value) : '';
}

/** Never reconstruct money from totals. Each input starts from the owned persisted line. */
export function editableTiers(
  source: Partial<Record<EditorTierKey, EditableTierSource | null>>,
): EditorTiers {
  const tiers: EditorTiers = {};
  for (const key of EDITOR_TIER_KEYS) {
    const tier = source[key];
    if (!tier) continue;
    tiers[key] = {
      label: tier.label ?? '',
      timeframe: tier.timeframe ?? undefined,
      lines: (tier.line_items ?? []).map((line, index) => ({
        key: `${key}:${index}`,
        originalIndex: index,
        description: textValue(line.description) ?? '',
        quantity: numberValue(line.quantity),
        price: numberValue(line.unit_price_ex_gst),
        unit: textValue(line.unit),
        source: textValue(line.source),
        supplied_by: textValue(line.supplied_by),
        safety_note: textValue(line.safety_note),
      })),
    };
  }
  return tiers;
}

export function newManualLine(key: string): EditorLine {
  return {
    key,
    originalIndex: null,
    description: '',
    quantity: '',
    price: '',
    source: 'tradie_edit',
  };
}

function decimal(value: string): number | null {
  const input = value.trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(input)) return null;
  const parsed = Number(input);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export class QuoteEditorValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('\n'));
    this.name = 'QuoteEditorValidationError';
  }
}

export type TierEditPayload = {
  label: string;
  timeframe?: string;
  line_items: {
    description: string;
    quantity: number;
    unit_price_ex_gst: number;
    original_line_index?: number;
    unit?: string;
    source?: string;
    supplied_by?: string;
    safety_note?: string;
  }[];
};

/** Quiet save is explicit; caller must separately confirm any server-permitted force exception. */
export function quoteEditPayload(tiers: EditorTiers, revision: string, force = false) {
  const problems: string[] = [];
  const payload: Partial<Record<EditorTierKey, TierEditPayload>> = {};
  if (!/^[a-f0-9]{64}$/.test(revision)) problems.push('Reload this quote before saving.');
  if (!EDITOR_TIER_KEYS.some(key => tiers[key])) problems.push('At least one tier is required.');
  for (const key of EDITOR_TIER_KEYS) {
    const tier = tiers[key];
    if (!tier) continue;
    const label = tier.label.trim();
    if (!label || label.length > 120) problems.push(`${key}: use a label of 1–120 characters.`);
    if ((tier.timeframe?.trim().length ?? 0) > 60)
      problems.push(`${key}: the saved timeframe exceeds 60 characters.`);
    if (tier.lines.length === 0) problems.push(`${key}: keep at least one line item.`);
    const line_items: TierEditPayload['line_items'] = [];
    for (const [index, line] of tier.lines.entries()) {
      const description = line.description.trim();
      const quantity = decimal(line.quantity);
      const price = decimal(line.price);
      if (!description || description.length > 200)
        problems.push(`${key}, line ${index + 1}: use a description of 1–200 characters.`);
      if (quantity == null || price == null)
        problems.push(`${key}, line ${index + 1}: enter nonnegative decimal quantity and price.`);
      if ((line.unit?.trim().length ?? 0) > 20)
        problems.push(`${key}, line ${index + 1}: the saved unit exceeds 20 characters.`);
      line_items.push({
        description,
        quantity: quantity ?? 0,
        unit_price_ex_gst: price ?? 0,
        ...(line.originalIndex == null ? {} : { original_line_index: line.originalIndex }),
        ...(line.unit === undefined ? {} : { unit: line.unit }),
        ...(line.source === undefined ? {} : { source: line.source }),
        ...(line.supplied_by === undefined ? {} : { supplied_by: line.supplied_by }),
        ...(line.safety_note === undefined ? {} : { safety_note: line.safety_note }),
      });
    }
    payload[key] = {
      label,
      ...(tier.timeframe === undefined ? {} : { timeframe: tier.timeframe }),
      line_items,
    };
  }
  if (problems.length) throw new QuoteEditorValidationError(problems);
  return {
    ...payload,
    expected_revision: revision,
    notify_customer: false as const,
    ...(force ? { force: true as const } : {}),
  };
}

/** Bind asynchronous proposals to the exact unsaved working copy that produced them. */
export function editorInputIdentity(tiers: EditorTiers, revision: string): string {
  return JSON.stringify([revision, EDITOR_TIER_KEYS.map(key => [key, tiers[key] ?? null])]);
}

/** Proposal indices refer to the persisted baseline, never the reordered proposal array. */
export function applyProposedTiers(
  current: EditorTiers,
  proposal: Partial<Record<EditorTierKey, EditableTierSource | null>>,
): EditorTiers {
  const next = { ...current };
  for (const key of EDITOR_TIER_KEYS) {
    if (!(key in proposal)) continue;
    const tier = proposal[key];
    if (!tier) throw new QuoteEditorValidationError(['A proposal cannot remove a complete tier.']);
    const parsed = editableTiers({ [key]: tier })[key]!;
    parsed.lines = parsed.lines.map((line, index) => {
      const originalIndex = tier.line_items?.[index]?.original_line_index;
      if (
        originalIndex !== undefined &&
        (!Number.isInteger(originalIndex) || Number(originalIndex) < 0)
      )
        throw new QuoteEditorValidationError([
          'The proposed line identity is invalid. Request a new proposal.',
        ]);
      return {
        ...line,
        key: `proposal:${key}:${index}`,
        originalIndex: originalIndex === undefined ? null : Number(originalIndex),
      };
    });
    next[key] = parsed;
  }
  return next;
}
