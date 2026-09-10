/**
 * Roof measure (spec web-parity F1) — ported from the web tool at
 * quotemate-automation/app/dashboard/roofing/measure/page.tsx, numbers-and-cards only:
 * Native address suggestions and per-building scope precede saved owner review.
 *
 * Flow: type an address → POST /api/roofing/measure-all → each returned structure
 * renders as an include/exclude card with its area + priced tiers → the combined
 * total sums the included, quotable structures → Save persists the job,
 * Save as quote promotes it to a shareable customer quote.
 */
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTenantMe, tenantTrades } from '@/lib/tenant';
import { createRoofInputDraftStore } from './roof-input-draft';
import { RoofAddressField } from './RoofAddressField';
import { RoofGeometry } from './RoofGeometry';
import { useApiQuery } from '@/lib/useApi';
import { OwnedRoofSchema } from './owned-roof';
import { clearRoofAttempt, readRoofAttempt, writeRoofAttempt, type RoofAttempt } from './roof-attempt';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, GhostButton, PrimaryCta } from '@/features/auth/ui';
import { centsFromApiDollars, formatAud } from '@/lib/money';

import { useMeasureRoof, useSaveRoof } from './api';
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
  singleQuotableIncluded,
  structureKey,
  type AuState,
  type MultiRoofQuote,
  type MeasureAllRequest,
  type MeasureAllResponse,
  type RoofStructurePrice,
  type SaveRoofResponse,
} from './schema';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../ui';
import { fonts, radius, spacing, touch, type as typeScale } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

const TIER_LABELS = ['Good', 'Better', 'Best'] as const;
type SuccessfulRoofMeasure = Extract<MeasureAllResponse, { ok: true }>;

export function RoofMeasureScreen() {
  const { userId } = useAuth();
  const tenant = useTenantMe();
  if (tenant.isError && !tenant.data) return <Notice tone="danger" label="Could not load your roofing account" body={apiErrorMessage(tenant.error)} onRetry={() => void tenant.refetch()} />;
  if (!userId || !tenant.data) return <Notice tone="warn" label="Loading your roofing account…" />;
  if (!tenantTrades(tenant.data).includes('roofing')) return <Notice tone="warn" label="Roofing is unavailable for this account" />;
  return <RoofMeasureForm key={`${userId}:${tenant.data.tenant.id}`} scope={{ userId, tenantId: tenant.data.tenant.id }} />;
}

export function RoofMeasureForm({ scope }: { scope: { userId: string; tenantId: string } }) {
  const { userId, tenantId } = scope;
  const { colors } = useTheme();

  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [state, setState] = useState<AuState>('NSW');
  const [material, setMaterial] = useState<string>('colorbond_corrugated');
  const [pitch, setPitch] = useState<string>('standard');
  const [intent, setIntent] = useState<string>('full_reroof');
  const [yearBuilt, setYearBuilt] = useState('');
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [perBuilding, setPerBuilding] = useState<NonNullable<MeasureAllRequest['perBuilding']>>({});
  const store = useMemo(() => createRoofInputDraftStore({ userId, tenantId }), [userId, tenantId]);
  const [saveAttempt, setSaveAttempt] = useState<RoofAttempt | null>(null);
  const [saveAttemptLoaded, setSaveAttemptLoaded] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<SaveRoofResponse | null>(null);
  const [savePreparing, setSavePreparing] = useState(false);
  const saveInFlight = useRef(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRetry, setDraftRetry] = useState(0);
  const [storedDraftKey, setStoredDraftKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [accepted, setAccepted] = useState<{
    response: MeasureAllResponse;
    request: MeasureAllRequest;
  } | null>(null);
  const mountedRef = useRef(true);
  const activeRunRef = useRef(0);
  const currentFingerprintRef = useRef('');
  const draftValue = useMemo(() => ({ address, postcode, state, material, pitch, intent, yearBuilt, customerName, customerPhone, perBuilding, accepted, included }),
    [address, postcode, state, material, pitch, intent, yearBuilt, customerName, customerPhone, perBuilding, accepted, included]);
  const draftKey = JSON.stringify(draftValue);
  const draftUnstored = draftLoaded && storedDraftKey !== draftKey;
  usePreventRemove(draftUnstored || savePreparing, () => {
    Alert.alert('Keep this roof open', 'Your latest input has not finished saving securely. Retry working-copy storage before leaving.');
  });

  const measure = useMeasureRoof();
  const saveRoof = useSaveRoof();
  const savedLookup = useApiQuery(['roofing','run',userId,tenantId,saveAttempt?.runId],
    `/api/roofing/measurement/${saveAttempt?.runId ?? 'pending'}?lookup=run`, OwnedRoofSchema,
    { enabled: saveAttempt?.action === 'save' && !!saveAttempt.runId });
  useEffect(() => {
    let current = true;
    void readRoofAttempt({ userId, tenantId, recordId:'new-roof' }).then(value => {
      if (current && mountedRef.current) { setSaveAttempt(value); setSaveAttemptLoaded(true); setAttemptError(null); }
    }).catch(e => { if (current && mountedRef.current) setAttemptError(apiErrorMessage(e)); });
    return () => { current = false; };
  }, [userId, tenantId, draftRetry]);
  useEffect(() => {
    const saved = savedLookup.data?.measurement;
    if (!saveAttempt?.runId || !saved || saved.tenant_id !== tenantId || saved.quote?.pricing_run_id !== saveAttempt.runId ||
      !saved.pricing_authority || saved.pricing_authority.tenant_id !== tenantId || !saved.public_token) return;
    const recovered: SaveRoofResponse = { ok:true,id:saved.id,measure_token:saved.measure_token,public_token:saved.public_token,pricing_authority:saved.pricing_authority,existing:true };
    void clearRoofAttempt({ userId, tenantId, recordId:'new-roof' }).then(() => {
      if (!mountedRef.current) return;
      setSavedResult(recovered);
      setSaveAttempt(null);
    }).catch(e => { if (mountedRef.current) setAttemptError(apiErrorMessage(e)); });
  }, [savedLookup.data, saveAttempt, userId, tenantId]);

  useEffect(() => {
    if (draftLoaded) return;
    let current = true;
    void store.load().then(saved => {
      if (!current || !mountedRef.current) return;
      if (saved) {
        const d = saved.value; setAddress(d.address); setPostcode(d.postcode); setState(d.state);
        setMaterial(d.material); setPitch(d.pitch); setIntent(d.intent); setYearBuilt(d.yearBuilt);
        setCustomerName(d.customerName); setCustomerPhone(d.customerPhone); setPerBuilding(d.perBuilding);
        if (d.accepted) setAccepted(d.accepted); if (d.included) setIncluded(d.included);
      }
      setDraftLoaded(true);
    }).catch(e => { if (current && mountedRef.current) setDraftError(apiErrorMessage(e)); });
    return () => { current = false; };
  }, [store, draftLoaded, draftRetry]);
  useEffect(() => {
    if (!draftLoaded) return;
    let current = true;
    void store.save(draftValue)
      .then(() => { if (current && mountedRef.current) { setDraftError(null); setStoredDraftKey(draftKey); } })
      .catch(e => { if (current && mountedRef.current) setDraftError(apiErrorMessage(e)); });
    return () => { current = false; };
  }, [store, draftLoaded, draftValue, draftKey, draftRetry]);

  const lockedInput = !draftLoaded || Boolean(saveAttempt) || savePreparing || saveRoof.isPending;
  const refetchSavedRun = savedLookup.refetch;
  useEffect(() => {
    if (savedResult?.ok && saveAttempt?.runId) void refetchSavedRun();
  }, [savedResult, saveAttempt?.runId, refetchSavedRun]);

  const currentRequest = (): MeasureAllRequest => ({
    address: { address: address.trim(), postcode: postcode.trim(), state },
    perBuilding,
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
  const quote: MultiRoofQuote | null = accepted?.response.ok ? accepted.response.quote : null;
  const runFresh = measured ? roofRunIsFresh(measured.run_expires_at) : false;

  useEffect(
    () => { mountedRef.current = true; return () => {
      mountedRef.current = false;
      activeRunRef.current += 1;
    }; },
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
  function onMeasure() {
    if (!draftLoaded || !saveAttemptLoaded || saveAttempt || savePreparing || draftError || measure.isPending || saveRoof.isPending) return;
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
    setSavedResult(null);
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

  async function onSave() {
    if (!quote || !measured || !runFresh || !draftLoaded || draftError || attemptError || saveInFlight.current || saveRoof.isPending || !saveAttemptLoaded) return;
    if (saveAttempt && saveAttempt.runId !== measured.run_id) return;
    saveInFlight.current = true; setSavePreparing(true);
    const receipt: RoofAttempt = { version:1, action:'save', revision:measured.pricing_authority.revision, runId:measured.run_id };
    try {
      // A retry uses the identical retained verified run, so the server's stable
      // measurement-token uniqueness reconciles one job even after a lost reply.
      await store.save({ address, postcode, state, material, pitch, intent, yearBuilt, customerName, customerPhone, perBuilding, accepted, included });
      if (!mountedRef.current) return;
      await writeRoofAttempt({ userId,tenantId,recordId:'new-roof' },receipt);
      if (!mountedRef.current) return;
      setSaveAttempt(receipt);
      const result = await saveRoof.mutateAsync({
        run_token: measured.run_token, address: accepted!.request.address, provider: measured.provider,
        quote, included_indices: includedIndices1Based(quote,included),
        customer_name: customerName.trim() || null, customer_phone: customerPhone.trim() || null,
      });
      if (!mountedRef.current) return;
      setSavedResult(result); void savedLookup.refetch();
    } catch(e) { if (mountedRef.current) setFormError(apiErrorMessage(e)); }
    finally { saveInFlight.current=false; if (mountedRef.current) setSavePreparing(false); }
  }

  // The private editor owns explicit review, durable promotion and reconciliation.
  function onReviewSaved() {
    if (savedResult?.ok && !savePreparing && !draftUnstored) router.push({ pathname: '/roofing/[id]', params: { id: savedResult.id } });
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
        <RoofAddressField value={address} onChange={value => { if (lockedInput) return; setAddress(value); setPerBuilding({}); }}
          onSelect={value => { if (lockedInput) return; setAddress(value.address); if (value.postcode) setPostcode(value.postcode); if (value.state && (AU_STATES as readonly string[]).includes(value.state)) setState(value.state as AuState); setPerBuilding({}); }} />
        <View style={styles.row}>
          <View style={styles.rowField}>
            <Field
              label="Postcode"
              value={postcode}
              onChangeText={v => { if (!lockedInput) setPostcode(v.replace(/[^0-9]/g, '').slice(0, 4)); }}
              required
              height={54}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.rowField}>
            <Field
              label="Year built"
              value={yearBuilt}
              onChangeText={v => { if (!lockedInput) setYearBuilt(v.replace(/[^0-9]/g, '').slice(0, 4)); }}
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
            onChange={v => { if (!lockedInput) setState(v as AuState); }}
          />
        </View>
      </Card>
      <Card style={{ gap: spacing.xl }}>
        <SectionLabel>Roof scope</SectionLabel>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>DEFAULT ROOF MATERIAL</Text>
          <PillGroup options={ROOF_MATERIALS} value={material} onChange={value => { if (!lockedInput) setMaterial(value); }} />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>ROOF PITCH</Text>
          <PillGroup options={ROOF_PITCHES} value={pitch} onChange={value => { if (!lockedInput) setPitch(value); }} />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>JOB INTENT</Text>
          <PillGroup options={ROOF_INTENTS} value={intent} onChange={value => { if (!lockedInput) setIntent(value); }} />
        </View>

        {formError ? <Notice tone="danger" label="Check the form" body={formError} /> : null}
      </Card>
      <Card style={{ gap: spacing.md }}>
        <SectionLabel>Customer details</SectionLabel>
        <Field label="Customer name" value={customerName} onChangeText={value => { if (lockedInput) return; saveRoof.reset(); setSavedResult(null); setCustomerName(value.slice(0,160)); }} hint="Optional" />
        <Field label="Customer phone" value={customerPhone} onChangeText={value => { if (lockedInput) return; saveRoof.reset(); setSavedResult(null); setCustomerPhone(value.slice(0,40)); }} keyboardType="phone-pad" hint="Optional" />
        <Text style={[styles.structureArea, { color: colors.textSec }]}>Details are saved with the measurement. Entering them does not send a quote.</Text>
      </Card>
      {draftError ? <Notice tone="danger" label="Working-copy recovery unavailable" body={draftError} onRetry={() => setDraftRetry(value => value + 1)} /> : null}
      {attemptError ? <Notice tone="danger" label="Previous Save recovery unavailable" body={attemptError} onRetry={() => setDraftRetry(value => value + 1)} /> : null}
      {draftLoaded ? <Notice tone="accent" label={draftUnstored ? 'Saving working copy…' : 'Working copy saved on this device'} body="The encrypted working copy is kept for seven days. Keep this screen open if storage reports an error." /> : null}
      <PrimaryCta label="Measure all structures" onPress={onMeasure} loading={measure.isPending} disabled={!draftLoaded || !saveAttemptLoaded || !!saveAttempt || savePreparing || !!draftError || saveRoof.isPending} />

      {saveAttempt ? <Notice tone="warn" label="Check the previous Save" body="The saved result is being reconciled with this measurement run. Keep this run until the outcome is confirmed; measuring again cannot resolve an earlier Save." onRetry={() => void savedLookup.refetch()} /> : null}
      {saveAttempt && savedLookup.data?.measurement.tenant_id === tenantId && savedLookup.data.measurement.quote?.pricing_run_id === saveAttempt.runId &&
        (!savedLookup.data.measurement.pricing_authority || !savedLookup.data.measurement.public_token) ? <Notice tone="warn" label="Saved job found — review is incomplete" body="The private saved job exists, but current pricing or its public review identity is unavailable. The recovery receipt is retained." /> : null}
      {saveAttempt && savedLookup.data?.measurement.tenant_id === tenantId && savedLookup.data.measurement.quote?.pricing_run_id === saveAttempt.runId ?
        <GhostButton label="Open recovered private roofing job" onPress={() => router.push({ pathname:'/roofing/[id]', params:{id:savedLookup.data!.measurement.id} })} /> : null}
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

          <RoofGeometry roof={{ quote, public_token: null, provider: accepted?.response.ok ? accepted.response.provider : null }}
            selected={includedIndices1Based(quote, included)} onSelect={index => {
              if (savePreparing || saveAttempt || saveRoof.isPending) return;
              const structure = quote.structures[index - 1]; if (!structure) return;
              saveRoof.reset(); setSavedResult(null);
              setIncluded(previous => ({ ...previous, [structureKey(structure, index - 1)]: previous[structureKey(structure, index - 1)] === false }));
            }} />
          {quote.structures.map((s, i) => (
            <StructureCard
              key={structureKey(s, i)}
              structure={s}
              index={i}
              included={included[structureKey(s, i)] !== false}
              overrides={s.buildingId ? perBuilding[s.buildingId] : undefined}
              onScope={s.buildingId ? change => { if (savePreparing || saveAttempt || saveRoof.isPending) return; saveRoof.reset(); setSavedResult(null); setPerBuilding(previous => ({ ...previous, [s.buildingId!]: { ...previous[s.buildingId!], ...change } })); } : undefined}
              onToggle={() => {
                if (savePreparing || saveAttempt || saveRoof.isPending) return;
                saveRoof.reset();
                setSavedResult(null);
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
              label={savePreparing || saveRoof.isPending ? 'Saving…' : saveAttempt ? 'Retry the same verified Save' : 'Save job'}
              onPress={onSave}
              loading={savePreparing || saveRoof.isPending}
              disabled={!runFresh || !!draftError || !!attemptError || !draftLoaded || totalIncluded === 0 || quote.structures.length === 0}
            />
            {savedResult?.ok === true ? (
              <Notice
                tone="accent"
                label="Saved"
                body={`Job ${savedResult.id.slice(0, 8)} saved. Open it to review imagery and correct measurements before promotion.`}
              />
            ) : null}
            {savedResult?.ok === false ? (
              <Notice
                tone="danger"
                label="Could not save"
                body={savedResult.detail ?? savedResult.error}
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
              label="Review saved roof"
              onPress={onReviewSaved}
              disabled={savedResult?.ok !== true || savePreparing || draftUnstored}
            />
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
  overrides,
  onScope,
}: {
  structure: RoofStructurePrice;
  index: number;
  included: boolean;
  onToggle: () => void;
  overrides?: Partial<MeasureAllRequest['inputs']>;
  onScope?: (change: Partial<MeasureAllRequest['inputs']>) => void;
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

      {onScope ? <View style={{ gap: spacing.md }}>
        <Text style={[styles.label, { color: colors.textPri }]}>THIS BUILDING’S ROOF SCOPE</Text>
        <PillGroup options={ROOF_MATERIALS} value={overrides?.material ?? structure.inputs.material} onChange={material => onScope({ material })} />
        <PillGroup options={ROOF_PITCHES} value={overrides?.pitch ?? structure.inputs.pitch} onChange={pitch => onScope({ pitch })} />
        <PillGroup options={ROOF_INTENTS} value={overrides?.intent ?? structure.inputs.intent} onChange={intent => onScope({ intent })} />
      </View> : null}
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
