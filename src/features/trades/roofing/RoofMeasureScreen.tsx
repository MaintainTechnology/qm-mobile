/**
 * Roof measure (spec web-parity F1) — ported from the web tool at
 * quotemate-automation/app/dashboard/roofing/measure/page.tsx, numbers-and-cards only:
 * no maps, no 3D, no street-view, no address autocomplete (non-goals).
 *
 * Flow: type an address → POST /api/roofing/measure-all → each returned structure
 * renders as an include/exclude card with its area + priced tiers → the combined
 * total sums the included, quotable structures → Save persists the job,
 * Save as quote promotes it to a shareable customer quote.
 */
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Field, GhostButton, PrimaryCta } from '@/features/auth/ui';
import { centsFromApiDollars, formatAud } from '@/lib/money';

import { useMeasureRoof, useSaveRoof, useSaveRoofAsQuote } from './api';
import {
  AU_STATES,
  ROOF_INTENTS,
  ROOF_MATERIALS,
  ROOF_PITCHES,
  combinedIncludedTotals,
  defaultIncluded,
  includedCount,
  includedIndices1Based,
  includedInspectionStructures,
  singleQuotableIncluded,
  structureKey,
  type AuState,
  type MultiRoofQuote,
  type RoofStructurePrice,
} from './schema';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../ui';
import { fonts, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const TIER_LABELS = ['Good', 'Better', 'Best'] as const;

export function RoofMeasureScreen() {
  const { colors } = useTheme();

  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [state, setState] = useState<AuState>('NSW');
  const [material, setMaterial] = useState<string>('colorbond_corrugated');
  const [pitch, setPitch] = useState<string>('standard');
  const [intent, setIntent] = useState<string>('full_reroof');
  const [yearBuilt, setYearBuilt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [included, setIncluded] = useState<Record<string, boolean>>({});

  const measure = useMeasureRoof();
  const saveRoof = useSaveRoof();
  const saveAsQuote = useSaveRoofAsQuote();

  const quote: MultiRoofQuote | null = measure.data?.ok === true ? measure.data.quote : null;

  // A fresh measurement seeds the roof-only default, preserving any explicit
  // toggle the tradie already made for a structure keyed the same way (web parity).
  useEffect(() => {
    if (!quote) return;
    setIncluded(prev => {
      const defaults = defaultIncluded(quote);
      const next: Record<string, boolean> = { ...defaults };
      for (const key of Object.keys(defaults)) {
        const value = prev[key];
        if (value !== undefined) next[key] = value;
      }
      return next;
    });
  }, [quote]);

  const combined = quote ? combinedIncludedTotals(quote, included) : null;
  const singleIncluded = quote ? singleQuotableIncluded(quote, included) : null;
  const totalIncluded = quote ? includedCount(quote, included) : 0;
  const inspectionIncluded = quote ? includedInspectionStructures(quote, included) : [];

  function onMeasure() {
    const trimmedAddress = address.trim();
    if (trimmedAddress.length < 3) {
      setFormError('Enter the property address.');
      return;
    }
    if (!/^\d{4}$/.test(postcode.trim())) {
      setFormError('Postcode is 4 digits.');
      return;
    }
    setFormError(null);
    saveRoof.reset();
    saveAsQuote.reset();
    measure.mutate({
      address: { address: trimmedAddress, postcode: postcode.trim(), state },
      inputs: {
        material,
        pitch,
        intent,
        building_year_built: yearBuilt.trim() ? Number(yearBuilt.trim()) : null,
      },
    });
  }

  function onSave() {
    if (!quote || measure.data?.ok !== true) return;
    saveRoof.mutate({
      address: { address: address.trim(), postcode: postcode.trim(), state },
      provider: measure.data.provider,
      structures: quote.structures.map(s => ({
        buildingId: s.buildingId,
        role: s.role,
        label: s.label,
        inputs: {
          material: s.inputs.material,
          pitch: s.inputs.pitch,
          intent: s.inputs.intent,
          building_year_built: s.inputs.building_year_built ?? null,
        },
      })),
      quote,
      included_indices: includedIndices1Based(quote, included),
    });
  }

  // Restricted to the single-included-structure case (roof-save-as-quote-client-summed-price):
  // no route on the backend prices a combined multi-structure job, so rather than invent that
  // number by summing already-priced tiers client-side, this forwards the one included
  // structure's own server-computed tiers verbatim. Multi-structure jobs promote from the web
  // dashboard for now (singleIncluded is null and the button disables).
  function onSaveAsQuote() {
    if (!singleIncluded) return;
    const s = singleIncluded;
    saveAsQuote.mutate({
      address: { address: address.trim(), postcode: postcode.trim(), state },
      inputs: {
        material: s.inputs.material,
        pitch: s.inputs.pitch,
        intent: s.inputs.intent,
        building_year_built: s.inputs.building_year_built ?? null,
      },
      metrics: {
        footprint_m2: s.metrics.footprint_m2,
        sloped_area_m2: s.metrics.sloped_area_m2,
        storeys: s.metrics.storeys,
        form: s.metrics.form,
        hips: s.metrics.hips,
        valleys: s.metrics.valleys,
        ridge_lm: s.metrics.ridge_lm ?? null,
        polygon_geojson: s.metrics.polygon_geojson ?? null,
        capture_date: s.metrics.capture_date ?? null,
      },
      price: {
        area_m2: s.price.area_m2,
        effective_rate_per_m2: s.price.effective_rate_per_m2,
        tiers: s.price.tiers,
        loadings_applied: s.price.loadings_applied,
        routing: s.price.routing,
      },
    });
  }

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 16 }}>
        <SectionLabel>Property</SectionLabel>
        <Field label="Address" value={address} onChangeText={setAddress} required height={54} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Postcode"
              value={postcode}
              onChangeText={v => setPostcode(v.replace(/[^0-9]/g, '').slice(0, 4))}
              required
              height={54}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Year built"
              value={yearBuilt}
              onChangeText={v => setYearBuilt(v.replace(/[^0-9]/g, '').slice(0, 4))}
              hint="Optional"
              height={54}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>STATE</Text>
          <PillGroup options={AU_STATES.map(s => [s, s] as const)} value={state} onChange={v => setState(v as AuState)} />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>DEFAULT ROOF MATERIAL</Text>
          <PillGroup options={ROOF_MATERIALS} value={material} onChange={setMaterial} />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>ROOF PITCH</Text>
          <PillGroup options={ROOF_PITCHES} value={pitch} onChange={setPitch} />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>JOB INTENT</Text>
          <PillGroup options={ROOF_INTENTS} value={intent} onChange={setIntent} />
        </View>

        {formError ? <Notice tone="danger" label="Check the form" body={formError} /> : null}

        <PrimaryCta
          label="Measure all structures"
          onPress={onMeasure}
          loading={measure.isPending}
        />
      </Card>

      {measure.isError ? (
        <Notice
          tone="danger"
          label="Could not measure"
          body={apiErrorMessage(measure.error)}
          onRetry={onMeasure}
        />
      ) : null}

      {measure.data?.ok === false ? (
        <Notice
          tone="warn"
          label="Measurement could not complete"
          body={measure.data.detail ?? measure.data.error ?? 'Unknown error.'}
          onRetry={onMeasure}
        />
      ) : null}

      {quote ? (
        <>
          <Notice
            tone={quote.routing.decision === 'inspection_required' ? 'warn' : 'accent'}
            label={`Job routing · ${quote.routing.decision.replace(/_/g, ' ')}`}
            body={quote.routing.reason}
          />

          {quote.structures.map((s, i) => (
            <StructureCard
              key={structureKey(s, i)}
              structure={s}
              index={i}
              included={included[structureKey(s, i)] !== false}
              onToggle={() =>
                setIncluded(prev => {
                  const key = structureKey(s, i);
                  return { ...prev, [key]: prev[key] === false };
                })
              }
            />
          ))}

          <Card style={{ gap: 14 }}>
            <SectionLabel>
              Combined total · {combined?.count ?? 0} quotable of {totalIncluded} structure
              {totalIncluded === 1 ? '' : 's'} included
            </SectionLabel>
            {/* Area is display-only maths (fine to sum); the tier prices below are never
                summed client-side — they render verbatim only when exactly one included,
                quotable structure exists (the same one 'Save as quote' can act on). */}
            <Text style={[styles.combinedArea, { color: colors.textPri }]}>
              {Math.round(combined?.areaM2 ?? 0)} m² across the job
            </Text>
            {singleIncluded ? (
              <View style={styles.tierRow}>
                {singleIncluded.price.tiers.map((t, i) => (
                  <View key={t.tier} style={[styles.tierTile, { borderColor: colors.inkLine, backgroundColor: colors.inkDeep }]}>
                    <Text style={[styles.tierLabel, { color: colors.textDim }]}>{TIER_LABELS[i]?.toUpperCase()}</Text>
                    <Text style={[styles.tierValue, { color: colors.accentText }]}>
                      {formatAud(centsFromApiDollars(t.inc_gst))}
                    </Text>
                    <Text style={[styles.tierSub, { color: colors.textDim }]}>inc GST</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Notice
                tone="accent"
                label="Save as quote needs one structure"
                body="Include exactly one priced structure to save it as a customer quote — a combined multi-structure price isn't priced server-side. Promote multi-structure jobs from the web dashboard for now."
              />
            )}

            <PrimaryCta
              label={saveRoof.isPending ? 'Saving…' : 'Save job'}
              onPress={onSave}
              loading={saveRoof.isPending}
              disabled={quote.structures.length === 0}
            />
            {saveRoof.data?.ok === true ? (
              <Notice tone="accent" label="Saved" body={`Job ${saveRoof.data.id.slice(0, 8)} saved.`} />
            ) : null}
            {saveRoof.data?.ok === false ? (
              <Notice
                tone="danger"
                label="Could not save"
                body={saveRoof.data.detail ?? saveRoof.data.error}
                onRetry={onSave}
              />
            ) : null}
            {saveRoof.isError ? (
              <Notice tone="danger" label="Could not save" body={apiErrorMessage(saveRoof.error)} onRetry={onSave} />
            ) : null}

            {singleIncluded && inspectionIncluded.length > 0 ? (
              <Notice
                tone="warn"
                label="Site-visit structure(s) not in this quote"
                body={`This quote covers ${singleIncluded.label} only. ${inspectionIncluded
                  .map(s => s.label)
                  .join(', ')} still ${inspectionIncluded.length === 1 ? 'needs' : 'need'} the paid on-site visit — that's a separate quote once it's done.`}
              />
            ) : null}

            <PrimaryCta
              label={saveAsQuote.isPending ? 'Creating quote…' : 'Save as quote'}
              onPress={onSaveAsQuote}
              loading={saveAsQuote.isPending}
              disabled={!singleIncluded}
            />
            {saveAsQuote.data?.ok === true ? (
              (() => {
                const { shareUrl, existing } = saveAsQuote.data;
                return (
                  <>
                    <Notice
                      tone="accent"
                      label={existing ? 'Quote already exists' : 'Quote created'}
                      body={shareUrl}
                    />
                    <GhostButton
                      label="Share quote link"
                      onPress={() => void Share.share({ message: shareUrl })}
                    />
                  </>
                );
              })()
            ) : null}
            {saveAsQuote.isError ? (
              <Notice
                tone="danger"
                label="Could not create the quote"
                body={apiErrorMessage(saveAsQuote.error)}
                onRetry={onSaveAsQuote}
              />
            ) : null}
          </Card>
        </>
      ) : null}
    </View>
  );
}

function StructureCard({
  structure,
  index,
  included,
  onToggle,
}: {
  structure: RoofStructurePrice;
  index: number;
  included: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const inspection = structure.price.routing.decision === 'inspection_required';
  const areaLabel =
    structure.metrics.sloped_area_m2 != null ? `${Math.round(structure.metrics.sloped_area_m2)} m²` : '—';

  return (
    <Card style={[{ gap: 12 }, !included && { opacity: 0.55 }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: included }}
        onPress={onToggle}
        style={styles.structureHeader}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <SectionLabel>
            {structure.role === 'primary' ? 'Main dwelling' : 'Secondary structure'} ·{' '}
            {String(index + 1).padStart(2, '0')}
          </SectionLabel>
          <Text style={[styles.structureLabel, { color: colors.textPri }]}>{structure.label}</Text>
        </View>
        <View
          style={[styles.checkbox, { borderColor: included ? colors.accent : colors.inkLine, backgroundColor: included ? colors.accent : 'transparent' }]}
        >
          {included ? <Text style={{ color: colors.accentInk, fontFamily: fonts.sans.bold, fontSize: 12 }}>✓</Text> : null}
        </View>
      </Pressable>

      <Text style={[styles.structureArea, { color: colors.textSec }]}>
        {areaLabel} sloped area · {structure.metrics.form} · {structure.inputs.material.replace(/_/g, ' ')}
      </Text>

      <View style={styles.tierRow}>
        {structure.price.tiers.map((t, i) => (
          <View key={t.tier} style={[styles.tierTile, { borderColor: colors.inkLine, backgroundColor: colors.inkDeep }]}>
            <Text style={[styles.tierLabel, { color: colors.textDim }]}>{TIER_LABELS[i]?.toUpperCase()}</Text>
            <Text style={[styles.tierValue, { color: colors.textPri }]}>{formatAud(centsFromApiDollars(t.inc_gst))}</Text>
            <Text style={[styles.tierSub, { color: colors.textDim }]}>inc GST</Text>
          </View>
        ))}
      </View>

      {inspection ? (
        <Notice tone="warn" label="Needs an on-site visit" body={structure.price.routing.reason} />
      ) : null}
      {structure.price.call_out_minimum_applied ? (
        <Text style={[styles.calloutNote, { color: colors.textDim }]}>
          Call-out minimum applied — this structure is small enough that the price is floored to the
          minimum job charge.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  label: {
    marginBottom: 8,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  combinedArea: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: -0.4,
  },
  tierRow: { flexDirection: 'row', gap: 10 },
  tierTile: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, gap: 6 },
  tierLabel: { fontFamily: fonts.sans.semiBold, fontSize: 10, letterSpacing: 0.8 },
  tierValue: { fontFamily: fonts.mono.bold, fontSize: 16, fontVariant: ['tabular-nums'] },
  tierSub: { fontFamily: fonts.mono.medium, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
  structureHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: touch.minimum },
  structureLabel: { marginTop: 4, fontFamily: fonts.sans.bold, fontSize: 16 },
  structureArea: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 18 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calloutNote: { fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 18 },
});
