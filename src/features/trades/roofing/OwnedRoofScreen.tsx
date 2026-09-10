import { useAuth } from '@clerk/expo';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { GhostButton, PrimaryCta } from '@/features/auth/ui';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { tenantTrades, useTenantMe } from '@/lib/tenant';
import { fonts, spacing } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { useSaveRoofAsQuote } from './api';
import { OwnedRoofSchema, ReviseRoofSchema, ROOF_CORRECTIONS, ROOF_FORMS, roofCorrectionBody,
  roofPromotionBody, roofSelection, type OwnedRoof, type RoofEdits } from './owned-roof';
import { clearRoofAttempt, readRoofAttempt, roofRejectedBeforeWrite, runRoofAttempt, writeRoofAttempt, type RoofAttempt, type RoofScope } from './roof-attempt';
import { createRoofWorkingDraftStore } from './roof-working-draft';
import { RoofGeometry } from './RoofGeometry';
import { RoofSolarSummary } from './RoofSolarSummary';
import { ROOFING_SAVED_KEY } from '../tools/tools-api';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../ui';

export function OwnedRoofScreen({ id }: { id: string }) {
  const { userId } = useAuth();
  const tenant = useTenantMe();
  if (tenant.isError && !tenant.data) return <Notice tone="danger" label="Could not load your roofing account" body={apiErrorMessage(tenant.error)} onRetry={() => void tenant.refetch()} />;
  if (!userId || !tenant.data) return <Notice tone="warn" label="Sign in to open your saved roofing job" />;
  if (!tenantTrades(tenant.data).includes('roofing')) return <Notice tone="warn" label="Roofing is unavailable for this account" />;
  if (!z.string().uuid().safeParse(id).success) return <Notice tone="danger" label="This saved-job link is invalid" />;
  return <OwnedRoofEditor key={`${userId}:${tenant.data.tenant.id}:${id}`} scope={{ userId, tenantId: tenant.data.tenant.id, recordId: id }} />;
}

export function OwnedRoofEditor({ scope }: { scope: RoofScope }) {
  const { userId, tenantId, recordId } = scope;
  const { colors } = useTheme(); const insets = useSafeAreaInsets();
  const router = useRouter(); const navigation = useNavigation(); const cache = useQueryClient();
  const active = useRef(true); const busy = useRef(false);
  const [lookup, setLookup] = useState({ value: scope.recordId, byId: true });
  const path = `/api/roofing/measurement/${encodeURIComponent(lookup.value)}${lookup.byId ? '?lookup=id' : ''}`;
  const query = useApiQuery(['roofing', 'owned', scope.userId, scope.tenantId, lookup], path, OwnedRoofSchema);
  const hydrationIdentity = `${path}:${query.data?.measurement.revision ?? ''}`;
  const latestHydration = useRef(hydrationIdentity);
  latestHydration.current = hydrationIdentity;
  const [roof, setRoof] = useState<OwnedRoof | null>(null);
  const [edits, setEdits] = useState<RoofEdits>({}); const [included, setIncluded] = useState<number[]>([]);
  const [attempt, setAttempt] = useState<RoofAttempt | null>(null); const [loaded, setLoaded] = useState(false);
  const [receiptLoaded, setReceiptLoaded] = useState(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null); const [stored, setStored] = useState(true);
  const [conflict, setConflict] = useState(false); const [armed, setArmed] = useState(false);
  const store = useMemo(() => createRoofWorkingDraftStore({ userId, tenantId, recordId }), [userId, tenantId, recordId]);
  const patch = useApiMutation<Record<string, unknown>, z.infer<typeof ReviseRoofSchema>>(
    `/api/roofing/measurement/${encodeURIComponent(roof?.measure_token ?? lookup.value)}`, ReviseRoofSchema, { method: 'PATCH' });
  const promote = useSaveRoofAsQuote();
  const selectionDirty = Boolean(roof && JSON.stringify(included) !== JSON.stringify(roofSelection(roof)));
  const dirty = selectionDirty || Object.keys(edits).length > 0;

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    void readRoofAttempt({ userId, tenantId, recordId }).then(value => { if (!cancelled) {
      setAttempt(value);
      setReceiptLoaded(true);
      if (value?.measureToken) { setLookup({ value: value.measureToken, byId: false }); setRoof(null); }
    } })
      .catch(e => { if (!cancelled) setStorageError(apiErrorMessage(e)); });
    return () => { cancelled = true; };
  }, [userId, tenantId, recordId]);
  useEffect(() => {
    const next = query.data?.measurement;
    if (!next || next.tenant_id !== scope.tenantId || roof) return;
    if (lookup.byId && next.id !== lookup.value) { setError('The server returned another saved job.'); return; }
    if (!lookup.byId && next.measure_token !== lookup.value) { setError('The server returned another measurement.'); return; }
    setRoof(next); setIncluded(roofSelection(next));
    void store.load().then(saved => {
      if (!active.current || latestHydration.current !== hydrationIdentity) return;
      if (saved) { setEdits(saved.value.edits); setIncluded(saved.value.included); setConflict(saved.value.revision !== next.revision); }
      setLoaded(true);
    }).catch(e => { if (active.current && latestHydration.current === hydrationIdentity) setStorageError(apiErrorMessage(e)); });
  }, [query.data, roof, scope.tenantId, lookup, store, hydrationIdentity]);
  useEffect(() => {
    if (!loaded || !roof || !dirty || conflict) return;
    let current = true; setStored(false);
    void store.save({ revision: roof.revision, included, edits }).then(() => {
      if (current && active.current) { setStored(true); setStorageError(null); }
    }).catch(e => { if (current && active.current) setStorageError(apiErrorMessage(e)); });
    return () => { current = false; };
  }, [loaded, roof, dirty, conflict, included, edits, store]);
  useEffect(() => { setArmed(false); }, [edits, included, roof?.revision]);
  usePreventRemove(pending || (dirty && !stored), () => {
    Alert.alert('Keep this saved job open', pending ? 'Wait for the current action to finish.' : 'The working copy has not finished saving securely. Retry recovery storage before leaving.');
  });

  const acceptRead = async (next: OwnedRoof) => {
    if (!receiptLoaded || !loaded) throw new Error('Wait for working-copy and previous-action recovery before accepting a saved-job refresh.');
    if (next.tenant_id !== scope.tenantId || (lookup.byId ? next.id !== lookup.value : next.measure_token !== lookup.value)) {
      throw new Error('The response does not match this saved job.');
    }
    await store.remove(); await clearRoofAttempt(scope);
    if (!active.current) return;
    setRoof(next); setIncluded(roofSelection(next)); setEdits({}); setConflict(false); setAttempt(null); setError(null); setStorageError(null); setStored(true);
    void cache.invalidateQueries({ queryKey: ROOFING_SAVED_KEY });
  };
  async function refresh() {
    if (busy.current || !receiptLoaded || !loaded) return;
    try {
    setError(null);
    const result = await query.refetch();
    if (!active.current) return;
    const next = result.data?.measurement;
    if (result.error || !next || next.tenant_id !== scope.tenantId || (lookup.byId ? next.id !== lookup.value : next.measure_token !== lookup.value)) { setError('Could not verify this saved job. Your working copy is retained.'); return; }
    if (attempt) {
      if (attempt.action === 'promotion' && next.promoted_quote_id) await acceptRead(next);
      else if (attempt.measureToken && next.measure_token === attempt.measureToken) await acceptRead(next);
      else setError('The previous action is still unconfirmed. Check status again before another mutation. Your working copy is retained.');
    } else if (dirty && next.revision !== roof?.revision) setConflict(true);
    else if (!dirty) await acceptRead(next);
    } catch (e) { if (active.current) setError(apiErrorMessage(e)); }
  }
  async function change(action: 'selection' | 'corrections' | 'promotion') {
    if (!roof || query.isError || !loaded || !receiptLoaded || pending || busy.current || attempt || conflict || storageError || roof.paid_at) return;
    if (action === 'promotion' && dirty) return;
    let body: Record<string, unknown>;
    try {
      if (action === 'corrections') body = roofCorrectionBody(roof, edits);
      else if (action === 'selection') {
        if (!included.length) throw new Error('Keep at least one building in the job.');
        body = { expected_revision: roof.revision, included_indices: included };
      } else {
        const proof = roofPromotionBody(roof); if (!proof) return;
        if (!armed) { setArmed(true); return; } body = proof;
      }
    } catch (e) { setError(apiErrorMessage(e)); return; }
    busy.current = true; setPending(true); setError(null);
    const receipt: RoofAttempt = { version: 1, action, revision: roof.revision };
    try {
      const token = await runRoofAttempt(scope, receipt, async () => {
        if (action === 'promotion') { await promote.mutateAsync(body as ReturnType<typeof roofPromotionBody> & {}); return roof.measure_token; }
        const result = await patch.mutateAsync(body); return result.measureToken;
      });
      // Persist the successor token before moving, so a kill during readback can
      // find the new held version without writing again or changing the old quote.
      const confirmed = { ...receipt, measureToken: token }; await writeRoofAttempt(scope, confirmed);
      if (!active.current) return;
      setAttempt(confirmed); setLookup({ value: token, byId: false });
      setError('Saved on the server. Check status to load the confirmed version.');
    } catch (e) {
      try {
        if (roofRejectedBeforeWrite(e, action)) await clearRoofAttempt(scope);
        const savedAttempt = await readRoofAttempt(scope);
        if (active.current) { setAttempt(savedAttempt); setError(apiErrorMessage(e)); }
      } catch (storageFailure) {
        if (active.current) { setAttempt(receipt); setStorageError(apiErrorMessage(storageFailure)); }
      }
    }
    finally { busy.current = false; if (active.current) setPending(false); }
  }
  function toggle(index: number) {
    if (!loaded || !receiptLoaded || storageError || pending || attempt || conflict || roof?.paid_at) return;
    setIncluded(values => values.includes(index) ? values.filter(value => value !== index) : [...values, index].sort((a,b) => a-b));
  }
  async function discard() {
    if (!roof || !receiptLoaded || pending || attempt) return;
    try { const result = await query.refetch(); if (!result.data || result.error) throw new Error('Reload the saved job before discarding.'); await acceptRead(result.data.measurement); }
    catch (e) { if (active.current) setError(apiErrorMessage(e)); }
  }
  async function retryRecoveryStorage() {
    if (busy.current) return;
    const target = hydrationIdentity;
    try {
      const retainedAttempt = await readRoofAttempt(scope);
      if (!active.current || latestHydration.current !== target) return;
      setReceiptLoaded(true);
      if (retainedAttempt) {
        setAttempt(retainedAttempt);
        if (retainedAttempt.measureToken && retainedAttempt.measureToken !== roof?.measure_token) {
          setLookup({ value:retainedAttempt.measureToken,byId:false }); setRoof(null); setLoaded(false); setStorageError(null); return;
        }
      }
      if (loaded && roof && dirty) await store.save({ revision:roof.revision,included,edits });
      else {
        const saved = await store.load();
        if (!active.current || latestHydration.current !== target) return;
        if (!loaded && roof) {
          if (saved) { setEdits(saved.value.edits); setIncluded(saved.value.included); setConflict(saved.value.revision !== roof.revision); }
          setLoaded(true);
        }
      }
      if (active.current && latestHydration.current === target) { setStorageError(null); setStored(true); }
    } catch (e) { if (active.current && latestHydration.current === target) setStorageError(apiErrorMessage(e)); }
  }
  const disabled = query.isError || pending || Boolean(attempt) || conflict || Boolean(storageError) || !loaded || !receiptLoaded || Boolean(roof?.paid_at);
  const text = { color: colors.textSec, fontFamily: fonts.sans.regular };
  return <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }} style={{ backgroundColor: colors.inkDeep }} keyboardShouldPersistTaps="handled">
    <GhostButton label="Back to roofing" onPress={() => navigation.goBack()} disabled={pending || (dirty && !stored)} />
    <Text accessibilityRole="header" style={{ color: colors.textPri, fontFamily: fonts.sans.bold, fontSize: 24 }}>Saved roofing job</Text>
    {query.isError && !roof ? <Notice tone="danger" label="Could not open this saved job" body={apiErrorMessage(query.error)} onRetry={() => void query.refetch()} /> : null}
    {query.isError && roof ? <Notice tone="warn" label="Showing the last verified saved job" body="The current server version could not be checked. Your local corrections are retained; refresh successfully before saving or promoting." onRetry={() => void refresh()} /> : null}
    {!roof && !query.isError ? <Notice tone="accent" label="Loading owned measurement…" /> : null}
    {error ? <Notice tone="warn" label="Saved-job status" body={error} /> : null}
    {storageError ? <Notice tone="danger" label="Working-copy storage unavailable" body={storageError} onRetry={() => void retryRecoveryStorage()} /> : null}
    {roof && <>
      <Card><Text style={text}>{roof.address ?? 'Address unavailable'} · {roof.postcode} {roof.state}</Text>
        <Text style={text}>Customer: {roof.customer_name ?? 'Not captured'} · {roof.customer_phone ?? 'No phone'}</Text>
        <Text style={text}>{roof.paid_at ? 'Paid — measurements locked' : roof.released_at ? 'Released — corrections create a new review draft' : 'Private measurement draft'}</Text></Card>
      {dirty ? <Notice tone="accent" label={stored ? 'Working copy saved on this device' : 'Saving working copy…'} body="Corrections are not server-saved or sent. The encrypted working copy is kept for seven days." /> : null}
      {conflict ? <Notice tone="warn" label="The saved measurement changed" body="Your corrections are retained for review. Discard them to load the current saved version; an old calculation cannot be promoted." /> : null}
      <GhostButton label={attempt ? 'Check previous action status' : 'Refresh saved job'} onPress={() => void refresh()} disabled={pending || !receiptLoaded || !loaded} />
      {dirty && !attempt ? <GhostButton label="Discard local corrections and reload" onPress={() => Alert.alert('Discard your local corrections?', 'The current server version will be reloaded.', [{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>void discard()}])} disabled={pending || !receiptLoaded} /> : null}
      <RoofGeometry roof={roof} selected={included} onSelect={toggle} />
      <RoofSolarSummary value={roof.quote?.solar} />
      {roof.quote?.structures.map((structure, i) => <Card key={`${roof.id}:${i}`} style={{ gap: spacing.md }}>
        <SectionLabel>{`${i + 1}. ${structure.label}`}</SectionLabel>
        <GhostButton label={included.includes(i + 1) ? 'Included — exclude building' : 'Excluded — include building'} onPress={() => toggle(i + 1)} disabled={disabled} />
        <Text style={text}>{structure.inputs.material.replace(/_/g, ' ')} · {structure.inputs.pitch.replace(/_/g, ' ')} pitch · {structure.inputs.intent.replace(/_/g, ' ')}</Text>
        <Text style={text}>Footprint: {structure.metrics.footprint_m2} m² · ridge: {structure.metrics.ridge_lm ?? 'unavailable'} m · source date: {structure.metrics.capture_date ?? 'unavailable'}</Text>
        {structure.price.tiers.map(tier => <Text key={tier.tier} style={text}>{tier.label}: {formatAud(centsFromApiDollars(tier.inc_gst))} · {tier.scope}</Text>)}
        <Notice tone={structure.price.routing.decision === 'inspection_required' ? 'warn' : 'accent'} label={structure.price.routing.decision.replace(/_/g, ' ')} body={structure.price.routing.reason} />
        <SectionLabel>Confirmed measurement corrections</SectionLabel>
        {ROOF_CORRECTIONS.map(field => <View key={field.key}><Text style={text}>{field.label}</Text><TextInput accessibilityLabel={`${structure.label}: ${field.label}`} style={{ color: colors.textPri, borderWidth: 1, borderColor: colors.ctlLine, padding: spacing.md, minHeight: 54 }}
          value={edits[String(i + 1)]?.[field.key] ?? (typeof structure.metrics[field.key] === 'number' ? String(structure.metrics[field.key]) : '')}
          onChangeText={value => { if (!disabled) setEdits(previous => ({ ...previous, [String(i + 1)]: { ...previous[String(i + 1)], [field.key]: value.slice(0,32) } })); }}
          editable={!disabled} keyboardType="decimal-pad" /></View>)}
        <PillGroup options={ROOF_FORMS.map(form => [form, form.replace(/_/g,' ')] as const)} value={edits[String(i + 1)]?.form ?? structure.metrics.form}
          onChange={form => { if (!disabled) setEdits(previous => ({ ...previous, [String(i + 1)]: { ...previous[String(i + 1)], form } })); }} />
      </Card>)}
      <PrimaryCta label="Save building selection" onPress={() => void change('selection')} disabled={disabled || !selectionDirty || !included.length || Object.keys(edits).length > 0} loading={pending} />
      <PrimaryCta label="Save corrections and recalculate" onPress={() => void change('corrections')} disabled={disabled || !Object.keys(edits).length || selectionDirty} loading={pending} />
      {selectionDirty && Object.keys(edits).length > 0 ? <Notice tone="warn" label="Save one change at a time" body="Keep the original building selection while saving measurement corrections, then change the selection. The server handles these as separate versioned operations." /> : null}
      <PrimaryCta label={armed ? 'Confirm create customer quote' : 'Review and create customer quote'} onPress={() => void change('promotion')} disabled={disabled || dirty || !roofPromotionBody(roof)} loading={pending} />
      {roof.promoted_quote_id ? <GhostButton label="Open owned quote preview and delivery" onPress={() => router.push({ pathname: '/(tabs)/quotes', params: { quoteId: roof.promoted_quote_id! } })} /> : null}
    </>}
  </ScrollView>;
}
