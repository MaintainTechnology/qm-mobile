import { apiDollarsFromCents } from '@/lib/money';
import type { TenantMe } from '@/lib/tenant';

import { rateToInput, type LabourPricingFields } from './api';
import { parsePercent, parseRateCents } from './validation';

export type TradeValues = { hourly: string; callOut: string; markup: string };
export type TradeFieldErrors = Record<string, Partial<TradeValues>>;

export const BLANK_TRADE_VALUES: TradeValues = { hourly: '', callOut: '', markup: '' };

export function seedLabourValues(
  trades: readonly string[],
  pricingBooks: TenantMe['pricing_books'],
): Record<string, TradeValues> {
  return Object.fromEntries(
    trades.map(trade => {
      const row = pricingBooks?.find(book => book.trade === trade) ?? null;
      return [
        trade,
        {
          hourly: rateToInput(row?.hourly_rate),
          callOut: rateToInput(row?.call_out_minimum),
          markup: rateToInput(row?.default_markup_pct),
        },
      ] as const;
    }),
  );
}

function sameValues(a: TradeValues, b: TradeValues): boolean {
  return (
    a.hourly.trim() === b.hourly.trim() &&
    a.callOut.trim() === b.callOut.trim() &&
    a.markup.trim() === b.markup.trim()
  );
}

export type LabourEditorState = {
  baseline: Record<string, TradeValues>;
  values: Record<string, TradeValues>;
};

export type LabourEditorAction =
  | { type: 'EDIT'; trade: string; field: keyof TradeValues; value: string }
  | { type: 'REMOTE'; incoming: Record<string, TradeValues> }
  | { type: 'ACK'; trades: readonly string[]; submitted: Record<string, TradeValues> };

/**
 * Keep remote truth and the last acknowledged save as a moving baseline.
 * Remote changes refresh clean fields but never clobber text edited locally.
 */
export function labourEditorReducer(
  state: LabourEditorState,
  action: LabourEditorAction,
): LabourEditorState {
  if (action.type === 'EDIT') {
    return {
      ...state,
      values: {
        ...state.values,
        [action.trade]: {
          ...(state.values[action.trade] ?? BLANK_TRADE_VALUES),
          [action.field]: action.value,
        },
      },
    };
  }

  if (action.type === 'ACK') {
    const baseline = { ...state.baseline };
    for (const trade of action.trades) {
      const submitted = action.submitted[trade];
      if (submitted) baseline[trade] = submitted;
    }
    return { ...state, baseline };
  }

  const values: Record<string, TradeValues> = {};
  for (const [trade, incoming] of Object.entries(action.incoming)) {
    const previousBaseline = state.baseline[trade] ?? BLANK_TRADE_VALUES;
    const current = state.values[trade] ?? previousBaseline;
    values[trade] = sameValues(current, previousBaseline) ? incoming : current;
  }
  return { baseline: action.incoming, values };
}

export type LabourSavePlan = {
  valid: boolean;
  errors: TradeFieldErrors;
  patch: Record<string, LabourPricingFields>;
};

export function buildLabourSavePlan(
  trades: readonly string[],
  values: Record<string, TradeValues>,
  baseline: Record<string, TradeValues>,
): LabourSavePlan {
  const errors: TradeFieldErrors = {};
  const patch: Record<string, LabourPricingFields> = {};
  let valid = true;

  for (const trade of trades) {
    const value = values[trade] ?? BLANK_TRADE_VALUES;
    const hourly = parseRateCents(value.hourly, { positive: true });
    const callOut = parseRateCents(value.callOut);
    const markup = parsePercent(value.markup);
    const fieldErrors: Partial<TradeValues> = {};
    if (hourly.error) fieldErrors.hourly = hourly.error;
    if (callOut.error) fieldErrors.callOut = callOut.error;
    if (markup.error) fieldErrors.markup = markup.error;
    if (Object.keys(fieldErrors).length > 0) {
      errors[trade] = fieldErrors;
      valid = false;
      continue;
    }
    if (hourly.cents == null || callOut.cents == null || markup.value == null) {
      valid = false;
      continue;
    }
    if (sameValues(value, baseline[trade] ?? BLANK_TRADE_VALUES)) continue;

    patch[trade] = {
      hourly_rate: apiDollarsFromCents(hourly.cents),
      call_out_minimum: apiDollarsFromCents(callOut.cents),
      default_markup_pct: markup.value,
    };
  }

  return { valid, errors, patch };
}
