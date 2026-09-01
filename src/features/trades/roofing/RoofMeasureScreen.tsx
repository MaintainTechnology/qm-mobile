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
import { useEffect, useRef, useState } from 'react';
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
  acceptsRoofMeasureRun,
  defaultIncluded,
  includedCount,
  includedIndices1Based,
  includedInspectionStructures,
  roofMeasureFingerprint,
  roofRunIsFresh,
  sameRoofPricingAuthority,
  singleQuotableIncluded,
  structureKey,
  type AuState,
  type MultiRoofQuote,
  type MeasureAllRequest,
  type MeasureAllResponse,
  type RoofStructurePrice,
} from './schema';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../ui';
import { fonts, radius, spacing, touch, type as typeScale } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const TIER_LABELS = ['Good', 'Better', 'Best'] as const;
type SuccessfulRoofMeasure = Extract<MeasureAllResponse, { ok: true }>;

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
  const [accepted, setAccepted] = useState<{
    response: MeasureAllResponse;
    request: MeasureAllRequest;
  } | null>(null);
  const mountedRef = useRef(true);
  const activeRunRef = useRef(0);
  const currentFingerprintRef = useRef('');

  const measure = useMeasureRoof();
  const saveRoof = useSaveRoof();
  const saveAsQuote = useSaveRoofAsQuote();

  const currentRequest = (): MeasureAllRequest => ({
    address: { address: address.trim(), postcode: postcode.trim(), state },
    inputs: {
      material,
      pitch,
      intent,
      building_year_built: yearBuilt.trim() ? Number(yearBuilt.trim()) : null,
    },
  });
  currentFingerprintRef.current = roofMeasureFingerprint(currentRequest());
  const acceptedIsCurrent =
    accepted !== null &&
    roofMeasureFingerprint(accepted.request) === currentFingerprintRef.current;
  const measured: SuccessfulRoofMeasure | null =
    acceptedIsCurrent && accepted?.response.ok === true ? accepted.response : null;
  const quote: MultiRoofQuote | null = measured?.quote ?? null;
  const runFresh = measured ? roofRunIsFresh(measured.run_expires_at) : false;

  useEffect(
    () => () => {
      mountedRef.current = false;
      activeRunRef.current += 1;
    },
    [],
  );

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
  const canPromote =
    measured !== null &&
    runFresh &&
    totalIncluded > 0 &&
    inspectionIncluded.length === 0 &&
    saveRoof.data?.ok === true &&
    sameRoofPricingAuthority(saveRoof.data.pricing_authority, measured.pricing_authority);

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
    const parsedYear = yearBuilt.trim() ? Number(yearBuilt.trim()) : null;
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1850 || parsedYear > 2100)) {
      setFormError('Year built must be from 1850 to 2100, or left blank.');
      return;
    }
    const request = currentRequest();
    const fingerprint = roofMeasureFingerprint(request);
    const responseRun = activeRunRef.current + 1;
    activeRunRef.current = responseRun;
    setFormError(null);
    setAccepted(null);
    saveRoof.reset();
    saveAsQuote.reset();
    measure.reset();
    measure.mutate(request, {
      onSuccess: response => {
        if (
          acceptsRoofMeasureRun({
            activeRun: activeRunRef.current,
            responseRun,
            measuredFingerprint: fingerprint,
            currentFingerprint: currentFingerprintRef.current,
            mounted: mountedRef.current,
          })
        ) {
          setAccepted({ response, request });
        }
      },
    });
  }

  function onSave() {
    if (!quote || !measured || !runFresh) return;
    saveRoof.mutate({
      run_token: measured.run_token,
      address: accepted!.request.address,
      provider: measured.provider,
      quote,
      included_indices: includedIndices1Based(quote, included),
    });
  }

  // Promotion sends only the persisted measurement capability plus the pricing
  // revision. The server reconstructs every selected structure and money field.
  function onSaveAsQuote() {
    if (
      !measured ||
      !runFresh ||
      inspectionIncluded.length > 0 ||
      totalIncluded === 0 ||
      saveRoof.data?.ok !== true ||
      !sameRoofPricingAuthority(saveRoof.data.pricing_authority, measured.pricing_authority)
    ) {
      return;
    }
    saveAsQuote.mutate({
      measure_token: saveRoof.data.measure_token,
      expected_pricing_revision: measured.pricing_authority.revision,
    });
  }

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={[typeScale.title, { color: colors.textPri }]}>
          Measure a roof
        </Text>
        <Text style={[styles.structureArea, { color: colors.textSec }]}>
          Enter the property, confirm the roof scope, then review each structure.
        </Text>
      </View>
      <Card style={{ gap: spacing.xl }}>
        <SectionLabel>Property</SectionLabel>
        <Field label="Address" value={address} onChangeText={setAddress} required height={54} />
        <View style={styles.row}>
          <View style={styles.rowField}>
            <Field
              label="Postcode"
              value={postcode}
              onChangeText={v => setPostcode(v.replace(/[^0-9]/g, '').slice(0, 4))}
              required
              height={54}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.rowField}>
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
          <PillGroup
            options={AU_STATES.map(s => [s, s] as const)}
            value={state}
            onChange={v => setState(v as AuState)}
          />
        </View>
      </Card>
      <Card style={{ gap: spacing.xl }}>
        <SectionLabel>Roof scope</SectionLabel>
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
      </Card>
      <PrimaryCta label="Measure all structures" onPress={onMeasure} loading={measure.isPending} />

      {measure.isError ? (
        <Notice
          tone="danger"
          label="Could not measure"
          body={apiErrorMessage(measure.error)}
          onRetry={onMeasure}
        />
      ) : null}

      {accepted && !acceptedIsCurrent ? (
        <Notice
          tone="warn"
          label="Measurement is stale"
          body="The property or roof scope changed. Measure again before saving or creating a quote."
          onRetry={onMeasure}
        />
      ) : null}

      {acceptedIsCurrent && accepted?.response.ok === false ? (
        <Notice
          tone="warn"
          label={
            accepted.response.code === 'tenant_pricing_required'
              ? 'Roofing pricing setup required'
              : 'Measurement could not complete'
          }
          body={accepted.response.detail ?? accepted.response.error ?? 'Unknown error.'}
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
              onToggle={() => {
                saveRoof.reset();
                saveAsQuote.reset();
                setIncluded(prev => {
                  const key = structureKey(s, i);
                  return { ...prev, [key]: prev[key] === false };
                });
              }}
            />
          ))}

          <Card style={{ gap: 14 }}>
            <SectionLabel>
              Combined total · {combined?.count ?? 0} quotable of {totalIncluded} structure
              {totalIncluded === 1 ? '' : 's'} included
            </SectionLabel>
            {/* Area is display-only maths (fine to sum); the tier prices below are never
                summed client-side. Multi-structure promotion is reconstructed from the
                persisted selection by the server. */}
            <Text style={[styles.combinedArea, { color: colors.textPri }]}>
              {Math.round(combined?.areaM2 ?? 0)} m² across the job
            </Text>
            {singleIncluded ? (
              <View style={styles.tierRow}>
                {singleIncluded.price.tiers.map((t, i) => (
                  <View key={t.tier} style={[styles.tierTile, { borderColor: colors.inkLine }]}>
                    <Text style={[styles.tierLabel, { color: colors.textDim }]}>
                      {TIER_LABELS[i]?.toUpperCase()}
                    </Text>
                    <View style={styles.tierAmount}>
                      <Text style={[styles.tierValue, { color: colors.textPri }]}>
                        {formatAud(centsFromApiDollars(t.inc_gst))}
                      </Text>
                      <Text style={[styles.tierSub, { color: colors.textDim }]}>inc GST</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Notice
                tone="accent"
                label="Combined customer total stays server-side"
                body="Save the verified measurement first. The server will reload the selected structures and create the customer quote without accepting a phone-calculated total."
              />
            )}

            {!runFresh ? (
              <Notice
                tone="warn"
                label="Pricing proof expired"
                body="Measure again to confirm the current tenant rate card before saving."
                onRetry={onMeasure}
              />
            ) : null}

            <GhostButton
              label={saveRoof.isPending ? 'Saving…' : 'Save job'}
              onPress={onSave}
              loading={saveRoof.isPending}
              disabled={!runFresh || totalIncluded === 0 || quote.structures.length === 0}
            />
            {saveRoof.data?.ok === true ? (
              <Notice
                tone="accent"
                label="Saved"
                body={`Job ${saveRoof.data.id.slice(0, 8)} saved.`}
              />
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
              <Notice
                tone="danger"
                label="Could not save"
                body={apiErrorMessage(saveRoof.error)}
                onRetry={onSave}
              />
            ) : null}

            {inspectionIncluded.length > 0 ? (
              <Notice
                tone="warn"
                label="Inspection required before customer quote"
                body={`${inspectionIncluded
                  .map(s => s.label)
                  .join(
                    ', ',
                  )} ${inspectionIncluded.length === 1 ? 'needs' : 'need'} an on-site inspection. Remove the structure or complete and reprice the inspection before promotion.`}
              />
            ) : null}

            <PrimaryCta
              label={saveAsQuote.isPending ? 'Creating quote…' : 'Save as quote'}
              onPress={onSaveAsQuote}
              loading={saveAsQuote.isPending}
              disabled={!canPromote}
            />
            {saveAsQuote.data?.ok === true
              ? (() => {
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
              : null}
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
    structure.metrics.sloped_area_m2 != null
      ? `${Math.round(structure.metrics.sloped_area_m2)} m²`
      : '—';

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
          style={[
            styles.checkbox,
            {
              borderColor: included ? colors.accent : colors.inkLine,
              backgroundColor: included ? colors.accent : 'transparent',
            },
          ]}
        >
          {included ? (
            <Text style={{ color: colors.accentInk, fontFamily: fonts.sans.bold, fontSize: 12 }}>
              ✓
            </Text>
          ) : null}
        </View>
      </Pressable>

      <Text style={[styles.structureArea, { color: colors.textSec }]}>
        {areaLabel} sloped area · {structure.metrics.form} ·{' '}
        {structure.inputs.material.replace(/_/g, ' ')}
      </Text>

      {!inspection ? (
        <View style={styles.tierRow}>
          {structure.price.tiers.map((t, i) => (
            <View key={t.tier} style={[styles.tierTile, { borderColor: colors.inkLine }]}>
              <Text style={[styles.tierLabel, { color: colors.textDim }]}>
                {TIER_LABELS[i]?.toUpperCase()}
              </Text>
              <View style={styles.tierAmount}>
                <Text style={[styles.tierValue, { color: colors.textPri }]}>
                  {formatAud(centsFromApiDollars(t.inc_gst))}
                </Text>
                <Text style={[styles.tierSub, { color: colors.textDim }]}>inc GST</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowField: { flexGrow: 1, flexBasis: 120, minWidth: 0 },
  label: {
    marginBottom: 8,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.2,
  },
  combinedArea: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: -0.4,
  },
  tierRow: { gap: 0 },
  tierTile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tierLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  tierAmount: { alignItems: 'flex-end', gap: spacing.xs },
  tierValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  tierSub: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  structureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: touch.minimum,
  },
  structureLabel: { marginTop: 4, fontFamily: fonts.sans.bold, fontSize: 16 },
  structureArea: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutNote: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
});
