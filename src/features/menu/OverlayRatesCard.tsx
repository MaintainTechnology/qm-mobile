/**
 * G2 — one generic editor for the two overlay-backed rate cards (roofing materials, painting
 * scopes + call-out minimum). Both `/api/tenant/{roofing,painting}-rates` routes REPLACE the
 * whole `overrides` object per PATCH (see api.ts's header), so Save here always starts from the
 * currently-loaded overrides and merges in only the fields this card edited — a nested map (e.g.
 * `reroof_rate_per_m2`) is copied, not rebuilt, so a key the web dashboard added (an 8th material)
 * survives a mobile save untouched. A blank field deletes its key rather than writing `null` —
 * that's how every route here expresses "no override, use the default".
 *
 * A 200 response can still carry `ok: false` (validation failed server-side) — Save is only
 * reported successful when `ok === true`, mirroring RoofMeasureScreen's own `data?.ok` branches.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { Field } from '@/features/auth/ui';
import { apiErrorMessage } from '@/lib/api';
import { apiDollarsFromCents } from '@/lib/money';
import { useTheme } from '@/lib/useTheme';

import type { OverlayGet, OverlayPatchResult } from './api';
import { CardBox, CardHint, RateCard, RetryLine } from './CardChrome';
import { parseRateCents, type RateBound } from './validation';

type Overrides = Record<string, unknown>;

export type OverlayField = {
  key: string;
  label: string;
  suffix?: string;
  bound: RateBound;
  /** Nested map key holding this field inside `overrides` (e.g. `reroof_rate_per_m2`). Omit for
   *  a flat, top-level field (e.g. painting's call-out minimum). */
  mapKey?: string;
};

function numberAt(container: unknown, key: string): number | undefined {
  if (container == null || typeof container !== 'object') return undefined;
  const v = (container as Record<string, unknown>)[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function OverlayRatesCard({
  title,
  hint,
  emptyHint,
  fields,
  useQuery,
  useSave,
}: {
  title: string;
  hint: string;
  /** Shown instead of the editor when this trade has no pricing book row yet. */
  emptyHint: string;
  fields: readonly OverlayField[];
  useQuery: () => UseQueryResult<OverlayGet>;
  useSave: () => UseMutationResult<OverlayPatchResult, unknown, Overrides>;
}) {
  const { colors } = useTheme();
  const rates = useQuery();
  const save = useSave();

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f.key, ''])),
  );
  const [seeded, setSeeded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Seed once the current overrides arrive — a later refetch (e.g. after a save) must not clobber
  // whatever the tradie is mid-typing.
  useEffect(() => {
    if (!rates.data || seeded) return;
    const overrides = rates.data.overrides ?? {};
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = numberAt(f.mapKey ? overrides[f.mapKey] : overrides, f.key);
      next[f.key] = v === undefined ? '' : String(v);
    }
    setValues(next);
    setSeeded(true);
    // fields is a stable literal from the caller's config, not state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates.data, seeded]);

  if (rates.isPending) {
    return (
      <CardBox title={title}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
      </CardBox>
    );
  }
  if (rates.isError) {
    return (
      <CardBox title={title}>
        <RetryLine
          message={`Couldn’t load your ${title.toLowerCase()}.`}
          onRetry={() => rates.refetch()}
        />
      </CardBox>
    );
  }
  if (rates.data.has_pricing_book === false) {
    return (
      <CardBox title={title}>
        <CardHint>{emptyHint}</CardHint>
      </CardBox>
    );
  }

  function onSave() {
    const nextErrors: Record<string, string> = {};
    const parsed = fields.map(f => ({
      field: f,
      result: parseRateCents(values[f.key] ?? '', f.bound),
    }));
    for (const { field, result } of parsed) {
      if (result.error) nextErrors[field.key] = result.error;
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Round-trip the raw overrides untouched, only copying (not dropping) the map this card owns
    // so an unknown key another client added survives.
    const overrides: Overrides = { ...(rates.data?.overrides ?? {}) };
    const mapDrafts = new Map<string, Record<string, unknown>>();
    function draftFor(mapKey: string): Record<string, unknown> {
      const existing = mapDrafts.get(mapKey);
      if (existing) return existing;
      const source = overrides[mapKey];
      const draft: Record<string, unknown> =
        source != null && typeof source === 'object'
          ? { ...(source as Record<string, unknown>) }
          : {};
      mapDrafts.set(mapKey, draft);
      return draft;
    }
    for (const { field, result } of parsed) {
      const target = field.mapKey ? draftFor(field.mapKey) : overrides;
      if (result.provided && result.cents != null)
        target[field.key] = apiDollarsFromCents(result.cents);
      else delete target[field.key];
    }
    for (const [mapKey, draft] of mapDrafts) overrides[mapKey] = draft;

    save.mutate(overrides);
  }

  return (
    <RateCard
      title={title}
      hint={hint}
      onSave={onSave}
      saving={save.isPending}
      error={
        save.isError
          ? apiErrorMessage(
              save.error,
              'Couldn’t reach QuoteMax — check your connection and try again.',
            )
          : save.data?.ok === false
            ? (save.data.error ??
              save.data.issues?.map(i => i.message).join(' · ') ??
              'That didn’t save — try again.')
            : null
      }
      saved={save.data?.ok === true}
    >
      {fields.map(f => (
        <Field
          key={f.key}
          label={f.label}
          value={values[f.key] ?? ''}
          onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
          prefix="A$"
          suffix={f.suffix}
          keyboardType="decimal-pad"
          error={fieldErrors[f.key]}
        />
      ))}
    </RateCard>
  );
}
